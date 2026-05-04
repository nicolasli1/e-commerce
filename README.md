# Sales Website on AWS

Base architecture for a sales website on AWS with:

| Component   | Stack         | Tecnología                     |
|-------------|---------------|--------------------------------|
| Frontend    | FrontendStack | **S3** + **CloudFront** + **WAF** |
| Backend     | BackendStack  | **API Gateway HTTP** + **Lambda** + **DynamoDB** |
| Infra       | CDK (Python)  | `aws-cdk-lib` ≥ 2.100          |

> ⚡ **Dos opciones de gestión de infraestructura:**
> - **CDK (recomendado)** → `infra/cdk/` — este es el camino principal.
> - **CloudFormation** → `infra/cloudformation/sales-website.yaml` — versión YAML plana, útil como referencia o para entornos sin CDK.

---

## Stack frontend (`FrontendStack`)

- **S3 bucket** privado con cifrado y versionado.
- **CloudFront** con OAC (Origin Access Control), HTTP/2, IPv6, y cabeceras de seguridad.
- **WAF** con AWS managed rules + rate limiting (2000 req/5 min por IP).
- Redirección 403/404 → `/index.html` (SPA-friendly).

## Stack backend (`BackendStack`)

- **API Gateway HTTP API** con CORS habilitado.
- **Lambda** (Python 3.12) inline — sin capa extra, sin assets externos.
- **DynamoDB** on-demand para leads.
- Endpoints: `GET /api/health` y `POST /api/leads`.

> El backend es **opcional** (`enable_backend: false`). Sin backend solo tienes frontend estático.

---

## Arquitectura

```
Usuario ──► CloudFront ──┬──► S3 (estático)
                         │
                         └──► API Gateway ──► Lambda ──► DynamoDB
                              (opcional)
```

---

## Despliegue

### Prerrequisitos

```bash
# 1. Instalar Node.js (para CDK CLI)
# 2. Instalar CDK CLI
npm install -g aws-cdk

# 3. Instalar dependencias Python
cd infra/cdk
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Bootstrap (una sola vez por cuenta/región)

```bash
cd infra/cdk
cdk bootstrap
```

### Deploy

```bash
# Todo junto
cdk deploy --all

# O por separado
cdk deploy sales-website-dev-backend    # backend primero
cdk deploy sales-website-dev-frontend   # frontend después
```

### Subir el frontend

```bash
# Después del deploy, sube tu sitio compilado
aws s3 sync ./dist s3://TU_BUCKET_NAME --delete

# Invalida la caché de CloudFront
aws cloudfront create-invalidation \
  --distribution-id TU_DISTRIBUTION_ID \
  --paths '/*'
```

### Ver outputs

```bash
aws cloudformation describe-stacks \
  --stack-name sales-website-dev-frontend \
  --query 'Stacks[0].Outputs'
```

---

## Personalización vía context (cdk deploy --context ...)

```bash
# Entorno staging
cdk deploy --all \
  --context environment=stage \
  --context project_name=mi-sitio

# Solo frontend, sin backend
cdk deploy sales-website-dev-frontend \
  --context enable_backend=false

# PriceClass más amplio
cdk deploy sales-website-dev-frontend \
  --context price_class=PriceClass_All
```

---

---

## CI/CD con GitHub Actions

El pipeline automatiza todo: synth → deploy → frontend → invalidation.

### Secrets necesarios en GitHub

| Secret | Descripción |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Access Key de IAM con permisos de deploy |
| `AWS_SECRET_ACCESS_KEY` | Secret Key correspondiente |
| `AWS_ACCOUNT_ID` | ID de tu cuenta AWS (12 dígitos) |
| `AWS_BACKEND_REGION` | Región para el backend (default: `us-east-2`) |

> Alternativa recomendada: usar **OIDC** en vez de access keys.
> Consulta [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials).

### Cómo funciona

```yaml
on:
  push:
    branches: [main, master]    # auto-deploy al hacer push
  workflow_dispatch:             # también manual desde GitHub UI
    inputs:
      environment:               # dev \| stage \| prod
```

1. **Validate** — corre `cdk synth` para verificar que la infraestructura es válida.
2. **Deploy** — `cdk bootstrap` (una vez) + `cdk deploy` de ambos stacks.
3. **Frontend** — build del frontend + `aws s3 sync` al bucket.
4. **Invalidate** — `aws cloudfront create-invalidation /*`.

Ver `.github/workflows/deploy.yml` para los detalles.

### Trigger manual

```bash
# Desde GitHub UI: Actions → Deploy Sales Website → Run workflow
# Elegir: dev, stage, o prod
```

---

## Roadmap

| Fase | Qué incluye |
|------|-------------|
| **v1** | S3 + CloudFront + WAF + API básica + DynamoDB + CI/CD ✅ |
| **v2** | Dominio personalizado + ACM |
| **v3** | Lambdas separadas + SES + SQS |
| **v4** | Autenticación + panel admin + analytics |

---

## Referencias

- [Arquitectura CDK detallada](docs/cdk-architecture.md)
- [Arquitectura general](docs/architecture.md)
- [CloudFormation template](infra/cloudformation/sales-website.yaml)
- [Pipeline CI/CD](.github/workflows/deploy.yml)
