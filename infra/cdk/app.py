#!/usr/bin/env python3
"""
CDK application for the sales website on AWS.

Stacks:
  - FrontendStack  : S3 + CloudFront + WAF
  - BackendStack   : API Gateway + Lambda + DynamoDB (optional)

Deployment instructions:
  cd infra/cdk
  python -m pip install -r requirements.txt
  cdk bootstrap                        # one-time account setup
  cdk deploy --all                     # deploy both stacks

Or deploy individually:
  cdk deploy SalesWebsiteBackend       # backend first
  cdk deploy SalesWebsiteFrontend      # then frontend

Custom domain + ACM certificate? See docs/cdk-architecture.md.
"""

import os
import aws_cdk as cdk
from stacks.frontend_stack import FrontendStack
from stacks.backend_stack import BackendStack

app = cdk.App()

# ------------------------------------------------------------------
# Config (from cdk context or defaults)
# ------------------------------------------------------------------
project_name = app.node.try_get_context("project_name") or "sales-website"
environment = app.node.try_get_context("environment") or "dev"
enable_backend = app.node.try_get_context("enable_backend") or "true"
price_class = app.node.try_get_context("price_class") or "PriceClass_100"
certificate_arn = app.node.try_get_context("certificate_arn") or None
raw_domains = app.node.try_get_context("domain_names") or None
domain_names = raw_domains.split(",") if raw_domains else None
raw_origins = app.node.try_get_context("allowed_origins") or None
allowed_origins = raw_origins.split(",") if raw_origins else None
ses_domain = app.node.try_get_context("ses_domain") or None
backend_region = app.node.try_get_context("backend_region") or os.environ.get("CDK_DEFAULT_REGION", "us-east-1")
manage_ses_identity_raw = app.node.try_get_context("manage_ses_identity") or "false"
order_notifications_from_email = app.node.try_get_context("order_notifications_from_email") or (
    f"soporte@{ses_domain}" if ses_domain else None
)
order_alerts_to_email = app.node.try_get_context("order_alerts_to_email") or order_notifications_from_email

enable_backend_bool = enable_backend.lower() in ("true", "1", "yes")
manage_ses_identity = str(manage_ses_identity_raw).lower() in ("true", "1", "yes")

# ------------------------------------------------------------------
# Backend stack (optional – only if backend is enabled)
# ------------------------------------------------------------------
backend = BackendStack(
    app,
    f"{project_name}-{environment}-backend",
    project_name=project_name,
    environment=environment,
    enable_backend=enable_backend_bool,
    allowed_origins=allowed_origins,
    ses_domain=ses_domain,
    manage_ses_identity=manage_ses_identity,
    order_notifications_from_email=order_notifications_from_email,
    order_alerts_to_email=order_alerts_to_email,
    cross_region_references=True,
    description=f"Sales website backend – {project_name} {environment}",
    env=cdk.Environment(
        account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
        region=backend_region,
    ),
)

# ------------------------------------------------------------------
# Frontend stack (always deployed)
# CloudFront + WAF need to be in us-east-1.
# ------------------------------------------------------------------
api_endpoint = backend.api_endpoint if enable_backend_bool else None
images_bucket_domain = backend.images_bucket_domain if enable_backend_bool else None
images_bucket_name = backend.images_bucket_name if enable_backend_bool else None

frontend = FrontendStack(
    app,
    f"{project_name}-{environment}-frontend",
    project_name=project_name,
    environment=environment,
    price_class=price_class,
    api_endpoint=api_endpoint,
    images_bucket_domain=images_bucket_domain,
    images_bucket_name=images_bucket_name,
    certificate_arn=certificate_arn,
    domain_names=domain_names,
    cross_region_references=True,
    description=f"Sales website frontend – {project_name} {environment}",
    env=cdk.Environment(
        account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
        region="us-east-1",
    ),
)

# Cross-stack dependency: frontend waits for backend outputs
if enable_backend_bool:
    frontend.add_dependency(backend)

app.synth()
