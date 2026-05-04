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
    and health checks. Enabled via the `enable_backend` parameter.
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
        # 1. DynamoDB table – leads / contact submissions
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
        )

        # ------------------------------------------------------------------
        # 2. Lambda function – API handler
        # ------------------------------------------------------------------
        api_lambda = lambda_.Function(
            self,
            "ApiLambda",
            function_name=f"{project_name}-{environment}-api",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="index.handler",
            code=self._lambda_code(leads_table.table_name),
            timeout=Duration.seconds(10),
            memory_size=256,
            environment={
                "LEADS_TABLE": leads_table.table_name,
                "ENVIRONMENT": environment,
            },
        )

        # Grant Lambda write access to DynamoDB
        leads_table.grant_write_data(api_lambda)

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

        # Routes
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

        # Store for cross-stack reference
        self._api_endpoint = http_api.api_endpoint

        # ------------------------------------------------------------------
        # Outputs
        # ------------------------------------------------------------------
        CfnOutput(self, "ApiEndpoint", value=http_api.api_endpoint)
        CfnOutput(self, "LeadsTableName", value=leads_table.table_name)
        CfnOutput(self, "LambdaFunctionName", value=api_lambda.function_name)
        CfnOutput(self, "BackendEnabled", value="true")

    @staticmethod
    def _lambda_code(table_name: str) -> lambda_.InlineCode:
        """
        Returns the inline Lambda handler code.
        """
        return lambda_.InlineCode(
            f"""
import json
import os
import uuid
from datetime import datetime, timezone

import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("{table_name}")


def response(status_code, body):
    return {{
        "statusCode": status_code,
        "headers": {{"Content-Type": "application/json"}},
        "body": json.dumps(body)
    }}


def handler(event, context):
    method = event.get("requestContext", {{}}).get("http", {{}}).get("method", "")
    path = event.get("rawPath", "")

    # Health check
    if method == "GET" and path == "/api/health":
        return response(200, {{"ok": True, "service": "sales-api"}})

    # Lead capture
    if method == "POST" and path == "/api/leads":
        try:
            body = json.loads(event.get("body") or "{{}}")
        except json.JSONDecodeError:
            return response(400, {{"error": "invalid_json"}})

        name = (body.get("name") or "").strip()
        email = (body.get("email") or "").strip().lower()
        message = (body.get("message") or "").strip()

        if not name or not email:
            return response(400, {{"error": "name_and_email_required"}})

        item = {{
            "id": str(uuid.uuid4()),
            "name": name,
            "email": email,
            "message": message,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }}

        table.put_item(Item=item)
        return response(201, {{"ok": True, "leadId": item["id"]}})

    return response(404, {{"error": "not_found"}})
"""
        )
