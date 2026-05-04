#!/usr/bin/env python3
"""
Deploy script – CDK via Docker (pure Python, zero Node.js).

Usage:
  python scripts/deploy.py synth                         # validate infra
  python scripts/deploy.py deploy --all                   # deploy everything
  python scripts/deploy.py deploy backend                 # deploy backend only
  python scripts/deploy.py deploy frontend                # deploy frontend only
  python scripts/deploy.py destroy --all                  # tear down
  python scripts/deploy.py outputs                        # show stack outputs
  python scripts/deploy.py bootstrap                      # one-time bootstrap

Context parameters:
  python scripts/deploy.py deploy --all --env=prod --project=mi-sitio --price-class=PriceClass_All
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CDK_DIR = REPO_ROOT / "infra" / "cdk"
CDK_IMAGE = "public.ecr.aws/aws-cdk/cli:latest"

DEFAULT_PROJECT = "sales-website"
DEFAULT_ENV = "dev"
DEFAULT_PRICE_CLASS = "PriceClass_100"


def docker_cdk(args: list[str]) -> int:
    """Run `cdk` inside the official Docker image, mounting the project."""
    cmd = [
        "docker", "run", "--rm",
        "-v", f"{REPO_ROOT}:/app",
        "-v", f"{Path.home() / '.aws'}:/root/.aws:ro",
        "-e", "AWS_DEFAULT_REGION",
        "-e", "AWS_REGION",
        "-e", "AWS_ACCESS_KEY_ID",
        "-e", "AWS_SECRET_ACCESS_KEY",
        "-e", "AWS_SESSION_TOKEN",
        "-w", f"/app/infra/cdk",
        CDK_IMAGE,
    ] + args

    print(f"🐳 docker cdk {' '.join(args)}")
    return subprocess.call(cmd)


def build_context_args(context: dict) -> list[str]:
    """Convert context dict to --context flags."""
    flags = []
    for key, value in context.items():
        flags.extend(["--context", f"{key}={value}"])
    return flags


def cmd_synth(context: dict, args: list[str]) -> int:
    cdk_args = ["synth", "--all"] + build_context_args(context)
    return docker_cdk(cdk_args)


def cmd_bootstrap(context: dict, args: list[str]) -> int:
    account = os.environ.get("CDK_DEFAULT_ACCOUNT") or _get_account_id()
    if not account:
        print("❌ No AWS account found. Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.")
        return 1

    regions = set()
    regions.add("us-east-1")  # CloudFront + WAF
    if "--backend-region" in args:
        idx = args.index("--backend-region")
        regions.add(args[idx + 1])
    else:
        regions.add("us-east-2")  # default backend region

    for region in regions:
        ret = docker_cdk([
            "bootstrap", f"aws://{account}/{region}",
            *build_context_args(context),
        ])
        if ret != 0:
            return ret
    return 0


def cmd_deploy(context: dict, args: list[str]) -> int:
    target = "backend" if "backend" in args else "frontend" if "frontend" in args else "all"

    stacks = []
    if target in ("all", "backend"):
        stacks.append(f'{context["project_name"]}-{context["environment"]}-backend')
    if target in ("all", "frontend"):
        stacks.append(f'{context["project_name"]}-{context["environment"]}-frontend')

    for stack in stacks:
        ret = docker_cdk([
            "deploy", stack,
            *build_context_args(context),
            "--require-approval", "never",
        ])
        if ret != 0:
            return ret

    # Show URL after deploy
    cmd_outputs(context, [])
    return 0


def cmd_destroy(context: dict, args: list[str]) -> int:
    target = "backend" if "backend" in args else "frontend" if "frontend" in args else "all"

    stacks = []
    if target in ("all", "frontend"):
        stacks.append(f'{context["project_name"]}-{context["environment"]}-frontend')
    if target in ("all", "backend"):
        stacks.append(f'{context["project_name"]}-{context["environment"]}-backend')

    for stack in reversed(stacks):
        ret = docker_cdk([
            "destroy", stack,
            *build_context_args(context),
            "--force",
        ])
        if ret != 0:
            return ret
    return 0


def cmd_outputs(context: dict, args: list[str]) -> int:
    for suffix in ("frontend", "backend"):
        stack = f'{context["project_name"]}-{context["environment"]}-{suffix}'
        print(f"\n── {stack} ──")
        ret = docker_cdk([
            "outputs", stack,
            *build_context_args(context),
        ])
        if ret != 0 and suffix == "backend":
            print("   (backend may be disabled)")
    return 0


def _get_account_id() -> str | None:
    try:
        result = subprocess.run(
            ["aws", "sts", "get-caller-identity", "--query", "Account", "--output", "text"],
            capture_output=True, text=True, timeout=10,
        )
        return result.stdout.strip() if result.returncode == 0 else None
    except Exception:
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description="CDK deploy script (pure Python via Docker)")
    parser.add_argument("command", choices=["synth", "bootstrap", "deploy", "destroy", "outputs"])
    parser.add_argument("target", nargs="*", default=[],
                        help="all | backend | frontend")
    parser.add_argument("--env", default=DEFAULT_ENV, help="environment (dev/stage/prod)")
    parser.add_argument("--project", default=DEFAULT_PROJECT, help="project name")
    parser.add_argument("--price-class", default=DEFAULT_PRICE_CLASS, help="PriceClass_100/200/All")
    parser.add_argument("--enable-backend", default="true", help="true/false")
    parser.add_argument("--backend-region", default="us-east-2", help="region for backend stack")

    parsed, extra = parser.parse_known_args()

    context = {
        "project_name": parsed.project,
        "environment": parsed.env,
        "enable_backend": parsed.enable_backend,
        "price_class": parsed.price_class,
    }

    commands = {
        "synth": cmd_synth,
        "bootstrap": cmd_bootstrap,
        "deploy": cmd_deploy,
        "destroy": cmd_destroy,
        "outputs": cmd_outputs,
    }

    fn = commands[parsed.command]
    return fn(context, parsed.target + extra)


if __name__ == "__main__":
    sys.exit(main())
