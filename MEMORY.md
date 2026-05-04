# MEMORY.md — NexCore Sales Website

## Identity

- **Brand**: NexCore — Componentes Tecnológicos
- **Category**: E-commerce de componentes de PC (CPUs, GPUs, RAM, almacenamiento, PSU, refrigeración)
- **Stack**: AWS serverless (S3 + CloudFront + WAF + API Gateway HTTP + Lambda + DynamoDB)
- **Infra**: CDK (Python) primary, CloudFormation fallback
- **CI/CD**: GitHub Actions
- **Auth**: HMAC-based JWT-like tokens (custom, no librerías externas)
- **Secrets**: SSM Parameter Store (SecureString) — no secrets hardcodeados

## Project Status (2026-05-04)

### ✅ Done (v1 code-complete, improvements applied)

#### Frontend
- Landing page (`/frontend/index.html`) — dark theme, glassmorphism, Inter font
- Backoffice SPA (`/backoffice/`) — vanilla JS, hash router, CRUD admin
- CloudFront Function for SPA routing (`/admin/*` → `/admin/index.html`)
- Security headers (CSP, HSTS, XSS, frame-options, etc.)

#### Backend
- Lambda Python 3.12 con CRUD completo: productos, leads, quotes
- 3 tablas DynamoDB con SSE + Point-in-Time Recovery
- API Gateway HTTP v2 con CORS
- **POST /api/quotes** — New public endpoint for pricing quotes
- Secrets leídos desde SSM Parameter Store con caché (15 min TTL)
- Fallback a valores dev para desarrollo local

#### Infraestructura CDK
- `FrontendStack` — S3 + CloudFront + WAF + CloudFront Function + CloudWatch dashboard
- `BackendStack` — API Gateway + Lambda + DynamoDB + SSM + CloudWatch dashboard + alarmas
- CloudFront logging habilitado
- S3 lifecycle rules (noncurrent version expiration 30d)
- WAF con AWS managed rules + rate limiting (2000 req/5min)

#### CloudFormation
- `infra/cloudformation/sales-website.yaml` — fallback template, actualizado con SSM secrets + dashboards + quotes endpoint

#### CI/CD
- GitHub Actions: validate (CDK synth + unit tests) → deploy (secrets → bootstrap → backend → frontend → sync → invalidate)
- Secrets management via `scripts/deploy.py secrets create|rotate`

#### Deploy Script
- `scripts/deploy.py` — Python wrapper around CDK vía npx
- Comandos: synth, bootstrap, deploy, destroy, outputs, **secrets**
- SSM secrets auto-generados (password token 24 chars, session secret 64 hex)

#### Tests
- Unit tests (auth + CRUD con moto) — **pasando**
- E2E tests (requieren deploy para ejecutarse)

### ✅ Correcciones aplicadas
1. **CloudFormation — S3 circular dependency resuelta**: Se agregó `LogsBucket` separado para logs de CloudFront, rompiendo el ciclo S3 → CloudFront → S3.
2. **CloudFormation — ForwardedValues eliminados**: Se reemplazó por Cache Policies modernas (CachingOptimized para S3, CachingDisabled para API).
3. **CloudFormation — OriginRequestPolicy**: API origin usa `AllViewerExceptHostHeader` para pasar headers de auth.
4. **Cost Optimization**: S3 lifecycle → STANDARD_IA a los 90 días, Lambda ReservedConcurrency = 10, Logs expiran a los 90 días.
5. **Deploy script CloudFormation**: `scripts/deploy-cfn.sh` — create/update/delete/describe/list/validate/sync/create-secrets.
6. **CI/CD CloudFormation**: `.github/workflows/deploy-cfn.yml` — validate con cfn-lint + deploy CFn + sync S3 + invalidate CF.

### ❌ Bloqueantes restantes
1. **NUNCA desplegado en AWS** — Commit c466c02 + 434c9a4 en master, pipeline listo, pero aun no deployado exitosamente
2. **Sin dominio personalizado** — CloudFront default domain (v2)
3. **Sin SES notificaciones** — Leads van a DynamoDB pero nadie recibe email (v2)

### 🐛 Errores corregidos en deploy
1. **CloudFront logging apuntaba al mismo S3 que el website** → Crea `LogsBucket` separado con ACL permissions para CloudFront. El CFn ya lo tenia correcto, el CDK estaba mal. Fix en commit 434c9a4.

## Architecture

```
Usuario ──► CloudFront ──┬──► S3 (static: frontend + backoffice/admin)
                         │
                         └──► API Gateway ──► Lambda ──► DynamoDB
                                              │
                                              └──► SSM Parameter Store (secrets)
```

### Endpoints
| Método | Ruta | Auth | Propósito |
|--------|------|------|-----------|
| GET | /api/health | No | Health check |
| POST | /api/leads | No | Capturar lead |
| POST | /api/quotes | No | Solicitar cotización |
| POST | /api/admin/login | No | Login admin |
| GET | /api/admin/dashboard | Bearer | Dashboard stats |
| GET/POST | /api/admin/products | Bearer | CRUD productos |
| PUT/DELETE | /api/admin/products/{id} | Bearer | CRUD productos |
| GET | /api/admin/leads | Bearer | Listar leads |
| PUT | /api/admin/leads/{id} | Bearer | Marcar contactado |
| GET | /api/admin/quotes | Bearer | Listar quotes |
| PUT | /api/admin/quotes/{id} | Bearer | Actualizar estado |

### SSM Parameter Store Secrets
| Parameter | Type | Descripción |
|-----------|------|-------------|
| `/{project}/{env}/admin-user` | String | Username admin |
| `/{project}/{env}/admin-password` | SecureString | Password admin |
| `/{project}/{env}/admin-session-secret` | SecureString | Firma de tokens |

## Roadmap

| Fase | Estado | Qué incluye |
|------|--------|-------------|
| v1 | ✅ Code complete, mejoras aplicadas, ⬜ sin deploy exitoso | S3 + CloudFront + WAF + API + DynamoDB + CI/CD + Secrets SSM + Dashboards |
| v2 | ⬜ | Dominio personalizado + ACM + SES notificaciones + CloudFront functions mejoradas |
| v3 | ⬜ | Lambdas separadas por dominio + SQS + analytics + API keys |
| v4 | ⬜ | Autenticación avanzada (Cognito) + panel admin mejorado + webhooks |

## Strategic Decisions

1. **Secrets**: SSM Parameter Store (SecureString) con caché en Lambda. Rotación via `deploy.py secrets rotate`.
2. **Auth**: CloudFront Function solo SPA routing. Auth real via Bearer token HMAC en Lambda.
3. **Sin framework**: Backoffice en vanilla JS para zero dependencies.
4. **Lambda única**: Todos los endpoints en una sola función. Separar si hay crecimiento.
5. **Soft-delete**: Productos usan status="deleted"
6. **Monitoreo**: CloudWatch dashboards + alarmas de errores Lambda (SNS email opcional)
