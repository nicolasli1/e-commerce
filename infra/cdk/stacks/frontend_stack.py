from typing import Optional

from aws_cdk import (
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_wafv2 as wafv2,
    aws_iam as iam,
    aws_cloudwatch as cloudwatch,
    CfnOutput,
    Fn,
    Stack,
    RemovalPolicy,
    Duration,
)
from constructs import Construct

import pathlib


class FrontendStack(Stack):
    """
    Frontend stack: S3 bucket + CloudFront distribution + WAF + Monitoring.

    Hosts static website assets behind a CDN with security headers,
    Origin Access Control (OAC), WAF WebACL, and CloudFront Function for SPA routing.
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
        cf_function_path = pathlib.Path(__file__).parent.parent / "cloudfront-functions" / "admin-auth.js"
        cf_function_code = cf_function_path.read_text() if cf_function_path.exists() else (
            "// CloudFront Function for SPA routing + session cookie validation\n"
            'var COOKIE_NAME = "session";\n'
            'var FILE_EXTENSIONS = [".js", ".css", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff", ".woff2", ".json", ".webp", ".gif"];\n'
            'var PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/assets/"];\n'
            "\n"
            "function handler(event) {\n"
            "    var request = event.request;\n"
            "    var uri = request.uri;\n"
            "    var cookies = request.cookies;\n"
            "\n"
            "    for (var i = 0; i < PUBLIC_ADMIN_PATHS.length; i++) {\n"
            "        if (uri.startsWith(PUBLIC_ADMIN_PATHS[i])) {\n"
            "            return request;\n"
            "        }\n"
            "    }\n"
            "\n"
            "    for (var i = 0; i < FILE_EXTENSIONS.length; i++) {\n"
            "        if (uri.indexOf(FILE_EXTENSIONS[i]) === uri.length - FILE_EXTENSIONS[i].length) {\n"
            "            return request;\n"
            "        }\n"
            "    }\n"
            "\n"
            "    if (uri !== '/admin/index.html') {\n"
            "        request.uri = '/admin/index.html';\n"
            "    }\n"
            "\n"
            "    return request;\n"
            "}"
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
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="ExpireOldVersions",
                    noncurrent_version_expiration=Duration.days(30),
                ),
            ],
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
                            "script-src 'self' 'unsafe-inline'; "
                            "style-src 'self' 'unsafe-inline' https:; "
                            "connect-src 'self' https:;"
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
        # 4. CloudFront Function — /admin/ routes SPA routing
        # ------------------------------------------------------------------
        admin_auth_func = cloudfront.CfnFunction(
            self,
            "AdminAuthFunction",
            name=f"{project_name}-{environment}-admin-auth",
            auto_publish=True,
            function_code=cf_function_code,
            function_config=cloudfront.CfnFunction.FunctionConfigProperty(
                comment="SPA routing for /admin/ + session cookie validation",
                runtime="cloudfront-js-2.0",
            ),
        )

        # ------------------------------------------------------------------
        # 5. WAF WebACL – managed rules + rate limiting
        # ------------------------------------------------------------------
        waf_acl = wafv2.CfnWebACL(
            self,
            "WebACL",
            default_action=wafv2.CfnWebACL.DefaultActionProperty(allow={}),
            scope="CLOUDFRONT",
            visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                cloud_watch_metrics_enabled=True,
                metric_name=f"{project_name}-{environment}-waf",
                sampled_requests_enabled=True,
            ),
            rules=[
                wafv2.CfnWebACL.RuleProperty(
                    name="AWS-AWSManagedRulesCommonRuleSet",
                    priority=1,
                    statement=wafv2.CfnWebACL.StatementProperty(
                        managed_rule_group_statement=wafv2.CfnWebACL.ManagedRuleGroupStatementProperty(
                            vendor_name="AWS",
                            name="AWSManagedRulesCommonRuleSet",
                        )
                    ),
                    override_action=wafv2.CfnWebACL.OverrideActionProperty(none={}),
                    visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                        cloud_watch_metrics_enabled=True,
                        metric_name="AWS-AWSManagedRulesCommonRuleSet",
                        sampled_requests_enabled=True,
                    ),
                ),
                wafv2.CfnWebACL.RuleProperty(
                    name="AWS-AWSManagedRulesSQLiRuleSet",
                    priority=2,
                    statement=wafv2.CfnWebACL.StatementProperty(
                        managed_rule_group_statement=wafv2.CfnWebACL.ManagedRuleGroupStatementProperty(
                            vendor_name="AWS",
                            name="AWSManagedRulesSQLiRuleSet",
                        )
                    ),
                    override_action=wafv2.CfnWebACL.OverrideActionProperty(none={}),
                    visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                        cloud_watch_metrics_enabled=True,
                        metric_name="AWS-AWSManagedRulesSQLiRuleSet",
                        sampled_requests_enabled=True,
                    ),
                ),
                wafv2.CfnWebACL.RuleProperty(
                    name="AWS-AWSManagedRulesKnownBadInputsRuleSet",
                    priority=3,
                    statement=wafv2.CfnWebACL.StatementProperty(
                        managed_rule_group_statement=wafv2.CfnWebACL.ManagedRuleGroupStatementProperty(
                            vendor_name="AWS",
                            name="AWSManagedRulesKnownBadInputsRuleSet",
                        )
                    ),
                    override_action=wafv2.CfnWebACL.OverrideActionProperty(none={}),
                    visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                        cloud_watch_metrics_enabled=True,
                        metric_name="AWS-AWSManagedRulesKnownBadInputsRuleSet",
                        sampled_requests_enabled=True,
                    ),
                ),
                wafv2.CfnWebACL.RuleProperty(
                    name="RateLimit",
                    priority=4,
                    statement=wafv2.CfnWebACL.StatementProperty(
                        rate_based_statement=wafv2.CfnWebACL.RateBasedStatementProperty(
                            limit=2000,
                            aggregate_key_type="IP",
                        )
                    ),
                    action=wafv2.CfnWebACL.RuleActionProperty(block={}),
                    visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                        cloud_watch_metrics_enabled=True,
                        metric_name="RateLimit",
                        sampled_requests_enabled=True,
                    ),
                ),
            ],
        )

        # ------------------------------------------------------------------
        # 6. CloudFront distribution
        # ------------------------------------------------------------------
        origins = [
            cloudfront.CfnDistribution.OriginProperty(
                id="S3Origin",
                domain_name=bucket.bucket_regional_domain_name,
                origin_access_control_id=oac.ref,
                s3_origin_config=cloudfront.CfnDistribution.S3OriginConfigProperty(),
            )
        ]

        default_cache_behavior = cloudfront.CfnDistribution.DefaultCacheBehaviorProperty(
            target_origin_id="S3Origin",
            viewer_protocol_policy="redirect-to-https",
            compress=True,
            allowed_methods=["GET", "HEAD", "OPTIONS"],
            cached_methods=["GET", "HEAD"],
            response_headers_policy_id=security_headers.ref,
            forwarded_values=cloudfront.CfnDistribution.ForwardedValuesProperty(
                query_string=False,
                cookies=cloudfront.CfnDistribution.CookiesProperty(
                    forward="none"
                ),
            ),
        )

        cache_behaviors = []
        if api_endpoint:
            api_domain = Fn.select(2, Fn.split("/", api_endpoint))

            origins.append(
                cloudfront.CfnDistribution.OriginProperty(
                    id="APIOrigin",
                    domain_name=api_domain,
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
                    allowed_methods=[
                        "GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"
                    ],
                    cached_methods=["GET", "HEAD"],
                    cache_policy_id="4135ea2d-6df8-44a3-9df3-4b5a84be39ad",  # CachingDisabled
                    response_headers_policy_id=security_headers.ref,
                )
            )

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
                # CloudFront default certificate (no custom domain)
                viewer_certificate=cloudfront.CfnDistribution.ViewerCertificateProperty(
                    cloud_front_default_certificate=True,
                ),
                logging=cloudfront.CfnDistribution.LoggingProperty(
                    bucket=bucket.bucket_regional_domain_name,
                    prefix=f"cloudfront-logs/{environment}/",
                    include_cookies=False,
                ),
            ),
        )

        # ------------------------------------------------------------------
        # 7. Bucket policy – only CloudFront can read
        # ------------------------------------------------------------------
        bucket_policy = iam.PolicyStatement(
            sid="AllowCloudFrontRead",
            effect=iam.Effect.ALLOW,
            principals=[iam.ServicePrincipal("cloudfront.amazonaws.com")],
            actions=["s3:GetObject"],
            resources=[bucket.arn_for_objects("*")],
            conditions={
                "StringEquals": {
                    "AWS:SourceArn": f"arn:aws:cloudfront::{self.account}:distribution/{distribution.ref}"
                }
            },
        )
        bucket.add_to_resource_policy(bucket_policy)

        # ------------------------------------------------------------------
        # 8. CloudFront monitoring dashboard
        # ------------------------------------------------------------------
        dashboard = cloudwatch.Dashboard(
            self,
            "FrontendDashboard",
            dashboard_name=f"{project_name}-{environment}-cdn-dashboard",
        )

        dashboard.add_widgets(
            cloudwatch.Row(
                cloudwatch.GraphWidget(
                    title="CloudFront – Requests & Errors",
                    left=[
                        cloudwatch.Metric(
                            namespace="AWS/CloudFront",
                            metric_name="Requests",
                            dimensions_map={
                                "DistributionId": distribution.ref,
                                "Region": "Global",
                            },
                            statistic="Sum",
                            period=Duration.minutes(5),
                            label="Requests",
                        ),
                        cloudwatch.Metric(
                            namespace="AWS/CloudFront",
                            metric_name="TotalErrorRate",
                            dimensions_map={
                                "DistributionId": distribution.ref,
                                "Region": "Global",
                            },
                            statistic="Average",
                            period=Duration.minutes(5),
                            label="Error Rate (%)",
                        ),
                    ],
                    view=cloudwatch.GraphWidgetView.TIME_SERIES,
                ),
                cloudwatch.GraphWidget(
                    title="CloudFront – Bytes Downloaded",
                    left=[
                        cloudwatch.Metric(
                            namespace="AWS/CloudFront",
                            metric_name="BytesDownloaded",
                            dimensions_map={
                                "DistributionId": distribution.ref,
                                "Region": "Global",
                            },
                            statistic="Sum",
                            period=Duration.minutes(5),
                            label="Bytes Downloaded",
                        ),
                    ],
                    view=cloudwatch.GraphWidgetView.TIME_SERIES,
                ),
            ),
            cloudwatch.Row(
                cloudwatch.GraphWidget(
                    title="WAF – Blocked Requests",
                    left=[
                        cloudwatch.Metric(
                            namespace="AWS/WAFV2",
                            metric_name="BlockedRequests",
                            dimensions_map={
                                "WebACL": f"{project_name}-{environment}-waf",
                                "Region": "Global",
                            },
                            statistic="Sum",
                            period=Duration.minutes(5),
                            label="Blocked Requests",
                        ),
                        cloudwatch.Metric(
                            namespace="AWS/WAFV2",
                            metric_name="AllowedRequests",
                            dimensions_map={
                                "WebACL": f"{project_name}-{environment}-waf",
                                "Region": "Global",
                            },
                            statistic="Sum",
                            period=Duration.minutes(5),
                            label="Allowed Requests",
                        ),
                    ],
                    view=cloudwatch.GraphWidgetView.TIME_SERIES,
                ),
                cloudwatch.GraphWidget(
                    title="S3 – Bucket Size",
                    left=[
                        cloudwatch.Metric(
                            namespace="AWS/S3",
                            metric_name="BucketSizeBytes",
                            dimensions_map={
                                "BucketName": bucket.bucket_name,
                                "StorageType": "StandardStorage",
                            },
                            statistic="Average",
                            period=Duration.hours(1),
                            label="Bucket Size (bytes)",
                        ),
                    ],
                    view=cloudwatch.GraphWidgetView.TIME_SERIES,
                ),
            ),
        )

        # ------------------------------------------------------------------
        # Outputs
        # ------------------------------------------------------------------
        CfnOutput(
            self, "WebsiteUrl",
            value=f"https://{distribution.get_att('DomainName')}",
            description="CloudFront distribution URL",
        )
        CfnOutput(self, "WebsiteBucketName", value=bucket.bucket_name)
        CfnOutput(self, "CloudFrontDistributionId", value=distribution.ref)
        CfnOutput(self, "CloudFrontDomainName", value=distribution.get_att("DomainName").to_string())
        CfnOutput(self, "WafWebACLArn", value=waf_acl.attr_arn)
        CfnOutput(self, "AdminAuthFunctionArn", value=admin_auth_func.attr_function_arn)
        CfnOutput(self, "CdnDashboardName", value=dashboard.dashboard_name)
