from typing import Optional

from aws_cdk import (
    aws_dynamodb as dynamodb,
    aws_lambda as lambda_,
    aws_apigatewayv2 as apigwv2,
    aws_apigatewayv2_integrations as integrations,
    aws_iam as iam,
    aws_s3 as s3,
    aws_ses as ses,
    CfnOutput,
    Stack,
    RemovalPolicy,
    Duration,
)
from constructs import Construct
import pathlib


class BackendStack(Stack):
    """
    Backend stack: API Gateway HTTP API + Lambda + DynamoDB.

    Provides lightweight serverless endpoints for lead capture, checkout,
    admin/backoffice CRUD, and health checks. Enabled via the `enable_backend` parameter.
    """

    @property
    def api_endpoint(self) -> Optional[str]:
        """The HTTP API endpoint URL (used by FrontendStack for cross-stack ref)."""
        return self._api_endpoint

    @property
    def images_bucket_domain(self) -> Optional[str]:
        """The S3 bucket regional domain name for product images."""
        return getattr(self, '_images_bucket_domain', None)

    @property
    def images_bucket_name(self) -> Optional[str]:
        """The S3 bucket name for product images."""
        return getattr(self, '_images_bucket_name', None)

    def __init__(
        self,
        scope: Construct,
        id: str,
        *,
        project_name: str = "sales-website",
        environment: str = "dev",
        enable_backend: bool = True,
        allowed_origins: Optional[list] = None,
        ses_domain: Optional[str] = None,
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
            removal_policy=RemovalPolicy.RETAIN,
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
            removal_policy=RemovalPolicy.RETAIN,
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
            removal_policy=RemovalPolicy.RETAIN,
            point_in_time_recovery=True,
            encryption=dynamodb.TableEncryption.AWS_MANAGED,
        )

        # Orders table (checkout + payment state)
        orders_table = dynamodb.Table(
            self,
            "OrdersTable",
            table_name=f"{project_name}-{environment}-orders",
            partition_key=dynamodb.Attribute(
                name="reference",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN,
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
                orders_table.table_name,
            ),
            timeout=Duration.seconds(30),
            memory_size=256,
            environment={
                "LEADS_TABLE": leads_table.table_name,
                "PRODUCTS_TABLE": products_table.table_name,
                "QUOTES_TABLE": quotes_table.table_name,
                "ORDERS_TABLE": orders_table.table_name,
                "ENVIRONMENT": environment,
                "ADMIN_USER_PARAM": f"/{project_name}/{environment}/admin-user",
                "ADMIN_PASSWORD_PARAM": f"/{project_name}/{environment}/admin-password",
                "ADMIN_SESSION_SECRET_PARAM": f"/{project_name}/{environment}/admin-session-secret",
                "WOMPI_PUBLIC_KEY_PARAM": f"/{project_name}/{environment}/wompi-public-key",
                "WOMPI_INTEGRITY_SECRET_PARAM": f"/{project_name}/{environment}/wompi-integrity-secret",
                "WOMPI_EVENTS_SECRET_PARAM": f"/{project_name}/{environment}/wompi-events-secret",
                "MERCADOPAGO_PUBLIC_KEY_PARAM": f"/{project_name}/{environment}/mercadopago-public-key",
                "MERCADOPAGO_ACCESS_TOKEN_PARAM": f"/{project_name}/{environment}/mercadopago-access-token",
                "MERCADOPAGO_WEBHOOK_SECRET_PARAM": f"/{project_name}/{environment}/mercadopago-webhook-secret",
                "NEQUI_API_KEY_PARAM": f"/{project_name}/{environment}/nequi-api-key",
                "NEQUI_CLIENT_ID_PARAM": f"/{project_name}/{environment}/nequi-client-id",
                "NEQUI_CLIENT_SECRET_PARAM": f"/{project_name}/{environment}/nequi-client-secret",
                "NEQUI_WEBHOOK_SECRET_PARAM": f"/{project_name}/{environment}/nequi-webhook-secret",
                "ORDER_NOTIFICATIONS_FROM_EMAIL_PARAM": f"/{project_name}/{environment}/order-notifications-from-email",
                "ORDER_ALERTS_TO_EMAIL_PARAM": f"/{project_name}/{environment}/order-alerts-to-email",
                "API_KEY_PARAM": f"/{project_name}/{environment}/api-key",
            },
        )

        # Grant Lambda access to all DynamoDB tables
        leads_table.grant_read_write_data(api_lambda)
        products_table.grant_read_write_data(api_lambda)
        quotes_table.grant_read_write_data(api_lambda)
        orders_table.grant_read_write_data(api_lambda)
        api_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=["ssm:GetParameter"],
                resources=[
                    f"arn:aws:ssm:{self.region}:{self.account}:parameter/{project_name}/{environment}/*"
                ],
            )
        )
        api_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=["ses:SendEmail", "ses:SendRawEmail"],
                resources=["*"],
            )
        )

        # ------------------------------------------------------------------
        # 2a. SES domain identity for order notification emails (Easy DKIM)
        # Created in pending state; verification completes once the DKIM
        # CNAME records are added to the domain's DNS (Hostinger).
        # ------------------------------------------------------------------
        if ses_domain:
            email_identity = ses.EmailIdentity(
                self,
                "OrderEmailIdentity",
                identity=ses.Identity.domain(ses_domain),
            )
            CfnOutput(self, "SesDomain", value=ses_domain)
            CfnOutput(self, "SesDkimName1", value=email_identity.dkim_dns_token_name1)
            CfnOutput(self, "SesDkimValue1", value=email_identity.dkim_dns_token_value1)
            CfnOutput(self, "SesDkimName2", value=email_identity.dkim_dns_token_name2)
            CfnOutput(self, "SesDkimValue2", value=email_identity.dkim_dns_token_value2)
            CfnOutput(self, "SesDkimName3", value=email_identity.dkim_dns_token_name3)
            CfnOutput(self, "SesDkimValue3", value=email_identity.dkim_dns_token_value3)

        # ------------------------------------------------------------------
        # 2b. S3 bucket for product images + image processing Lambda
        # ------------------------------------------------------------------
        images_bucket = s3.Bucket(
            self,
            "ImagesBucket",
            bucket_name=f"{project_name}-{environment}-{self.account}-{self.region}-images",
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            versioned=True,
            removal_policy=RemovalPolicy.RETAIN,
        )

        # Pillow Lambda Layer
        pillow_layer_dir = pathlib.Path(__file__).parent.parent / "lambda_src" / "layers" / "pillow"
        pillow_layer = lambda_.LayerVersion(
            self,
            "PillowLayer",
            code=lambda_.Code.from_asset(str(pillow_layer_dir)),
            compatible_runtimes=[lambda_.Runtime.PYTHON_3_12],
            description="Pillow image processing library",
        )

        # Image processing Lambda
        image_handler = lambda_.Function(
            self,
            "ImageHandler",
            function_name=f"{project_name}-{environment}-image-processor",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=lambda_.Code.from_asset(
                str(pathlib.Path(__file__).parent.parent / "lambda_src" / "image_handler")
            ),
            layers=[pillow_layer],
            timeout=Duration.seconds(45),
            memory_size=1024,
            environment={
                "IMAGES_BUCKET": images_bucket.bucket_name,
                "ADMIN_SESSION_SECRET_PARAM": f"/{project_name}/{environment}/admin-session-secret",
                "REMOVEBG_API_KEY_PARAM": f"/{project_name}/{environment}/removebg-api-key",
                "REMOVEBG_API_KEY_REGION": self.region,
            },
        )

        # Grant image handler access to S3 images bucket
        images_bucket.grant_read_write(image_handler)
        image_handler.add_to_role_policy(
            iam.PolicyStatement(
                actions=["ssm:GetParameter"],
                resources=[
                    f"arn:aws:ssm:{self.region}:{self.account}:parameter/{project_name}/{environment}/admin-session-secret",
                    f"arn:aws:ssm:{self.region}:{self.account}:parameter/{project_name}/{environment}/removebg-api-key",
                ],
            )
        )

        # Add bucket policy to allow CloudFront OAC to read images
        images_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                principals=[iam.ServicePrincipal("cloudfront.amazonaws.com")],
                actions=["s3:GetObject"],
                resources=[images_bucket.arn_for_objects("*")],
            )
        )

        # Store for cross-stack reference
        self._images_bucket_domain = images_bucket.bucket_regional_domain_name
        self._images_bucket_name = images_bucket.bucket_name

        # ------------------------------------------------------------------
        # 3. HTTP API (API Gateway v2)
        # ------------------------------------------------------------------
        http_api = apigwv2.HttpApi(
            self,
            "HttpApi",
            api_name=f"{project_name}-{environment}-http-api",
            cors_preflight=apigwv2.CorsPreflightOptions(
                allow_origins=allowed_origins or ["https://repuestoscel.com", "https://www.repuestoscel.com"],
                allow_methods=[
                    apigwv2.CorsHttpMethod.GET,
                    apigwv2.CorsHttpMethod.POST,
                    apigwv2.CorsHttpMethod.PUT,
                    apigwv2.CorsHttpMethod.DELETE,
                    apigwv2.CorsHttpMethod.OPTIONS,
                ],
                allow_headers=["Content-Type", "Authorization", "x-api-key"],
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
        http_api.add_routes(
            path="/api/products",
            methods=[apigwv2.HttpMethod.GET],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/site-settings",
            methods=[apigwv2.HttpMethod.GET],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/checkout/session",
            methods=[apigwv2.HttpMethod.POST],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/checkout/orders/{reference}",
            methods=[apigwv2.HttpMethod.GET],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/webhooks/wompi",
            methods=[apigwv2.HttpMethod.POST],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/webhooks/mercadopago",
            methods=[apigwv2.HttpMethod.POST],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/webhooks/nequi",
            methods=[apigwv2.HttpMethod.POST],
            integration=lambda_integration,
        )

        # ── Auth routes (user registration + login) ──
        http_api.add_routes(
            path="/api/auth/register",
            methods=[apigwv2.HttpMethod.POST],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/auth/login",
            methods=[apigwv2.HttpMethod.POST],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/auth/me",
            methods=[apigwv2.HttpMethod.GET],
            integration=lambda_integration,
        )

        # ── User orders (authenticated) ──
        http_api.add_routes(
            path="/api/orders",
            methods=[apigwv2.HttpMethod.GET],
            integration=lambda_integration,
        )

        # ── Image processing route ──
        http_api.add_routes(
            path="/api/admin/products/image",
            methods=[apigwv2.HttpMethod.POST],
            integration=integrations.HttpLambdaIntegration(
                "ImageHandlerIntegration",
                handler=image_handler,
            ),
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
            path="/api/admin/products/seed",
            methods=[apigwv2.HttpMethod.POST],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/admin/products/{productId}",
            methods=[apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/admin/site-settings",
            methods=[apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT],
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
        http_api.add_routes(
            path="/api/admin/orders",
            methods=[apigwv2.HttpMethod.GET],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/admin/orders/{reference}",
            methods=[apigwv2.HttpMethod.PUT],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/api/admin/users",
            methods=[apigwv2.HttpMethod.GET],
            integration=lambda_integration,
        )

        # Add bucket policy to allow CloudFront OAC to read images
        images_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                principals=[iam.ServicePrincipal("cloudfront.amazonaws.com")],
                actions=["s3:GetObject"],
                resources=[images_bucket.arn_for_objects("*")],
            )
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
        CfnOutput(self, "OrdersTableName", value=orders_table.table_name)
        CfnOutput(self, "ImagesBucketName", value=images_bucket.bucket_name)
        CfnOutput(self, "ImagesBucketDomain", value=images_bucket.bucket_regional_domain_name)
        CfnOutput(self, "ImageHandlerFunctionName", value=image_handler.function_name)
        CfnOutput(self, "LambdaFunctionName", value=api_lambda.function_name)
        CfnOutput(self, "WompiWebhookUrl", value=f"{http_api.api_endpoint}/api/webhooks/wompi")
        CfnOutput(self, "MercadoPagoWebhookUrl", value=f"{http_api.api_endpoint}/api/webhooks/mercadopago")
        CfnOutput(self, "NequiWebhookUrl", value=f"{http_api.api_endpoint}/api/webhooks/nequi")
        CfnOutput(self, "BackendEnabled", value="true")

    @staticmethod
    def _lambda_code(
        leads_table_name: str,
        products_table_name: str,
        quotes_table_name: str,
        orders_table_name: str,
    ) -> lambda_.InlineCode:
        """
        Returns the inline Lambda handler code from the local template.
        """
        template_path = pathlib.Path(__file__).parent.parent / "lambda_src" / "api_handler.py.tmpl"
        template = template_path.read_text()
        code = (
            template
            .replace("__LEADS_TABLE_NAME__", leads_table_name)
            .replace("__PRODUCTS_TABLE_NAME__", products_table_name)
            .replace("__QUOTES_TABLE_NAME__", quotes_table_name)
            .replace("__ORDERS_TABLE_NAME__", orders_table_name)
        )
        return lambda_.InlineCode(code)
