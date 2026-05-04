#!/usr/bin/env python3
"""
Deploy script para el sales website.

Ejecuta `cdk` internamente con npx (el usuario solo ve Python).
No requiere Node.js instalado globalmente — npx lo gestiona automáticamente.

Uso:
  python scripts/deploy.py synth                         # validar infra
  python scripts/deploy.py deploy --all                   # desplegar todo
  python scripts/deploy.py deploy backend                 # solo backend
  python scripts/deploy.py deploy frontend                # solo frontend
  python scripts/deploy.py destroy --all                  # destruir
  python scripts/deploy.py outputs                        # ver outputs
  python scripts/deploy.py bootstrap                      # bootstrap inicial

Parámetros:
  --env=prod              entorno (dev/stage/prod)
  --project=mi-sitio      nombre del proyecto
  --price-class=PriceClass_All  PriceClass de CloudFront
  --enable-backend=false  deshabilitar backend
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CDK_DIR = REPO_ROOT / "infra" / "cdk"

DEFAULT_PROJECT = "sales-website"
DEFAULT_ENV = "dev"
DEFAULT_PRICE_CLASS = "PriceClass_100"


def run_cdk(args: list[str]) -> int:
    """Ejecuta cdk via npx (Node.js se instala automáticamente si no existe)."""
    cmd = ["npx", "--yes", "aws-cdk@latest"] + args
    print(f"⚡ cdk {' '.join(args)}")
    return subprocess.call(cmd, cwd=str(CDK_DIR))


def build_context_flags(context: dict) -> list[str]:
    flags = []
    for key, value in context.items():
        flags.extend(["--context", f"{key}={value}"])
    return flags


def cmd_synth(context: dict, _args: list[str]) -> int:
    return run_cdk(["synth", "--all"] + build_context_flags(context))


def cmd_bootstrap(context: dict, args: list[str]) -> int:
    account = os.environ.get("CDK_DEFAULT_ACCOUNT") or _get_account_id()
    if not account:
        print("❌ No se encontró cuenta AWS. Configura AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.")
        return 1

    regions = {"us-east-1"}  # CloudFront + WAF
    # Buscar --backend-region en args
    if "--backend-region" in args:
        idx = args.index("--backend-region")
        regions.add(args[idx + 1])
    else:
        regions.add("us-east-2")

    for region in sorted(regions):
        ret = run_cdk(["bootstrap", f"aws://{account}/{region}"] + build_context_flags(context))
        if ret != 0:
            return ret
    return 0


def _resolve_target(args: list[str]) -> str:
    """'backend' | 'frontend' | 'all' según los argumentos."""
    for t in ("backend", "frontend", "all"):
        if t in args:
            return t
    return "all"


def cmd_deploy(context: dict, args: list[str]) -> int:
    target = _resolve_target(args)
    stacks = []
    suffix_b = f'{context["project_name"]}-{context["environment"]}-backend'
    suffix_f = f'{context["project_name"]}-{context["environment"]}-frontend'

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
    stacks = []
    suffix_f = f'{context["project_name"]}-{context["environment"]}-frontend'
    suffix_b = f'{context["project_name"]}-{context["environment"]}-backend'

    if target in ("all", "frontend"):
        stacks.append(suffix_f)
    if target in ("all", "backend"):
        stacks.append(suffix_b)

    # Destruir en orden inverso (frontend antes que backend)
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
    parser = argparse.ArgumentParser(
        description="Sales Website Deploy Tool (CDK vía npx, interfaz Python)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("command", choices=["synth", "bootstrap", "deploy", "destroy", "outputs"])
    parser.add_argument("target", nargs="*", default=[],
                        help="all | backend | frontend")
    parser.add_argument("--env", default=DEFAULT_ENV, help=f"entorno (default: {DEFAULT_ENV})")
    parser.add_argument("--project", default=DEFAULT_PROJECT, help=f"nombre proyecto (default: {DEFAULT_PROJECT})")
    parser.add_argument("--price-class", default=DEFAULT_PRICE_CLASS, help="PriceClass_100 | PriceClass_200 | PriceClass_All")
    parser.add_argument("--enable-backend", default="true", help="true | false")
    parser.add_argument("--backend-region", default="us-east-2", help="región para backend stack")

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

    return commands[parsed.command](context, parsed.target + extra)


if __name__ == "__main__":
    sys.exit(main())
