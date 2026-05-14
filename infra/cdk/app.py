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

enable_backend_bool = enable_backend.lower() in ("true", "1", "yes")

# ------------------------------------------------------------------
# Backend stack (optional – only if backend is enabled)
# ------------------------------------------------------------------
backend = BackendStack(
    app,
    f"{project_name}-{environment}-backend",
    project_name=project_name,
    environment=environment,
    enable_backend=enable_backend_bool,
    cross_region_references=True,
    description=f"Sales website backend – {project_name} {environment}",
    env=cdk.Environment(
        account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
        region=os.environ.get("CDK_DEFAULT_REGION", "us-east-2"),
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
