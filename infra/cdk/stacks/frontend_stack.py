from typing import Optional

from aws_cdk import (
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_wafv2 as wafv2,
    aws_iam as iam,
    CfnOutput,
    Fn,
    Stack,
    RemovalPolicy,
)
from constructs import Construct

import pathlib


class FrontendStack(Stack):
    """
    Frontend stack: S3 bucket + CloudFront distribution + WAF.

    Hosts static website assets behind a CDN with security headers,
    Origin Access Control (OAC), and a WAF WebACL (AWS managed rules + rate limit).
    """

    def __init__(
        self,
        scope: Construct,
        id: str,
        *,
        project_name: str = "sales-website",
        environment: str = "dev",
        price_class: str = "PriceClass_100",
        api_endpoint: Optional[str] = None,
        **kwargs,
    ) -> None:
        super().__init__(scope, id, **kwargs)

        # ------------------------------------------------------------------
        # 0. CloudFront function path (relative to this file)
        # ------------------------------------------------------------------
        cf_function_path = (
            pathlib.Path(__file__).parent.parent
            / "cloudfront-functions"
            / "admin-auth.js"
        )

        # ------------------------------------------------------------------
        # 1. S3 bucket – private, encrypted, versioned
        # ------------------------------------------------------------------
        bucket = s3.Bucket(
            self,
            "WebsiteBucket",
            bucket_name=f"{project_name}-{environment}-{self.account}-{self.region}-site",
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            versioned=True,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        # ------------------------------------------------------------------
        # 2. CloudFront Origin Access Control (OAC)
        # ------------------------------------------------------------------
        oac = cloudfront.CfnOriginAccessControl(
            self,
            "CloudFrontOAC",
            origin_access_control_config=cloudfront.CfnOriginAccessControl.OriginAccessControlConfigProperty(
                name=f"{project_name}-{environment}-oac",
                description="Access control for CloudFront to private S3 origin",
                origin_access_control_origin_type="s3",
                signing_behavior="always",
                signing_protocol="sigv4",
            ),
        )

        # ------------------------------------------------------------------
        # 3. Security headers response policy (L1 CfnResponseHeadersPolicy)
        # ------------------------------------------------------------------
        security_headers = cloudfront.CfnResponseHeadersPolicy(
            self,
            "SecurityHeadersPolicy",
            response_headers_policy_config=cloudfront.CfnResponseHeadersPolicy.ResponseHeadersPolicyConfigProperty(
                name=f"{project_name}-{environment}-security-headers",
                security_headers_config=cloudfront.CfnResponseHeadersPolicy.SecurityHeadersConfigProperty(
                    content_security_policy=cloudfront.CfnResponseHeadersPolicy.ContentSecurityPolicyProperty(
                        content_security_policy=(
                            "default-src 'self'; "
                            "img-src 'self' data: https:; "
                            "script-src 'self' 'unsafe-inline' https://checkout.wompi.co; "
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                            "font-src 'self' https://fonts.gstatic.com; "
                            "connect-src 'self' https:; "
                            "frame-src https://checkout.wompi.co;"
                        ),
                        override=True,
                    ),
                    content_type_options=cloudfront.CfnResponseHeadersPolicy.ContentTypeOptionsProperty(
                        override=True,
                    ),
                    frame_options=cloudfront.CfnResponseHeadersPolicy.FrameOptionsProperty(
                        frame_option="DENY",
                        override=True,
                    ),
                    referrer_policy=cloudfront.CfnResponseHeadersPolicy.ReferrerPolicyProperty(
                        referrer_policy="strict-origin-when-cross-origin",
                        override=True,
                    ),
                    strict_transport_security=cloudfront.CfnResponseHeadersPolicy.StrictTransportSecurityProperty(
                        access_control_max_age_sec=31536000,
                        include_subdomains=True,
                        override=True,
                    ),
                    xss_protection=cloudfront.CfnResponseHeadersPolicy.XSSProtectionProperty(
                        mode_block=True,
                        protection=True,
                        override=True,
                    ),
                ),
            ),
        )

        # ------------------------------------------------------------------
        # 4. CloudFront Function — /admin/ routes
        # For MVP: passes all requests through + SPA routing.
        # Real auth is at API level (API Key + JWT Bearer token in Lambda).
        # The backoffice SPA uses localStorage + Bearer token, not cookies.
        # SPA fallback: rewrites /admin/* paths without file extensions to /admin/index.html.
        # ------------------------------------------------------------------
        admin_auth_func = cloudfront.CfnFunction(
            self,
            "AdminAuthFunction",
            name=f"{project_name}-{environment}-admin-auth",
            auto_publish=True,
            function_code=(
                cf_function_path.read_text()
                if cf_function_path.exists()
                else (
                    "// SPA routing for /admin/\n"
                    'var FILE_EXTENSIONS = [".js", ".css", ".png", ".jpg", ".svg", ".ico", ".woff", ".woff2", ".json"];\n'
                    "function handler(event) {\n"
                    "    var request = event.request;\n"
                    "    var uri = request.uri;\n"
                    "    for (var i = 0; i < FILE_EXTENSIONS.length; i++) {\n"
                    "        if (uri.indexOf(FILE_EXTENSIONS[i]) === uri.length - FILE_EXTENSIONS[i].length) {\n"
                    "            return request;\n"
                    "        }\n"
                    "    }\n"
                    "    if (uri !== '/admin/index.html') {\n"
                    "        request.uri = '/admin/index.html';\n"
                    "    }\n"
                    "    return request;\n"
                    "}"
                )
            ),
            function_config=cloudfront.CfnFunction.FunctionConfigProperty(
                comment="Pass-through for /admin/ routes (auth via API)",
                runtime="cloudfront-js-2.0",
            ),
        )

        # ------------------------------------------------------------------
        # 5. WAF WebACL – managed rules + rate limiting
        # ------------------------------------------------------------------
        # waf_acl = wafv2.CfnWebACL(
        #     self,
        #     "WebACL",
        #     default_action=wafv2.CfnWebACL.DefaultActionProperty(allow={}),
        #     scope="CLOUDFRONT",
        #     visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
        #         cloud_watch_metrics_enabled=True,
        #         metric_name=f"{project_name}-{environment}-waf",
        #         sampled_requests_enabled=True,
        #     ),
        #     rules=[
        #         # AWS managed – common threats (SQLi, XSS, LFI, etc.)
        #         wafv2.CfnWebACL.RuleProperty(
        #             name="AWS-AWSManagedRulesCommonRuleSet",
        #             priority=1,
        #             statement=wafv2.CfnWebACL.StatementProperty(
        #                 managed_rule_group_statement=wafv2.CfnWebACL.ManagedRuleGroupStatementProperty(
        #                     vendor_name="AWS",
        #                     name="AWSManagedRulesCommonRuleSet",
        #                 )
        #             ),
        #             override_action=wafv2.CfnWebACL.OverrideActionProperty(none={}),
        #             visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
        #                 cloud_watch_metrics_enabled=True,
        #                 metric_name="AWS-AWSManagedRulesCommonRuleSet",
        #                 sampled_requests_enabled=True,
        #             ),
        #         ),
        #         # AWS managed – SQL injection
        #         wafv2.CfnWebACL.RuleProperty(
        #             name="AWS-AWSManagedRulesSQLiRuleSet",
        #             priority=2,
        #             statement=wafv2.CfnWebACL.StatementProperty(
        #                 managed_rule_group_statement=wafv2.CfnWebACL.ManagedRuleGroupStatementProperty(
        #                     vendor_name="AWS",
        #                     name="AWSManagedRulesSQLiRuleSet",
        #                 )
        #             ),
        #             override_action=wafv2.CfnWebACL.OverrideActionProperty(none={}),
        #             visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
        #                 cloud_watch_metrics_enabled=True,
        #                 metric_name="AWS-AWSManagedRulesSQLiRuleSet",
        #                 sampled_requests_enabled=True,
        #             ),
        #         ),
        #         # AWS managed – known bad inputs
        #         wafv2.CfnWebACL.RuleProperty(
        #             name="AWS-AWSManagedRulesKnownBadInputsRuleSet",
        #             priority=3,
        #             statement=wafv2.CfnWebACL.StatementProperty(
        #                 managed_rule_group_statement=wafv2.CfnWebACL.ManagedRuleGroupStatementProperty(
        #                     vendor_name="AWS",
        #                     name="AWSManagedRulesKnownBadInputsRuleSet",
        #                 )
        #             ),
        #             override_action=wafv2.CfnWebACL.OverrideActionProperty(none={}),
        #             visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
        #                 cloud_watch_metrics_enabled=True,
        #                 metric_name="AWS-AWSManagedRulesKnownBadInputsRuleSet",
        #                 sampled_requests_enabled=True,
        #             ),
        #         ),
        #         # Rate-based rule – 2000 requests per 5 min per IP
        #         wafv2.CfnWebACL.RuleProperty(
        #             name="RateLimit",
        #             priority=4,
        #             statement=wafv2.CfnWebACL.StatementProperty(
        #                 rate_based_statement=wafv2.CfnWebACL.RateBasedStatementProperty(
        #                     limit=2000,
        #                     aggregate_key_type="IP",
        #                 )
        #             ),
        #             action=wafv2.CfnWebACL.RuleActionProperty(block={}),
        #             visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
        #                 cloud_watch_metrics_enabled=True,
        #                 metric_name="RateLimit",
        #                 sampled_requests_enabled=True,
        #             ),
        #         ),
        #     ],
        # )

        # ------------------------------------------------------------------
        # 5. CloudFront distribution
        # ------------------------------------------------------------------
        # Build origins list: always the S3 origin, optionally the API origin
        origins = [
            cloudfront.CfnDistribution.OriginProperty(
                id="S3Origin",
                domain_name=bucket.bucket_regional_domain_name,
                origin_access_control_id=oac.ref,
                s3_origin_config=cloudfront.CfnDistribution.S3OriginConfigProperty(),
            )
        ]

        # Default cache behavior – static assets from S3
        default_cache_behavior = (
            cloudfront.CfnDistribution.DefaultCacheBehaviorProperty(
                target_origin_id="S3Origin",
                viewer_protocol_policy="redirect-to-https",
                compress=True,
                allowed_methods=["GET", "HEAD", "OPTIONS"],
                cached_methods=["GET", "HEAD"],
                response_headers_policy_id=security_headers.ref,
                forwarded_values=cloudfront.CfnDistribution.ForwardedValuesProperty(
                    query_string=False,
                    cookies=cloudfront.CfnDistribution.CookiesProperty(forward="none"),
                ),
            )
        )

        # Additional cache behaviors (for API route if backend enabled)
        cache_behaviors = []
        if api_endpoint:
            # Extract domain from API Gateway endpoint
            # HTTP API (v2) format: https://{api-id}.execute-api.{region}.amazonaws.com
            # No stage path needed — HTTP API v2 routes are at root
            api_domain = Fn.select(2, Fn.split("/", api_endpoint))

            origins.append(
                cloudfront.CfnDistribution.OriginProperty(
                    id="APIOrigin",
                    domain_name=api_domain,
                    # HTTP API (v2) no tiene stage en la URL
                    custom_origin_config=cloudfront.CfnDistribution.CustomOriginConfigProperty(
                        https_port=443,
                        origin_protocol_policy="https-only",
                    ),
                )
            )

            cache_behaviors.append(
                cloudfront.CfnDistribution.CacheBehaviorProperty(
                    path_pattern="api/*",
                    target_origin_id="APIOrigin",
                    viewer_protocol_policy="redirect-to-https",
                    compress=True,
                    default_ttl=0,
                    max_ttl=0,
                    min_ttl=0,
                    allowed_methods=[
                        "GET",
                        "HEAD",
                        "OPTIONS",
                        "PUT",
                        "POST",
                        "PATCH",
                        "DELETE",
                    ],
                    cached_methods=["GET", "HEAD"],
                    response_headers_policy_id=security_headers.ref,
                    forwarded_values=cloudfront.CfnDistribution.ForwardedValuesProperty(
                        query_string=True,
                        headers=[
                            "Authorization",
                            "Content-Type",
                            "Origin",
                            "X-Event-Checksum",
                        ],
                        cookies=cloudfront.CfnDistribution.CookiesProperty(
                            forward="all"
                        ),
                    ),
                )
            )

            # Admin/backoffice route — S3 origin with CloudFront Function auth
            cache_behaviors.append(
                cloudfront.CfnDistribution.CacheBehaviorProperty(
                    path_pattern="admin/*",
                    target_origin_id="S3Origin",
                    viewer_protocol_policy="redirect-to-https",
                    compress=True,
                    allowed_methods=["GET", "HEAD", "OPTIONS"],
                    cached_methods=["GET", "HEAD"],
                    response_headers_policy_id=security_headers.ref,
                    function_associations=[
                        cloudfront.CfnDistribution.FunctionAssociationProperty(
                            event_type="viewer-request",
                            function_arn=admin_auth_func.attr_function_arn,
                        )
                    ],
                    forwarded_values=cloudfront.CfnDistribution.ForwardedValuesProperty(
                        query_string=True,
                        cookies=cloudfront.CfnDistribution.CookiesProperty(
                            forward="all"
                        ),
                    ),
                )
            )

        distribution = cloudfront.CfnDistribution(
            self,
            "WebsiteDistribution",
            distribution_config=cloudfront.CfnDistribution.DistributionConfigProperty(
                enabled=True,
                comment=f"{project_name}-{environment} sales website",
                default_root_object="index.html",
                http_version="http2",
                ipv6_enabled=True,
                price_class=price_class,
                origins=origins,
                default_cache_behavior=default_cache_behavior,
                cache_behaviors=cache_behaviors if cache_behaviors else None,
                custom_error_responses=[
                    cloudfront.CfnDistribution.CustomErrorResponseProperty(
                        error_code=403,
                        response_code=200,
                        response_page_path="/index.html",
                    ),
                    cloudfront.CfnDistribution.CustomErrorResponseProperty(
                        error_code=404,
                        response_code=200,
                        response_page_path="/index.html",
                    ),
                ],
                viewer_certificate=cloudfront.CfnDistribution.ViewerCertificateProperty(
                    cloud_front_default_certificate=True,
                ),
                # web_acl_id=waf_acl.attr_arn,
            ),
        )

        # ------------------------------------------------------------------
        # 6. Bucket policy – only CloudFront can read
        # ------------------------------------------------------------------
        bucket.add_to_resource_policy(
            iam.PolicyStatement(
                sid="AllowCloudFrontRead",
                effect=iam.Effect.ALLOW,
                principals=[iam.ServicePrincipal("cloudfront.amazonaws.com")],
                actions=["s3:GetObject"],
                resources=[bucket.arn_for_objects("*")],
                conditions={
                    "StringEquals": {
                        "AWS:SourceArn": (
                            f"arn:aws:cloudfront::{self.account}"
                            f":distribution/{distribution.ref}"
                        )
                    }
                },
            )
        )

        # ------------------------------------------------------------------
        # Outputs
        # ------------------------------------------------------------------
        CfnOutput(self, "WebsiteBucketName", value=bucket.bucket_name)
        CfnOutput(self, "CloudFrontDistributionId", value=distribution.ref)
        CfnOutput(
            self,
            "CloudFrontDomainName",
            value=distribution.attr_domain_name,
        )
        CfnOutput(
            self,
            "WebsiteUrl",
            value=f"https://{distribution.attr_domain_name}",
        )
        CfnOutput(
            self,
            "AdminAuthFunctionArn",
            value=admin_auth_func.attr_function_arn,
        )
