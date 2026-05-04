from typing import Optional
from pathlib import Path

from aws_cdk import (
    aws_dynamodb as dynamodb,
    aws_lambda as lambda_,
    aws_apigatewayv2 as apigwv2,
    aws_apigatewayv2_integrations as integrations,
    aws_ssm as ssm,
    aws_cloudwatch as cloudwatch,
    aws_cloudwatch_actions as cw_actions,
    aws_sns as sns,
    aws_sns_subscriptions as subscriptions,
    aws_kms as kms,
    CfnOutput,
    Stack,
    RemovalPolicy,
    Duration,
)
from constructs import Construct


class BackendStack(Stack):
    """
    Backend stack: API Gateway HTTP API + Lambda + DynamoDB + Monitoring.

    Provides serverless endpoints for lead capture, admin CRUD, health checks, and quotes.
    Secrets are stored in AWS Systems Manager Parameter Store (SecureString).
    CloudWatch dashboards and alarms provide observability.
    """

    @property
    def api_endpoint(self) -> Optional[str]:
        """The HTTP API endpoint URL (used by FrontendStack for cross-stack ref)."""
        return self._api_endpoint

    def __init__(
        self,
        scope: Construct,
        id: str,
        *,
        project_name: str = "sales-website",
        environment: str = "dev",
        enable_backend: bool = True,
        alarm_email: Optional[str] = None,
        **kwargs,
    ) -> None:
        super().__init__(scope, id, **kwargs)
        self._api_endpoint = None

        if not enable_backend:
            CfnOutput(self, "BackendEnabled", value="false")
            return

        # ------------------------------------------------------------------
        # 0. SSM Parameter Store paths for secrets
        #    Parameters must exist before deploy. The deploy script
        #    / CI/CD pipeline creates them if missing.
        # ------------------------------------------------------------------
        ssm_secret_path = f"/{project_name}/{environment}/"

        admin_session_secret_param = ssm.StringParameter.from_secure_string_parameter_attributes(
            self,
            "AdminSessionSecretParam",
            parameter_name=f"{ssm_secret_path}admin-session-secret",
            version=1,
        )

        admin_password_param = ssm.StringParameter.from_secure_string_parameter_attributes(
            self,
            "AdminPasswordParam",
            parameter_name=f"{ssm_secret_path}admin-password",
            version=1,
        )

        # ------------------------------------------------------------------
        # 1. DynamoDB tables
        # ------------------------------------------------------------------
        leads_table = dynamodb.Table(
            self,
            "LeadsTable",
            table_name=f"{project_name}-{environment}-leads",
            partition_key=dynamodb.Attribute(
                name="id",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True,
            ),
            encryption=dynamodb.TableEncryption.AWS_MANAGED,
        )

        products_table = dynamodb.Table(
            self,
            "ProductsTable",
            table_name=f"{project_name}-{environment}-products",
            partition_key=dynamodb.Attribute(
                name="productId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True,
            ),
            encryption=dynamodb.TableEncryption.AWS_MANAGED,
        )

        quotes_table = dynamodb.Table(
            self,
            "QuotesTable",
            table_name=f"{project_name}-{environment}-quotes",
            partition_key=dynamodb.Attribute(
                name="quoteId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True,
            ),
            encryption=dynamodb.TableEncryption.AWS_MANAGED,
        )

        # ------------------------------------------------------------------
        # 2. KMS key for Lambda environment variables encryption (optional)
        # ------------------------------------------------------------------
        # Using AWS managed keys by default; a CMK can be added for prod.

        # ------------------------------------------------------------------
        # 3. Lambda function – API handler
        #    Secrets are referenced dynamically at runtime via SSM Parameter Store.
        #    The Lambda has IAM permissions to read the parameters.
        # ------------------------------------------------------------------
        api_lambda = lambda_.Function(
            self,
            "ApiLambda",
            function_name=f"{project_name}-{environment}-api",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="index.handler",
            code=self._lambda_code(
                leads_table.table_name,
                products_table.table_name,
                quotes_table.table_name,
                ssm_secret_path=ssm_secret_path,
            ),
            timeout=Duration.seconds(30),
            memory_size=256,
            environment={
                "LEADS_TABLE": leads_table.table_name,
                "PRODUCTS_TABLE": products_table.table_name,
                "QUOTES_TABLE": quotes_table.table_name,
                "ENVIRONMENT": environment,
                "SSM_SECRET_PATH": ssm_secret_path,
            },
        )

        # Grant Lambda read access to SSM parameters (secrets)
        admin_session_secret_param.grant_read(api_lambda)
        admin_password_param.grant_read(api_lambda)

        # Grant Lambda access to DynamoDB tables
        leads_table.grant_read_write_data(api_lambda)
        products_table.grant_read_write_data(api_lambda)
        quotes_table.grant_read_write_data(api_lambda)

        # ------------------------------------------------------------------
        # 4. HTTP API (API Gateway v2)
        # ------------------------------------------------------------------
        http_api = apigwv2.HttpApi(
            self,
            "HttpApi",
            api_name=f"{project_name}-{environment}-http-api",
            cors_preflight=apigwv2.CorsPreflightOptions(
                allow_origins=["*"],
                allow_methods=[
                    apigwv2.CorsHttpMethod.GET,
                    apigwv2.CorsHttpMethod.POST,
                    apigwv2.CorsHttpMethod.PUT,
                    apigwv2.CorsHttpMethod.DELETE,
                    apigwv2.CorsHttpMethod.OPTIONS,
                ],
                allow_headers=["Content-Type", "Authorization", "X-Api-Key"],
                max_age=Duration.days(1),
            ),
        )

        lambda_integration = integrations.HttpLambdaIntegration(
            "ApiLambdaIntegration",
            handler=api_lambda,
        )

        # ── Public routes ──
        http_api.add_routes(
            path="/api/health",
            methods=[apigwv2.HttpMethod.GET],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/leads",
            methods=[apigwv2.HttpMethod.POST],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/quotes",
            methods=[apigwv2.HttpMethod.POST],
            integration=lambda_integration,
        )

        # ── Admin/Backoffice routes ──
        http_api.add_routes(
            path="/api/admin/login",
            methods=[apigwv2.HttpMethod.POST],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/admin/products",
            methods=[apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/admin/products/{productId}",
            methods=[apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/admin/dashboard",
            methods=[apigwv2.HttpMethod.GET],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/admin/leads",
            methods=[apigwv2.HttpMethod.GET],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/admin/leads/{leadId}",
            methods=[apigwv2.HttpMethod.PUT],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/admin/quotes",
            methods=[apigwv2.HttpMethod.GET],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/admin/quotes/{quoteId}",
            methods=[apigwv2.HttpMethod.PUT],
            integration=lambda_integration,
        )

        self._api_endpoint = http_api.api_endpoint

        # ------------------------------------------------------------------
        # 5. CloudWatch monitoring
        # ------------------------------------------------------------------
        # --- Lambda metrics ---
        lambda_errors = api_lambda.metric_errors(
            statistic="Sum",
            period=Duration.minutes(5),
            label="Lambda Errors",
        )
        lambda_duration = api_lambda.metric_duration(
            statistic="p95",
            period=Duration.minutes(5),
            label="Lambda Duration P95",
        )
        lambda_invocations = api_lambda.metric_invocations(
            statistic="Sum",
            period=Duration.minutes(5),
            label="Lambda Invocations",
        )
        lambda_throttles = api_lambda.metric_throttles(
            statistic="Sum",
            period=Duration.minutes(5),
            label="Lambda Throttles",
        )

        # --- DynamoDB metrics ---
        leads_consumed_read = leads_table.metric_consumed_read_capacity_units(
            statistic="Sum",
            period=Duration.minutes(5),
            label="Leads Table Read Capacity",
        )
        leads_consumed_write = leads_table.metric_consumed_write_capacity_units(
            statistic="Sum",
            period=Duration.minutes(5),
            label="Leads Table Write Capacity",
        )
        # Products table throttled - using system errors metric instead
        products_errors = products_table.metric(
            "SystemErrors",
            statistic="Sum",
            period=Duration.minutes(5),
            label="Products Table Errors",
        )

        # --- API Gateway metrics ---
        api_4xx = http_api.metric(
            "4xx",
            statistic="Sum",
            period=Duration.minutes(5),
            label="API 4xx Errors",
        )
        api_5xx = http_api.metric(
            "5xx",
            statistic="Sum",
            period=Duration.minutes(5),
            label="API 5xx Errors",
        )

        # --- Dashboard ---
        dashboard = cloudwatch.Dashboard(
            self,
            "ApiDashboard",
            dashboard_name=f"{project_name}-{environment}-api-dashboard",
        )

        dashboard.add_widgets(
            cloudwatch.Row(
                cloudwatch.GraphWidget(
                    title="Lambda – Errors & Invocations",
                    left=[lambda_errors, lambda_invocations],
                    right=[lambda_throttles],
                    view=cloudwatch.GraphWidgetView.TIME_SERIES,
                ),
                cloudwatch.GraphWidget(
                    title="Lambda – Duration",
                    left=[lambda_duration],
                    view=cloudwatch.GraphWidgetView.TIME_SERIES,
                ),
            ),
            cloudwatch.Row(
                cloudwatch.GraphWidget(
                    title="DynamoDB – Leads Table",
                    left=[leads_consumed_read, leads_consumed_write],
                    view=cloudwatch.GraphWidgetView.TIME_SERIES,
                ),
                cloudwatch.GraphWidget(
                    title="DynamoDB – Products Throttled",
                    left=[products_errors],
                    view=cloudwatch.GraphWidgetView.TIME_SERIES,
                ),
            ),
            cloudwatch.Row(
                cloudwatch.GraphWidget(
                    title="API Gateway – Errors",
                    left=[api_4xx, api_5xx],
                    view=cloudwatch.GraphWidgetView.TIME_SERIES,
                ),
                cloudwatch.AlarmWidget(
                    title="Lambda Error Alarm",
                    alarm=self._create_lambda_error_alarm(
                        api_lambda, project_name, environment, alarm_email
                    ),
                ),
            ),
        )

        # ------------------------------------------------------------------
        # Outputs
        # ------------------------------------------------------------------
        CfnOutput(self, "ApiEndpoint", value=http_api.api_endpoint)
        CfnOutput(self, "LeadsTableName", value=leads_table.table_name)
        CfnOutput(self, "ProductsTableName", value=products_table.table_name)
        CfnOutput(self, "QuotesTableName", value=quotes_table.table_name)
        CfnOutput(self, "LambdaFunctionName", value=api_lambda.function_name)
        CfnOutput(self, "DashboardName", value=dashboard.dashboard_name)
        CfnOutput(self, "BackendEnabled", value="true")

    def _create_lambda_error_alarm(
        self,
        api_lambda: lambda_.Function,
        project_name: str,
        environment: str,
        alarm_email: Optional[str] = None,
    ) -> cloudwatch.Alarm:
        """Create CloudWatch alarm for Lambda errors with optional SNS notification."""
        alarm = cloudwatch.Alarm(
            self,
            "LambdaErrorAlarm",
            alarm_name=f"{project_name}-{environment}-lambda-errors",
            alarm_description=f"Lambda errors in {project_name} {environment} backend",
            metric=api_lambda.metric_errors(statistic="Sum", period=Duration.minutes(5)),
            threshold=5,
            evaluation_periods=2,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
        )

        if alarm_email:
            topic = sns.Topic(
                self,
                "AlarmTopic",
                topic_name=f"{project_name}-{environment}-alarms",
                display_name=f"{project_name} {environment} Alarms",
            )
            topic.add_subscription(subscriptions.EmailSubscription(alarm_email))
            alarm.add_alarm_action(cw_actions.SnsAction(topic))

        return alarm

    @staticmethod
    def _lambda_code(
        leads_table_name: str,
        products_table_name: str,
        quotes_table_name: str,
        ssm_secret_path: str = "/sales-website/dev/",
    ) -> lambda_.InlineCode:
        """
        Returns the inline Lambda handler code with full admin CRUD support.
        Secrets are read from SSM Parameter Store at cold start and cached.
        """
        return lambda_.InlineCode(
            f"""
import json
import os
import uuid
import hashlib
import hmac
import base64
import time
from datetime import datetime, timezone

import boto3

dynamodb = boto3.resource("dynamodb")
ssm = boto3.client("ssm")

leads_table = dynamodb.Table("{leads_table_name}")
products_table = dynamodb.Table("{products_table_name}")
quotes_table = dynamodb.Table("{quotes_table_name}")

SSM_SECRET_PATH = os.environ.get("SSM_SECRET_PATH", "{ssm_secret_path}")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "dev")

# Cache for secrets (refreshed every 15 minutes)
_secret_cache = {{}}
_secret_cache_ts = 0
_SECRET_CACHE_TTL = 900  # 15 seconds → 15 * 60 = 900


def _get_secret(param_name):
    \"\"\"Get a secret from SSM Parameter Store with caching.\"\"\"
    global _secret_cache, _secret_cache_ts
    now = time.time()
    if now - _secret_cache_ts > _SECRET_CACHE_TTL:
        _secret_cache = {{}}
        _secret_cache_ts = now
    if param_name not in _secret_cache:
        try:
            response = ssm.get_parameter(
                Name=param_name,
                WithDecryption=True
            )
            _secret_cache[param_name] = response["Parameter"]["Value"]
        except Exception as e:
            print(f"ERROR: Failed to get secret {{param_name}}: {{e}}")
            # Fallback for dev/testing only — never in production
            if ENVIRONMENT in ("dev",):
                _secret_cache[param_name] = f"dev-fallback-{{param_name}}"
            else:
                raise
    return _secret_cache[param_name]


def _get_admin_credentials():
    \"\"\"Load admin credentials from SSM Parameter Store.\"\"\"
    admin_user = _get_secret(f"{{SSM_SECRET_PATH}}admin-user")
    admin_pass = _get_secret(f"{{SSM_SECRET_PATH}}admin-password")
    return admin_user, admin_pass


def _get_session_secret():
    \"\"\"Load session signing secret from SSM Parameter Store.\"\"\"
    return _get_secret(f"{{SSM_SECRET_PATH}}admin-session-secret")


# ─── RESPONSE HELPERS ───────────────────────────────────

def response(status_code, body, extra_headers=None):
    headers = {{"Content-Type": "application/json"}}
    if extra_headers:
        headers.update(extra_headers)
    return {{
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body)
    }}


def get_json_body(event):
    try:
        return json.loads(event.get("body") or "{{}}")
    except json.JSONDecodeError:
        return None


# ─── AUTH ───────────────────────────────────────────────

def generate_token(username, session_secret):
    payload = base64.b64encode(json.dumps({{
        "user": username,
        "iat": datetime.now(timezone.utc).isoformat()
    }}).encode()).decode()
    sig = hmac.new(
        session_secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return f"{{payload}}.{{sig}}"


def verify_token(token, session_secret):
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload, sig = parts
        expected = hmac.new(
            session_secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        decoded = json.loads(base64.b64decode(payload).decode())
        return decoded.get("user")
    except Exception as e:
        print(f"Token verification error: {{e}}")
        return None


def handle_login(event):
    body = get_json_body(event)
    if not body:
        return response(400, {{"error": "invalid_json"}})
    user = (body.get("username") or "").strip()
    pwd = (body.get("password") or "").strip()
    admin_user, admin_pass = _get_admin_credentials()
    admin_pass_hash = hashlib.sha256(pwd.encode()).hexdigest()
    if user == admin_user and admin_pass_hash == hashlib.sha256(admin_pass.encode()).hexdigest():
        session_secret = _get_session_secret()
        token = generate_token(user, session_secret)
        return response(200, {{"ok": True, "token": token}})
    return response(401, {{"error": "invalid_credentials"}})


def admin_auth_required(event):
    auth = event.get("headers", {{}}).get("authorization", "") or \\
           event.get("headers", {{}}).get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        session_secret = _get_session_secret()
        return verify_token(token, session_secret)
    return None


# ─── PRODUCTS ───────────────────────────────────────────

def list_products():
    items = products_table.scan().get("Items", [])
    items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return response(200, {{"ok": True, "products": items}})


def create_product(body):
    if not body:
        return response(400, {{"error": "invalid_json"}})
    required = ["name", "price"]
    for field in required:
        if not body.get(field):
            return response(400, {{"error": f"missing_field: {{field}}"}})
    item = {{
        "productId": str(uuid.uuid4()),
        "name": body["name"].strip(),
        "description": (body.get("description") or "").strip(),
        "price": float(body["price"]),
        "category": (body.get("category") or "general").strip(),
        "imageUrl": (body.get("imageUrl") or "").strip(),
        "stock": int(body.get("stock", 0)),
        "status": body.get("status", "active").strip(),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }}
    products_table.put_item(Item=item)
    return response(201, {{"ok": True, "product": item}})


def update_product(product_id, body):
    if not body:
        return response(400, {{"error": "invalid_json"}})
    existing = products_table.get_item(Key={{"productId": product_id}}).get("Item")
    if not existing:
        return response(404, {{"error": "not_found"}})
    updates = {{}}
    for field in ["name", "description", "category", "imageUrl", "status"]:
        if field in body:
            updates[field] = body[field]
    if "price" in body:
        updates["price"] = float(body["price"])
    if "stock" in body:
        updates["stock"] = int(body["stock"])
    updates["updatedAt"] = datetime.now(timezone.utc).isoformat()
    update_expr = "SET " + ", ".join(f"#{{k}}=:v{{k}}" for k in updates)
    attr_names = {{f"#{{k}}": k for k in updates}}
    attr_vals = {{f":v{{k}}": v for k, v in updates.items()}}
    products_table.update_item(
        Key={{"productId": product_id}},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_vals,
        ReturnValues="ALL_NEW"
    )
    updated = products_table.get_item(Key={{"productId": product_id}}).get("Item")
    return response(200, {{"ok": True, "product": updated}})


def delete_product(product_id):
    existing = products_table.get_item(Key={{"productId": product_id}}).get("Item")
    if not existing:
        return response(404, {{"error": "not_found"}})
    products_table.update_item(
        Key={{"productId": product_id}},
        UpdateExpression="SET #st=:st, #ut=:ut",
        ExpressionAttributeNames={{"#st": "status", "#ut": "updatedAt"}},
        ExpressionAttributeValues={{
            ":st": "deleted",
            ":ut": datetime.now(timezone.utc).isoformat()
        }}
    )
    return response(200, {{"ok": True, "deleted": product_id}})


# ─── LEADS ──────────────────────────────────────────────

def list_leads():
    items = leads_table.scan().get("Items", [])
    items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return response(200, {{"ok": True, "leads": items}})


def update_lead(lead_id, body):
    if not body:
        return response(400, {{"error": "invalid_json"}})
    existing = leads_table.get_item(Key={{"id": lead_id}}).get("Item")
    if not existing:
        return response(404, {{"error": "not_found"}})
    updates = {{}}
    if "contacted" in body:
        updates["contacted"] = body["contacted"]
    if "notes" in body:
        updates["notes"] = str(body["notes"])
    if not updates:
        return response(400, {{"error": "no_fields_to_update"}})
    update_expr = "SET " + ", ".join(f"#{{k}}=:v{{k}}" for k in updates)
    attr_names = {{f"#{{k}}": k for k in updates}}
    attr_vals = {{f":v{{k}}": v for k, v in updates.items()}}
    leads_table.update_item(
        Key={{"id": lead_id}},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_vals,
        ReturnValues="ALL_NEW"
    )
    updated = leads_table.get_item(Key={{"id": lead_id}}).get("Item")
    return response(200, {{"ok": True, "lead": updated}})


# ─── QUOTES ─────────────────────────────────────────────

def list_quotes():
    items = quotes_table.scan().get("Items", [])
    items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return response(200, {{"ok": True, "quotes": items}})


def update_quote(quote_id, body):
    if not body:
        return response(400, {{"error": "invalid_json"}})
    existing = quotes_table.get_item(Key={{"quoteId": quote_id}}).get("Item")
    if not existing:
        return response(404, {{"error": "not_found"}})
    updates = {{}}
    if "status" in body:
        valid_statuses = ["pending", "contacted", "closed", "approved"]
        if body["status"] not in valid_statuses:
            return response(400, {{"error": f"invalid_status. Must be one of: {{valid_statuses}}"}})
        updates["status"] = body["status"]
    if "notes" in body:
        updates["notes"] = str(body["notes"])
    if not updates:
        return response(400, {{"error": "no_fields_to_update"}})
    update_expr = "SET " + ", ".join(f"#{{k}}=:v{{k}}" for k in updates)
    attr_names = {{f"#{{k}}": k for k in updates}}
    attr_vals = {{f":v{{k}}": v for k, v in updates.items()}}
    quotes_table.update_item(
        Key={{"quoteId": quote_id}},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_vals,
        ReturnValues="ALL_NEW"
    )
    updated = quotes_table.get_item(Key={{"quoteId": quote_id}}).get("Item")
    return response(200, {{"ok": True, "quote": updated}})


# ─── DASHBOARD ──────────────────────────────────────────

def handle_dashboard():
    products = products_table.scan().get("Items", [])
    leads = leads_table.scan().get("Items", [])
    quotes = quotes_table.scan().get("Items", [])

    active_products = [p for p in products if p.get("status", "active") != "deleted"]
    quotes_sorted = sorted(quotes, key=lambda x: x.get("createdAt", ""), reverse=True)

    return response(200, {{
        "ok": True,
        "totalProducts": len(active_products),
        "totalLeads": len(leads),
        "totalQuotes": len(quotes),
        "recentQuotes": [{{
            "name": q.get("name", ""),
            "email": q.get("email", ""),
            "plan": q.get("plan", ""),
            "status": q.get("status", "pending"),
            "createdAt": q.get("createdAt", "")
        }} for q in quotes_sorted[:5]],
    }})


# ─── MAIN HANDLER ───────────────────────────────────────

def handler(event, context):
    method = event.get("requestContext", {{}}).get("http", {{}}).get("method", "")
    path = event.get("rawPath", "").rstrip("/")
    body = event.get("body")

    try:
        # ── Public endpoints ──
        if method == "GET" and path == "/api/health":
            return response(200, {{"ok": True, "service": "sales-api", "env": ENVIRONMENT}})

        if method == "POST" and path == "/api/leads":
            try:
                data = json.loads(body or "{{}}")
            except json.JSONDecodeError:
                return response(400, {{"error": "invalid_json"}})
            name = (data.get("name") or "").strip()
            email = (data.get("email") or "").strip().lower()
            phone = (data.get("phone") or "").strip()
            message = (data.get("message") or "").strip()
            if not name or not email:
                return response(400, {{"error": "name_and_email_required"}})
            item = {{
                "id": str(uuid.uuid4()),
                "name": name,
                "email": email,
                "phone": phone,
                "message": message,
                "contacted": False,
                "notes": "",
                "source": data.get("source", "website"),
                "createdAt": datetime.now(timezone.utc).isoformat()
            }}
            leads_table.put_item(Item=item)
            return response(201, {{"ok": True, "leadId": item["id"]}})

        # ── Admin auth ──
        if path.startswith("/api/admin"):
            if method == "POST" and path == "/api/admin/login":
                return handle_login(event)
            user = admin_auth_required(event)
            if not user:
                return response(401, {{"error": "unauthorized"}})

        # ── Admin: Products ──
        if path == "/api/admin/products":
            if method == "GET":
                return list_products()
            if method == "POST":
                try:
                    data = json.loads(body or "{{}}")
                except json.JSONDecodeError:
                    return response(400, {{"error": "invalid_json"}})
                return create_product(data)

        if path.startswith("/api/admin/products/"):
            product_id = path.replace("/api/admin/products/", "").split("/")[0]
            if not product_id:
                return response(400, {{"error": "missing_product_id"}})
            if method == "PUT":
                try:
                    data = json.loads(body or "{{}}")
                except json.JSONDecodeError:
                    return response(400, {{"error": "invalid_json"}})
                return update_product(product_id, data)
            if method == "DELETE":
                return delete_product(product_id)

        # ── Admin: Dashboard ──
        if path == "/api/admin/dashboard":
            if method == "GET":
                return handle_dashboard()

        # ── Admin: Leads ──
        if path == "/api/admin/leads":
            if method == "GET":
                return list_leads()

        if path.startswith("/api/admin/leads/"):
            lead_id = path.replace("/api/admin/leads/", "").split("/")[0]
            if not lead_id:
                return response(400, {{"error": "missing_lead_id"}})
            if method == "PUT":
                try:
                    data = json.loads(body or "{{}}")
                except json.JSONDecodeError:
                    return response(400, {{"error": "invalid_json"}})
                return update_lead(lead_id, data)

        # ── Admin: Quotes ──
        if path == "/api/admin/quotes":
            if method == "GET":
                return list_quotes()

        if path.startswith("/api/admin/quotes/"):
            quote_id = path.replace("/api/admin/quotes/", "").split("/")[0]
            if not quote_id:
                return response(400, {{"error": "missing_quote_id"}})
            if method == "PUT":
                try:
                    data = json.loads(body or "{{}}")
                except json.JSONDecodeError:
                    return response(400, {{"error": "invalid_json"}})
                return update_quote(quote_id, data)

        return response(404, {{"error": "not_found"}})

    except Exception as e:
        print(f"ERROR: {{type(e).__name__}}: {{e}}")
        return response(500, {{"error": "internal_error"}})
"""
        )
