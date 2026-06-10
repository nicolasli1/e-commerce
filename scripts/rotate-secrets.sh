#!/usr/bin/env bash
# =============================================================================
# Rotate SSM Secrets for RepuestosCel Sales Website
# =============================================================================
# Creates or rotates the admin SSM Parameter Store secrets.
#
# Usage:
#   bash scripts/rotate-secrets.sh                    # dev (default)
#   bash scripts/rotate-secrets.sh --env prod          # production
#
# Outputs the password at the end. Save it in a password manager.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Defaults ────────────────────────────────────────────
PROJECT_NAME="sales-website"
ENVIRONMENT="dev"
BACKEND_REGION="us-east-2"

# ─── Parse args ──────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case $1 in
        --env) ENVIRONMENT="$2"; shift 2 ;;
        --project) PROJECT_NAME="$2"; shift 2 ;;
        --region) BACKEND_REGION="$2"; shift 2 ;;
        --help|-h)
            echo "Uso: $0 [--env dev|prod] [--project sales-website]"
            exit 0
            ;;
        *) echo "❌ Opción desconocida: $1"; exit 1 ;;
    esac
done

SSM_PATH="/${PROJECT_NAME}/${ENVIRONMENT}"

# ─── Generate new secrets ───────────────────────────────
PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")
SESSION_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
USERNAME="${ADMIN_USER:-admin}"

echo "🔐 Rotando secrets en SSM: ${SSM_PATH} (${BACKEND_REGION})"
echo ""

# admin-user (String)
aws ssm put-parameter \
    --name "${SSM_PATH}/admin-user" \
    --value "${USERNAME}" \
    --type "String" \
    --description "Admin username for backoffice login" \
    --overwrite \
    --region "${BACKEND_REGION}" > /dev/null && echo "   ✅ admin-user: ${USERNAME}"

# admin-password (SecureString)
aws ssm put-parameter \
    --name "${SSM_PATH}/admin-password" \
    --value "${PASSWORD}" \
    --type "SecureString" \
    --description "Admin password for backoffice login (auto-generated)" \
    --overwrite \
    --region "${BACKEND_REGION}" > /dev/null && echo "   ✅ admin-password: *** (saved)"

# admin-session-secret (SecureString)
aws ssm put-parameter \
    --name "${SSM_PATH}/admin-session-secret" \
    --value "${SESSION_SECRET}" \
    --type "SecureString" \
    --description "Secret key for signing admin session tokens (auto-generated)" \
    --overwrite \
    --region "${BACKEND_REGION}" > /dev/null && echo "   ✅ admin-session-secret: *** (saved)"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ Secrets rotados exitosamente"
echo ""
echo "  URL:       ${SSM_PATH}"
echo "  Región:    ${BACKEND_REGION}"
echo "  Usuario:   ${USERNAME}"
echo "  Password:  ${PASSWORD}"
echo ""
echo "  ⚠️  GUARDA ESTA CONTRASEÑA AHORA"
echo "  No se puede recuperar después (SecureString)"
echo "═══════════════════════════════════════════════════"
