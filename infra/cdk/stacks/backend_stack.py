from typing import Optional

from aws_cdk import (
    aws_dynamodb as dynamodb,
    aws_lambda as lambda_,
    aws_apigatewayv2 as apigwv2,
    aws_apigatewayv2_integrations as integrations,
    CfnOutput,
    Stack,
    RemovalPolicy,
    Duration,
)
from constructs import Construct


class BackendStack(Stack):
    """
    Backend stack: API Gateway HTTP API + Lambda + DynamoDB.

    Provides lightweight serverless endpoints for lead capture, contact forms,
    admin/backoffice CRUD, and health checks. Enabled via the `enable_backend` parameter.
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
        **kwargs,
    ) -> None:
        super().__init__(scope, id, **kwargs)
        self._api_endpoint = None

        if not enable_backend:
            CfnOutput(self, "BackendEnabled", value="false")
            return

        # ------------------------------------------------------------------
        # 1. DynamoDB tables
        # ------------------------------------------------------------------
        # Leads table (existing)
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
        )

        # Products table (new — for backoffice CRUD)
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
            point_in_time_recovery=True,
            encryption=dynamodb.TableEncryption.AWS_MANAGED,
        )

        # Quotes table (new — for backoffice quotes management)
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
            point_in_time_recovery=True,
            encryption=dynamodb.TableEncryption.AWS_MANAGED,
        )

        # ------------------------------------------------------------------
        # 2. Lambda function – API handler (leads + admin CRUD)
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
            ),
            timeout=Duration.seconds(30),
            memory_size=256,
            environment={
                "LEADS_TABLE": leads_table.table_name,
                "PRODUCTS_TABLE": products_table.table_name,
                "QUOTES_TABLE": quotes_table.table_name,
                "ENVIRONMENT": environment,
                "ADMIN_SESSION_SECRET": "cdk-managed-secret-placeholder",  # ⚠️ CRÍTICO: Sobreescribir via Parameter Store en prod
            },
        )

        # Grant Lambda access to all DynamoDB tables
        leads_table.grant_read_write_data(api_lambda)
        products_table.grant_read_write_data(api_lambda)
        quotes_table.grant_read_write_data(api_lambda)

        # ------------------------------------------------------------------
        # 3. HTTP API (API Gateway v2)
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
                allow_headers=["Content-Type", "Authorization"],
                max_age=Duration.days(1),
            ),
        )

        # Integration: Lambda proxy
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

        # Store for cross-stack reference
        self._api_endpoint = http_api.api_endpoint

        # ------------------------------------------------------------------
        # Outputs
        # ------------------------------------------------------------------
        CfnOutput(self, "ApiEndpoint", value=http_api.api_endpoint)
        CfnOutput(self, "LeadsTableName", value=leads_table.table_name)
        CfnOutput(self, "ProductsTableName", value=products_table.table_name)
        CfnOutput(self, "QuotesTableName", value=quotes_table.table_name)
        CfnOutput(self, "LambdaFunctionName", value=api_lambda.function_name)
        CfnOutput(self, "BackendEnabled", value="true")

    @staticmethod
    def _lambda_code(
        leads_table_name: str,
        products_table_name: str,
        quotes_table_name: str,
    ) -> lambda_.InlineCode:
        """
        Returns the inline Lambda handler code with full admin CRUD support.
        """
        return lambda_.InlineCode(
            f"""
import json
import os
import uuid
import hashlib
import hmac
import base64
from datetime import datetime, timezone

import boto3

dynamodb = boto3.resource("dynamodb")
leads_table = dynamodb.Table("{leads_table_name}")
products_table = dynamodb.Table("{products_table_name}")
quotes_table = dynamodb.Table("{quotes_table_name}")

ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS_HASH = hashlib.sha256((os.environ.get("ADMIN_PASS", "admin123")).encode()).hexdigest()

# Session secret: siempre generar en cold start para consistencia
# entre generate_token y verify_token en la misma instancia Lambda.
# En producción, usar ADMIN_SESSION_SECRET de Parameter Store.
SESSION_SECRET = os.environ.get("ADMIN_SESSION_SECRET")
if not SESSION_SECRET:
    SESSION_SECRET = hashlib.sha256(
        (str(uuid.uuid4()) + datetime.now(timezone.utc).isoformat()).encode()
    ).hexdigest()
# Forzar generación de nuevo secret en cada cold start para evitar
# discrepancias entre el valor hardcodeado y el desplegado
if SESSION_SECRET == "cdk-managed-secret-placeholder":
    SESSION_SECRET = hashlib.sha256(
        (str(uuid.uuid4()) + datetime.now(timezone.utc).isoformat()).encode()
    ).hexdigest()


def response(status_code, body, extra_headers=None):
    headers = {{"Content-Type": "application/json"}}
    if extra_headers:
        headers.update(extra_headers)
    return {{
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body)
    }}


def generate_token(username):
    payload = base64.b64encode(json.dumps({{
        "user": username,
        "iat": datetime.now(timezone.utc).isoformat()
    }}).encode()).decode()
    sig = hmac.new(
        SESSION_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return f"{{payload}}.{{sig}}"


def verify_token(token):
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload, sig = parts
        expected = hmac.new(
            SESSION_SECRET.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        decoded = json.loads(base64.b64decode(payload).decode())
        return decoded.get("user")
    except Exception:
        return None


# ─── HELPERS ────────────────────────────────────────────

def get_json_body(event):
    try:
        return json.loads(event.get("body") or "{{}}")
    except json.JSONDecodeError:
        return None


# ─── AUTH ───────────────────────────────────────────────

def handle_login(event):
    body = get_json_body(event)
    if not body:
        return response(400, {{"error": "invalid_json"}})
    user = (body.get("username") or "").strip()
    pwd = (body.get("password") or "").strip()
    if user == ADMIN_USER and hashlib.sha256(pwd.encode()).hexdigest() == ADMIN_PASS_HASH:
        token = generate_token(user)
        return response(200, {{"ok": True, "token": token}})
    return response(401, {{"error": "invalid_credentials"}})


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
        updates["notes"] = body["notes"]
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
        updates["status"] = body["status"]
    if "notes" in body:
        updates["notes"] = body["notes"]
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


# ─── MAIN HANDLER ───────────────────────────────────────

# ── Admin: Dashboard ──

def handle_dashboard():
    # Returns aggregated stats for the backoffice dashboard.
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


def admin_auth_required(event):
    auth = event.get("headers", {{}}).get("authorization", "") or \\
           event.get("headers", {{}}).get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        return verify_token(token)
    return None


def handler(event, context):
    method = event.get("requestContext", {{}}).get("http", {{}}).get("method", "")
    path = event.get("rawPath", "").rstrip("/")
    body = event.get("body")

    # ── Public endpoints ──
    if method == "GET" and path == "/api/health":
        return response(200, {{"ok": True, "service": "sales-api"}})

    if method == "POST" and path == "/api/leads":
        try:
            data = json.loads(body or "{{}}")
        except json.JSONDecodeError:
            return response(400, {{"error": "invalid_json"}})
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        message = (data.get("message") or "").strip()
        if not name or not email:
            return response(400, {{"error": "name_and_email_required"}})
        item = {{
            "id": str(uuid.uuid4()),
            "name": name,
            "email": email,
            "message": message,
            "contacted": False,
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
"""
        )
