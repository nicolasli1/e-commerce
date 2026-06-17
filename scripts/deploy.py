#!/usr/bin/env python3
"""
Deploy script para el sales website.

Ejecuta `cdk` internamente con npx (el usuario solo ve Python).
No requiere Node.js instalado globalmente — npx lo gestiona automáticamente.

Uso:
  python scripts/deploy.py synth                         # validar infra
  python scripts/deploy.py secrets create                # crear SSM secrets
  python scripts/deploy.py secrets rotate                # rotar SSM secrets
  python scripts/deploy.py bootstrap                     # bootstrap inicial
  python scripts/deploy.py deploy --all                   # desplegar todo
  python scripts/deploy.py deploy backend                 # solo backend
  python scripts/deploy.py deploy frontend                # solo frontend
  python scripts/deploy.py destroy --all                  # destruir
  python scripts/deploy.py outputs                        # ver outputs

Parámetros:
  --env=prod              entorno (dev/stage/prod)
  --project=mi-sitio      nombre del proyecto
  --price-class=PriceClass_All  PriceClass de CloudFront
  --enable-backend=false  deshabilitar backend
  --alarm-email=user@example.com  email para alarmas CloudWatch
"""

import argparse
import json
import os
import secrets as py_secrets
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CDK_DIR = REPO_ROOT / "infra" / "cdk"

DEFAULT_PROJECT = "sales-website"
DEFAULT_ENV = "dev"
DEFAULT_PRICE_CLASS = "PriceClass_100"


# ─── UTILS ──────────────────────────────────────────────

def run_cmd(cmd: list[str], cwd: str | None = None) -> int:
    print(f"⚡ {' '.join(cmd)}")
    return subprocess.call(cmd, cwd=cwd or str(CDK_DIR))


def run_cdk(args: list[str]) -> int:
    return run_cmd(["npx", "--yes", "aws-cdk@latest"] + args)


def run_aws(args: list[str]) -> str | None:
    try:
        result = subprocess.run(
            ["aws"] + args,
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            return result.stdout.strip()
        print(f"❌ aws {' '.join(args)} failed: {result.stderr.strip()}")
        return None
    except Exception as e:
        print(f"❌ aws error: {e}")
        return None


def build_context_flags(context: dict) -> list[str]:
    flags = []
    for key, value in context.items():
        if value is not None:
            flags.extend(["--context", f"{key}={value}"])
    return flags


def _get_account_id() -> str | None:
    return run_aws(["sts", "get-caller-identity", "--query", "Account", "--output", "text"])


def _resolve_target(args: list[str]) -> str:
    for t in ("backend", "frontend", "all"):
        if t in args:
            return t
    return "all"


# ─── SECRETS MANAGEMENT ─────────────────────────────────

# Parámetros SSM que deben existir antes del deploy
SSM_SECRETS = {
    "admin-user": {
        "description": "Admin username for backoffice login",
        "default": "admin",
        "type": "String",
    },
    "admin-password": {
        "description": "Admin password for backoffice login (min 12 chars)",
        "generate": lambda: py_secrets.token_urlsafe(16),  # 24 chars base64
        "type": "SecureString",
    },
    "admin-session-secret": {
        "description": "Secret key for signing admin session tokens (min 32 chars)",
        "generate": lambda: py_secrets.token_hex(32),  # 64 hex chars
        "type": "SecureString",
    },
    "wompi-public-key": {
        "description": "Wompi public key (pub_test_... or pub_prod_...)",
        "default": "",
        "type": "String",
    },
    "wompi-integrity-secret": {
        "description": "Wompi integrity secret for widget/web checkout signature",
        "default": "",
        "type": "SecureString",
    },
    "wompi-events-secret": {
        "description": "Wompi events secret used to verify webhook signatures",
        "default": "",
        "type": "SecureString",
    },
    "mercadopago-public-key": {
        "description": "Mercado Pago public key used on the frontend when needed",
        "default": "",
        "type": "String",
    },
    "mercadopago-access-token": {
        "description": "Mercado Pago access token used to create Checkout Pro preferences",
        "default": "",
        "type": "SecureString",
    },
    "mercadopago-webhook-secret": {
        "description": "Mercado Pago webhook secret used to validate x-signature",
        "default": "",
        "type": "SecureString",
    },
    "order-notifications-from-email": {
        "description": "SES verified sender address used for customer order confirmations",
        "default": "",
        "type": "String",
    },
    "order-alerts-to-email": {
        "description": "Internal email that receives new approved order alerts",
        "default": "",
        "type": "String",
    },
    "email-provider": {
        "description": "Email delivery provider: ses or smtp",
        "default": "ses",
        "type": "String",
    },
    "smtp-host": {
        "description": "SMTP host for transactional email fallback",
        "default": "smtp.hostinger.com",
        "type": "String",
    },
    "smtp-port": {
        "description": "SMTP port, usually 465 for SSL or 587 for STARTTLS",
        "default": "465",
        "type": "String",
    },
    "smtp-username": {
        "description": "SMTP username, usually the sender mailbox",
        "default": "",
        "type": "String",
    },
    "smtp-password": {
        "description": "SMTP mailbox password",
        "default": "",
        "type": "SecureString",
    },
}


def cmd_secrets_create(context: dict, args: list[str]) -> int:
    """Create SSM Parameter Store secrets for the environment."""
    project = context["project_name"]
    env = context["environment"]
    region = context.get("backend_region", "us-east-2")
    ssm_path = f"/{project}/{env}/"

    print(f"\n🔐 SSM Secrets for {project}/{env} at {ssm_path}")
    print(f"   Region: {region}")
    print()

    for name, cfg in SSM_SECRETS.items():
        param_name = f"{ssm_path}{name}"
        existing = run_aws([
            "ssm", "get-parameter",
            "--name", param_name,
            "--region", region,
            "--output", "text",
            "--query", "Parameter.Value",
        ])
        if existing:
            print(f"   ✅ {name} — already exists (use 'rotate' to replace)")
            continue

        value = cfg.get("generate", lambda: cfg.get("default", ""))()
        if not value:
            print(f"   ⚠️  {name} — no value, keeping empty")
            continue

        result = run_aws([
            "ssm", "put-parameter",
            "--name", param_name,
            "--value", value,
            "--type", cfg["type"],
            "--description", cfg["description"],
            "--overwrite",
            "--region", region,
        ])
        if result is not None:
            print(f"   ✅ {name} — created ({cfg['type']})")
        else:
            print(f"   ❌ {name} — failed to create")
            return 1

    print(f"\n🔐 All secrets created at {ssm_path}")
    return 0


def cmd_secrets_rotate(context: dict, args: list[str]) -> int:
    """Rotate (regenerate) all SSM secrets for the environment."""
    project = context["project_name"]
    env = context["environment"]
    region = context.get("backend_region", "us-east-2")
    ssm_path = f"/{project}/{env}/"

    print(f"\n🔄 Rotating SSM secrets for {project}/{env}")
    print(f"   WARNING: This will invalidate existing sessions!")
    print()

    confirm = input("   Type 'yes' to confirm: ")
    if confirm.lower() != "yes":
        print("   Aborted.")
        return 1

    for name, cfg in SSM_SECRETS.items():
        param_name = f"{ssm_path}{name}"
        value = cfg.get("generate", lambda: cfg.get("default", ""))()
        if not value:
            continue

        result = run_aws([
            "ssm", "put-parameter",
            "--name", param_name,
            "--value", value,
            "--type", cfg["type"],
            "--description", cfg["description"],
            "--overwrite",
            "--region", region,
        ])
        if result is not None:
            print(f"   ✅ {name} — rotated")
        else:
            print(f"   ❌ {name} — failed")
            return 1

    print(f"\n🔄 Secrets rotated. You must re-deploy the backend stack.")
    return 0


# ─── CDK COMMANDS ──────────────────────────────────────

def cmd_synth(context: dict, _args: list[str]) -> int:
    return run_cdk(["synth", "--all"] + build_context_flags(context))


def cmd_bootstrap(context: dict, args: list[str]) -> int:
    account = os.environ.get("CDK_DEFAULT_ACCOUNT") or _get_account_id()
    if not account:
        print("❌ No se encontró cuenta AWS. Configura AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.")
        return 1

    regions = {"us-east-1"}  # CloudFront + WAF must be in us-east-1
    backend_region = context.get("backend_region", "us-east-2")
    regions.add(backend_region)

    for region in sorted(regions):
        ret = run_cdk(["bootstrap", f"aws://{account}/{region}"] + build_context_flags(context))
        if ret != 0:
            return ret
    return 0


def cmd_deploy(context: dict, args: list[str]) -> int:
    target = _resolve_target(args)
    suffix_b = f'{context["project_name"]}-{context["environment"]}-backend'
    suffix_f = f'{context["project_name"]}-{context["environment"]}-frontend'

    stacks = []
    if target in ("all", "backend"):
        stacks.append(suffix_b)
    if target in ("all", "frontend"):
        stacks.append(suffix_f)

    for stack in stacks:
        ret = run_cdk(["deploy", stack] + build_context_flags(context) + ["--require-approval", "never"])
        if ret != 0:
            return ret

    cmd_outputs(context, [])
    return 0


def cmd_destroy(context: dict, args: list[str]) -> int:
    target = _resolve_target(args)
    suffix_f = f'{context["project_name"]}-{context["environment"]}-frontend'
    suffix_b = f'{context["project_name"]}-{context["environment"]}-backend'

    stacks = []
    if target in ("all", "frontend"):
        stacks.append(suffix_f)
    if target in ("all", "backend"):
        stacks.append(suffix_b)

    for stack in reversed(stacks):
        ret = run_cdk(["destroy", stack] + build_context_flags(context) + ["--force"])
        if ret != 0:
            return ret
    return 0


def cmd_outputs(context: dict, _args: list[str]) -> int:
    for suffix in ("frontend", "backend"):
        stack = f'{context["project_name"]}-{context["environment"]}-{suffix}'
        print(f"\n── {stack} ──")
        ret = run_cdk(["outputs", stack] + build_context_flags(context))
        if ret != 0 and suffix == "backend":
            print("   (backend puede estar deshabilitado)")
    return 0


# ─── MAIN ───────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sales Website Deploy Tool (CDK vía npx, interfaz Python)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("command", choices=[
        "synth", "secrets", "bootstrap", "deploy", "destroy", "outputs"
    ])
    parser.add_argument("subcommand", nargs="*", default=[],
                        help="all | backend | frontend | create | rotate")
    parser.add_argument("--env", default=DEFAULT_ENV, help=f"entorno (default: {DEFAULT_ENV})")
    parser.add_argument("--project", default=DEFAULT_PROJECT, help=f"nombre proyecto (default: {DEFAULT_PROJECT})")
    parser.add_argument("--price-class", default=DEFAULT_PRICE_CLASS, help="PriceClass_100 | PriceClass_200 | PriceClass_All")
    parser.add_argument("--enable-backend", default="true", help="true | false")
    parser.add_argument("--backend-region", default="us-east-2", help="región para backend stack")
    parser.add_argument("--alarm-email", default=None, help="email para alarmas CloudWatch")
    parser.add_argument("--admin-user", default=None, help="admin username (custom override)")

    parsed, extra = parser.parse_known_args()

    context = {
        "project_name": parsed.project,
        "environment": parsed.env,
        "enable_backend": parsed.enable_backend,
        "price_class": parsed.price_class,
        "alarm_email": parsed.alarm_email,
        "admin_user": parsed.admin_user,
        "backend_region": parsed.backend_region,
    }

    # Route to subcommand dispatchers
    if parsed.command == "secrets":
        sub = (parsed.subcommand or ["create"])[0]  # default: create
        if sub == "create":
            return cmd_secrets_create(context, parsed.subcommand)
        elif sub == "rotate":
            return cmd_secrets_rotate(context, parsed.subcommand)
        else:
            print(f"❌ Unknown secrets subcommand: {sub}. Use 'create' or 'rotate'.")
            return 1

    commands = {
        "synth": cmd_synth,
        "bootstrap": cmd_bootstrap,
        "deploy": cmd_deploy,
        "destroy": cmd_destroy,
        "outputs": cmd_outputs,
    }

    return commands[parsed.command](context, parsed.subcommand + extra)


if __name__ == "__main__":
    sys.exit(main())
