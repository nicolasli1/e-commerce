#!/bin/bash
# =============================================================================
# CloudFormation Deploy Script — NexCore Sales Website
# =============================================================================
# Uso:
#   ./scripts/deploy-cfn.sh create-stack [--env prod] [--project sales-website]
#   ./scripts/deploy-cfn.sh update-stack [--env prod]
#   ./scripts/deploy-cfn.sh describe-stack
#   ./scripts/deploy-cfn.sh delete-stack
#   ./scripts/deploy-cfn.sh list-stacks
#   ./scripts/deploy-cfn.sh validate-template
#   ./scripts/deploy-cfn.sh sync-frontend [--bucket <name>]
#   ./scripts/deploy-cfn.sh create-secrets
#
# Requisitos: AWS CLI configurado, Python 3, jq opcional.
# El template CloudFormation se encuentra en:
#   infra/cloudformation/sales-website.yaml
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE="$REPO_ROOT/infra/cloudformation/sales-website.yaml"
PROJECT_NAME="sales-website"
ENVIRONMENT="dev"
ENABLE_BACKEND="true"
PRICE_CLASS="PriceClass_100"
ALARM_EMAIL=""
REGION="us-east-1"
BACKEND_REGION="us-east-2"
CAPABILITIES="CAPABILITY_IAM CAPABILITY_AUTO_EXPAND"
STACK_NAME=""

# ─── Parse args ──────────────────────────────────────────

while [[ $# -gt 0 ]]; do
    case $1 in
        create-stack|update-stack|delete-stack|describe-stack|list-stacks|validate-template|sync-frontend|create-secrets)
            COMMAND="$1"
            shift
            ;;
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --project)
            PROJECT_NAME="$2"
            shift 2
            ;;
        --no-backend)
            ENABLE_BACKEND="false"
            shift
            ;;
        --alarm-email)
            ALARM_EMAIL="$2"
            shift 2
            ;;
        --bucket)
            BUCKET_OVERRIDE="$2"
            shift 2
            ;;
        --price-class)
            PRICE_CLASS="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --backend-region)
            BACKEND_REGION="$2"
            shift 2
            ;;
        --help|-h)
            echo "Uso: $0 <comando> [opciones]"
            echo ""
            echo "Comandos:"
            echo "  create-stack     Crear stack CloudFormation"
            echo "  update-stack     Actualizar stack existente"
            echo "  delete-stack     Eliminar stack"
            echo "  describe-stack   Mostrar detalles del stack"
            echo "  list-stacks      Listar stacks del proyecto"
            echo "  validate-template Validar template YAML"
            echo "  sync-frontend    Subir frontend/backoffice a S3 (+ invalidar CF cache)"
            echo "  create-secrets   Crear secrets en SSM Parameter Store"
            echo ""
            echo "Opciones:"
            echo "  --env <env>         Entorno (dev/stage/prod)   [default: dev]"
            echo "  --project <name>    Nombre del proyecto        [default: sales-website]"
            echo "  --no-backend        Deshabilitar backend"
            echo "  --alarm-email <e>   Email para alarmas CloudWatch"
            echo "  --bucket <name>     Especificar bucket manualmente (sync-frontend)"
            echo "  --price-class <pc>  PriceClass de CloudFront"
            echo "  --region <r>        Región AWS para frontend   [default: us-east-1]"
            echo "  --backend-region <r> Región AWS para backend  [default: us-east-2]"
            exit 0
            ;;
        *)
            echo "❌ Opción desconocida: $1"
            echo "Usa --help para ayuda"
            exit 1
            ;;
    esac
done

# CloudFront + WAF must be in us-east-1
if [ "$REGION" != "us-east-1" ]; then
    echo "⚠️  CloudFront + WAF require región us-east-1. Cambiando a us-east-1."
    REGION="us-east-1"
fi

STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}"

# ─── Utility functions ───────────────────────────────────

check_aws() {
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI no encontrado. Instálalo: https://aws.amazon.com/cli/"
        exit 1
    fi
}

get_account_id() {
    aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "unknown"
}

generate_secret() {
    python3 -c "import secrets; print(secrets.token_urlsafe(16))"
}

generate_session_secret() {
    python3 -c "import secrets; print(secrets.token_hex(32))"
}

# ─── Commands ─────────────────────────────────────────────

if [ "$COMMAND" = "validate-template" ]; then
    echo "🔍 Validando template CloudFormation..."
    aws cloudformation validate-template \
        --template-body file://"$TEMPLATE" \
        --region "$REGION"
    echo "✅ Template válido"
    exit 0
fi

if [ "$COMMAND" = "list-stacks" ]; then
    echo "📋 Stacks del proyecto ${PROJECT_NAME}:"
    aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE CREATE_FAILED UPDATE_ROLLBACK_COMPLETE \
        --query "StackSummaries[?contains(StackName, '${PROJECT_NAME}')].[StackName,StackStatus,CreationTime]" \
        --output table \
        --region "$REGION"
    exit 0
fi

if [ "$COMMAND" = "describe-stack" ]; then
    echo "📖 Detalles del stack ${STACK_NAME}:"
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].[StackName,StackStatus,StackId,CreationTime,LastUpdatedTime,Outputs]" \
        --output json || {
        echo "❌ Stack $STACK_NAME no encontrado en $REGION"
        exit 1
    }
    exit 0
fi

if [ "$COMMAND" = "delete-stack" ]; then
    echo "⚠️  Eliminando stack ${STACK_NAME}..."
    aws cloudformation delete-stack \
        --stack-name "$STACK_NAME" \
        --region "$REGION"
    echo "⏳ Esperando eliminación..."
    aws cloudformation wait stack-delete-complete \
        --stack-name "$STACK_NAME" \
        --region "$REGION"
    echo "✅ Stack eliminado"
    exit 0
fi

if [ "$COMMAND" = "create-secrets" ]; then
    echo "🔐 Creando secrets en SSM Parameter Store..."
    SSM_PATH="/${PROJECT_NAME}/${ENVIRONMENT}"

    # admin-user (String, plain)
    aws ssm put-parameter \
        --name "${SSM_PATH}/admin-user" \
        --value "admin" \
        --type "String" \
        --description "Admin username for backoffice login" \
        --overwrite \
        --region "$BACKEND_REGION" 2>/dev/null && echo "   ✅ admin-user" || echo "   ⚠️  admin-user (puede existir)"

    # admin-password (SecureString)
    PASSWORD=$(generate_secret)
    aws ssm put-parameter \
        --name "${SSM_PATH}/admin-password" \
        --value "$PASSWORD" \
        --type "SecureString" \
        --description "Admin password for backoffice login" \
        --overwrite \
        --region "$BACKEND_REGION" && echo "   ✅ admin-password: $PASSWORD" || echo "   ⚠️  admin-password"

    # admin-session-secret (SecureString)
    SESSION_SECRET=$(generate_session_secret)
    aws ssm put-parameter \
        --name "${SSM_PATH}/admin-session-secret" \
        --value "$SESSION_SECRET" \
        --type "SecureString" \
        --description "Secret key for signing admin session tokens" \
        --overwrite \
        --region "$BACKEND_REGION" && echo "   ✅ admin-session-secret: ${SESSION_SECRET:0:16}..." || echo "   ⚠️  admin-session-secret"

    echo ""
    echo "🔐 Secrets creados en ${SSM_PATH} (región: ${BACKEND_REGION})"
    echo "   Guarda la password: $PASSWORD"
    exit 0
fi

if [ "$COMMAND" = "create-stack" ] || [ "$COMMAND" = "update-stack" ]; then
    check_aws
    ACCOUNT_ID=$(get_account_id)
    echo "🏗️  $COMMAND: ${STACK_NAME}"
    echo "   Región:       ${REGION}"
    echo "   Proyecto:     ${PROJECT_NAME}"
    echo "   Entorno:      ${ENVIRONMENT}"
    echo "   Backend:      ${ENABLE_BACKEND}"
    echo "   PriceClass:   ${PRICE_CLASS}"
    echo "   Cuenta:       ${ACCOUNT_ID}"
    echo ""

    PARAMS="ParameterKey=ProjectName,ParameterValue=${PROJECT_NAME}"
    PARAMS="${PARAMS} ParameterKey=Environment,ParameterValue=${ENVIRONMENT}"
    PARAMS="${PARAMS} ParameterKey=EnableBackend,ParameterValue=${ENABLE_BACKEND}"
    PARAMS="${PARAMS} ParameterKey=PriceClass,ParameterValue=${PRICE_CLASS}"
    PARAMS="${PARAMS} ParameterKey=AlarmEmail,ParameterValue=${ALARM_EMAIL}"

    if [ "$COMMAND" = "create-stack" ]; then
        aws cloudformation create-stack \
            --stack-name "$STACK_NAME" \
            --template-body file://"$TEMPLATE" \
            --parameters $PARAMS \
            --capabilities $CAPABILITIES \
            --region "$REGION" \
            --tags Key=Project,Value="${PROJECT_NAME}" Key=Environment,Value="${ENVIRONMENT}"

        echo "⏳ Esperando creación del stack..."
        aws cloudformation wait stack-create-complete \
            --stack-name "$STACK_NAME" \
            --region "$REGION"
    else
        aws cloudformation update-stack \
            --stack-name "$STACK_NAME" \
            --template-body file://"$TEMPLATE" \
            --parameters $PARAMS \
            --capabilities $CAPABILITIES \
            --region "$REGION" || {
            EXIT_CODE=$?
            if [ $EXIT_CODE -eq 255 ]; then
                # No updates to perform
                echo "✅ No hay cambios que aplicar."
                exit 0
            fi
            echo "❌ Error al actualizar stack"
            exit $EXIT_CODE
        }

        echo "⏳ Esperando actualización..."
        aws cloudformation wait stack-update-complete \
            --stack-name "$STACK_NAME" \
            --region "$REGION" 2>/dev/null || true
    fi

    echo ""
    echo "✅ Stack ${COMMAND} completado!"

    # Show outputs
    echo ""
    echo "📋 Outputs:"
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].Outputs[].[OutputKey,OutputValue]" \
        --output table

    exit 0
fi

if [ "$COMMAND" = "sync-frontend" ]; then
    check_aws
    echo "📦 Sincronizando frontend a S3..."

    # Get bucket name from stack outputs or use override
    if [ -n "${BUCKET_OVERRIDE:-}" ]; then
        BUCKET="$BUCKET_OVERRIDE"
    else
        BUCKET=$(aws cloudformation describe-stacks \
            --stack-name "$STACK_NAME" \
            --region "$REGION" \
            --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" \
            --output text 2>/dev/null) || {
            echo "❌ No se pudo obtener bucket. Especifica --bucket <name>"
            exit 1
        }
    fi

    DIST_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
        --output text 2>/dev/null || echo "")

    echo "   Bucket:       ${BUCKET}"
    echo "   CloudFront:   ${DIST_ID:-N/A}"
    echo ""

    # Sync frontend
    echo "→ Sincronizando ./frontend → s3://${BUCKET}/"
    aws s3 sync "$REPO_ROOT/frontend" \
        "s3://${BUCKET}/" \
        --delete \
        --cache-control "max-age=3600"

    # Sync backoffice
    echo "→ Sincronizando ./backoffice → s3://${BUCKET}/admin/"
    aws s3 sync "$REPO_ROOT/backoffice" \
        "s3://${BUCKET}/admin/" \
        --delete \
        --cache-control "max-age=3600"

    # Invalidate CloudFront
    if [ -n "$DIST_ID" ]; then
        echo "→ Invalidando CloudFront cache (/*)..."
        aws cloudfront create-invalidation \
            --distribution-id "$DIST_ID" \
            --paths '/*' \
            --output json | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'   Invalidation ID: {d[\"Invalidation\"][\"Id\"]}')"
    fi

    echo ""
    echo "✅ Frontend sincronizado!"

    WEBSITE_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" \
        --output text 2>/dev/null || echo "")
    if [ -n "$WEBSITE_URL" ]; then
        echo "🌐 URL: ${WEBSITE_URL}"
    fi

    exit 0
fi

echo "❌ Comando no reconocido: $COMMAND"
echo "Usa --help para ayuda"
exit 1
