# Sales Website on AWS

Base architecture for a sales website on AWS with:

| Component   | Stack         | Tecnología                     |
|-------------|---------------|--------------------------------|
| Frontend    | FrontendStack | **S3** + **CloudFront** + **WAF** |
| Backend     | BackendStack  | **API Gateway HTTP** + **Lambda** + **DynamoDB** |
| Infra       | CDK (Python)  | `aws-cdk-lib` ≥ 2.100          |

> **100% Python — sin Node.js.** El CLI de CDK corre dentro de Docker.
> Ver `scripts/deploy.py` para los comandos.

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

## Despliegue local (100% Python + Docker)

### Prerrequisitos

- Python 3.12+
- Docker
- AWS credentials configuradas (`~/.aws/credentials` o variables de entorno)

### Devcontainer (VS Code — recomendado)

```bash
# Abre la carpeta en VS Code
# Cmd+Shift+P → "Dev Containers: Reopen in Container"
# Todo viene preinstalado: Python, AWS CLI, Docker-in-Docker
```

### Sin devcontainer

```bash
cd infra/cdk
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Comandos (vía Python — sin Node.js)

```bash
# Validar infraestructura
python scripts/deploy.py synth

# Bootstrap (una sola vez por cuenta/región)
python scripts/deploy.py bootstrap

# Desplegar todo
python scripts/deploy.py deploy --all

# Desplegar solo frontend
python scripts/deploy.py deploy frontend

# Desplegar solo backend
python scripts/deploy.py deploy backend

# Destruir
python scripts/deploy.py destroy --all

# Ver outputs
python scripts/deploy.py outputs

# Con parámetros personalizados
python scripts/deploy.py deploy --all --env=prod --project=mi-sitio --price-class=PriceClass_All
```

### Subir frontend manualmente

```bash
python scripts/deploy.py outputs
# Copia el bucket name del output y luego:
aws s3 sync ./frontend s3://<BUCKET_NAME> --delete

# Invalidar CloudFront
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths '/*'
```

---

## CI/CD con GitHub Actions

### Secrets necesarios en GitHub

| Secret | Descripción |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Access Key de IAM con permisos de deploy |
| `AWS_SECRET_ACCESS_KEY` | Secret Key correspondiente |
| `AWS_ACCOUNT_ID` | ID de tu cuenta AWS (12 dígitos) |
| `AWS_BACKEND_REGION` | Región para el backend (default: `us-east-2`) |

> ⚠️ Sin Node.js en el pipeline. CDK corre via Docker (`public.ecr.aws/aws-cdk/cli`).

### Disparo

- **Automático**: push a `main` o `master`.
- **Manual**: GitHub UI → Actions → Deploy Sales Website → Run workflow.

### Flujo

1. **Validate** — `cdk synth` via Docker.
2. **Bootstrap** — CDK bootstrap en us-east-1 y backend region.
3. **Deploy** — backend stack + frontend stack via Docker.
4. **Sync** — `aws s3 sync ./frontend` al bucket.
5. **Invalidate** — `aws cloudfront create-invalidation /*`.

Ver [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

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
- [Devcontainer](.devcontainer/devcontainer.json)
- [Deploy script](scripts/deploy.py)
