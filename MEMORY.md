# MEMORY.md — RepuestosCel Sales Website

## Identity

- **Brand**: RepuestosCel — Repuestos para Celulares
- **Category**: E-commerce de repuestos y accesorios para celulares
- **Stack**: AWS serverless (S3 + CloudFront + API Gateway HTTP + Lambda + DynamoDB)
- **Infra**: CDK (Python) primary, CloudFormation fallback
- **CI/CD**: GitHub Actions (validate → deploy backend → deploy frontend → sync S3 → invalidate CF)
- **Auth**: HMAC-based JWT-like tokens (custom, no librerías externas)
- **Secrets**: SSM Parameter Store (SecureString) — no secrets hardcodeados
- **Payment Gateways**: Wompi (widget) + Mercado Pago (Checkout Pro)
- **Notifications**: SES (customer confirmation + internal order alerts)

## Current State (2026-05-05)

### What exists NOW (v2 — post pivot)

#### Frontend (`/frontend/index.html`)
- ✅ **Landing page** — Dark theme, glassmorphism, Inter font, 902 líneas
- ✅ **Hero "Reparación de Celulares"** — Ahora orientado a repuestos, no PC components
- ✅ **Catálogo dinámico** — Productos cargados desde `GET /api/products`
- ✅ **Carrito de compras** — Modal con items, cantidades, total en COP
- ✅ **Checkout** — Modal con formulario de datos + selección de método de pago
- ✅ **Integración Wompi** — Widget de pagos embebido (frame-src)
- ✅ **Integración Mercado Pago** — Checkout Pro redirect
- ✅ **Precios en COP** — Todo el pricing en pesos colombianos

#### Backoffice (`/backoffice/`)
- ✅ SPA vanilla JS con hash router
- ✅ **Login** (#/login) — Auth via Bearer token
- ✅ **Dashboard** (#/dashboard) — Stats: productos, leads, quotes, **órdenes**
- ✅ **Productos** (#/products) — CRUD con modal, filtro por categoría, soft-delete
- ✅ **Leads** (#/leads) — Lista + marcar contactado
- ✅ **Quotes** (#/quotes) — Lista + cambio de estado
- ✅ **Órdenes/Pedidos** (#/orders) — Gestión completa:
  - Tabla con estado de pago + estado de despacho
  - Modal de gestión: actualizar fulfillmentStatus, courier, tracking number, notas
  - Formato COP desde centavos

#### Backend Lambda (`infra/cdk/lambda_src/api_handler.py.tmpl` — 1192 líneas)
- ✅ **Lambda Python 3.12** con todas las rutas en una sola función
- ✅ **DecimalEncoder** — Correctamente implementado para DynamoDB Decimal
- ✅ **4 tablas DynamoDB**: `leads`, `products`, `quotes`, `orders`
- ✅ **Public endpoints**:
  - `GET /api/health` — Health check
  - `GET /api/products` — Listar productos públicos (activos)
  - `POST /api/leads` — Capturar lead
  - `POST /api/checkout/session` — Crear sesión de checkout
  - `GET /api/checkout/orders/{reference}` — Consultar orden post-pago
  - `POST /api/webhooks/wompi` — Webhook de Wompi
  - `POST /api/webhooks/mercadopago` — Webhook de Mercado Pago
- ✅ **Admin endpoints** (Bearer token):
  - `POST /api/admin/login` — Login HMAC
  - `GET /api/admin/dashboard` — Dashboard stats (incluye totalOrders, readyToFulfillOrders)
  - `GET/POST /api/admin/products` — CRUD productos
  - `PUT/DELETE /api/admin/products/{id}` — CRUD productos
  - `GET /api/admin/leads` — Listar leads
  - `PUT /api/admin/leads/{id}` — Marcar contactado
  - `GET /api/admin/quotes` — Listar quotes
  - `PUT /api/admin/quotes/{id}` — Actualizar estado
  - `GET /api/admin/orders` — Listar órdenes
  - `PUT /api/admin/orders/{reference}` — Actualizar fulfillment
- ✅ **Integración Wompi**:
  - Generación de signature (integrity)
  - Webhook handler con verificación X-Event-Checksum
  - Post-payment side effects: actualizar estado, notificar
- ✅ **Integración Mercado Pago**:
  - Creación de preference (Checkout Pro)
  - Webhook handler con verificación X-Signature (HMAC-SHA256)
  - Post-payment side effects
- ✅ **SES Notificaciones**:
  - `send_customer_confirmation()` — Email al comprador con resumen
  - `send_internal_order_alert()` — Alerta al admin con datos del pedido
  - HTML emails con diseño responsive
- ✅ **SSM Parameter Store** — Todos los secrets vía SSM con caché en Lambda
  - Wompi: public key, integrity secret, events secret
  - Mercado Pago: public key, access token, webhook secret
  - SES: from email, alerts to email
- ✅ **COP pricing** — Funciones `cents_to_cop_units()`, `cents_to_cop_text()`

#### Infraestructura CDK
- ✅ `FrontendStack` — S3 + CloudFront + CloudFront Functions + Security Headers
- ✅ **WAF eliminado** (commit 5814705) — Ya no tiene WAF
- ✅ `BackendStack` — API Gateway HTTP v2 + Lambda + DynamoDB (4 tablas) + IAM + SSM
- ✅ **CORS** — API Gateway con allow_origins ["*"]
- ✅ **Cross-stack references** — Frontend recibe API endpoint del backend

#### CI/CD
- ✅ `.github/workflows/deploy.yml` — Pipeline completa:
  1. Validate: CDK synth
  2. Deploy: bootstrap → backend → frontend → get outputs → sync frontend → sync backoffice → invalidate CloudFront
- ✅ `.github/workflows/test.yml` — Test pipeline
- ✅ `.github/workflows/deploy-cfn.yml` — CloudFormation alternativa

#### Tests
- ✅ `tests/unit/` — Unit tests (auth + CRUD con moto)
- ✅ `tests/e2e/test_cart_ui.py` — E2E tests de carrito con Playwright (desktop + mobile)
- ✅ `tests/qa/test_crud_flows.py` — QA tests contra sitio deployado

#### Deploy Script
- ✅ `scripts/deploy.py` — Python wrapper con comandos: synth, secrets (create/rotate), bootstrap, deploy, destroy, outputs
- ✅ SSM secrets incluyen: admin-user, admin-password, admin-session-secret, wompi-*, mercadopago-*, order-notifications-*

### ❌ Bloqueantes / Pendientes

1. **Sin deploy exitoso verificado** — Código completo pero no sabemos si el pipeline corre exitosamente
2. **Sin dominio personalizado** — CloudFront default domain
3. **Sin WAF** — Fue removido, sin protección contra ataques
4. **Sin SES configurado** — Las notificaciones por email requieren verificar dominio/email en SES (sandbox)
5. **SSM secrets de pago vacíos** — Wompi y Mercado Pago keys no están configuradas (default "")
6. **QA tests no ejecutados** — Requieren URL deployada
7. **Sin monitoreo/alarmas** — CloudWatch dashboards no verificados

## Architecture

```
Usuario ──► CloudFront ──┬──► S3 (static: frontend + backoffice/admin)
                         │
                         └──► API Gateway ──► Lambda ──► DynamoDB (4 tablas)
                                              │
                                              ├──► SSM Parameter Store (secrets)
                                              ├──► SES (notificaciones email)
                                              ├──► Wompi API (pagos)
                                              └──► Mercado Pago API (pagos)
```

### Endpoints Actualizados (v2)

| Método | Ruta | Auth | Propósito |
|--------|------|------|-----------|
| GET | /api/health | No | Health check |
| GET | /api/products | No | Catálogo público |
| POST | /api/leads | No | Capturar lead |
| POST | /api/checkout/session | No | Crear sesión checkout |
| GET | /api/checkout/orders/{ref} | No | Consultar orden |
| POST | /api/webhooks/wompi | No | Webhook Wompi |
| POST | /api/webhooks/mercadopago | No | Webhook MP |
| POST | /api/admin/login | No | Login admin |
| GET | /api/admin/dashboard | Bearer | Dashboard stats |
| GET/POST | /api/admin/products | Bearer | CRUD productos |
| PUT/DELETE | /api/admin/products/{id} | Bearer | CRUD productos |
| GET | /api/admin/leads | Bearer | Listar leads |
| PUT | /api/admin/leads/{id} | Bearer | Marcar contactado |
| GET | /api/admin/quotes | Bearer | Listar quotes |
| PUT | /api/admin/quotes/{id} | Bearer | Actualizar estado |
| GET | /api/admin/orders | Bearer | Listar órdenes |
| PUT | /api/admin/orders/{ref} | Bearer | Actualizar fulfillment |

### SSM Parameter Store Secrets (14 parámetros)

| Parameter | Type | Propósito |
|-----------|------|-----------|
| `/{project}/{env}/admin-user` | String | Usuario admin |
| `/{project}/{env}/admin-password` | SecureString | Password admin |
| `/{project}/{env}/admin-session-secret` | SecureString | Firma tokens |
| `/{project}/{env}/wompi-public-key` | String | Llave pública Wompi |
| `/{project}/{env}/wompi-integrity-secret` | SecureString | Firma integridad Wompi |
| `/{project}/{env}/wompi-events-secret` | SecureString | Verificación webhook Wompi |
| `/{project}/{env}/mercadopago-public-key` | String | Llave pública MP |
| `/{project}/{env}/mercadopago-access-token` | SecureString | Token acceso MP |
| `/{project}/{env}/mercadopago-webhook-secret` | SecureString | Verificación webhook MP |
| `/{project}/{env}/order-notifications-from-email` | String | Email remitente SES |
| `/{project}/{env}/order-alerts-to-email` | String | Email alertas admin |

## Roadmap

| Fase | Estado | Qué incluye |
|------|--------|-------------|
| v1 (original) | ✅ Código legacy (PC components) — reemplazado | S3 + CloudFront + WAF + API + DynamoDB + CI/CD |
| v2 (actual) | ✅ Código completo, ⬜ sin deploy verificado | Carrito + Wompi + MP + Órdenes + SES + Backoffice órdenes |
| v2.1 | ⬜ | Deploy + QA tests + fix bugs |
| v2.2 | ⬜ | Dominio personalizado + ACM + WAF |
| v3 | ⬜ | Lambdas separadas + SQS + analytics + API keys |
| v4 | ⬜ | Cognito auth + webhooks + dashboard avanzado |

## Strategic Decisions

1. **Pivot a celulares**: De componentes PC a repuestos de celulares + servicio técnico
2. **Pagos en COP**: Todo el pricing en pesos colombianos con formato local
3. **Dos gateways**: Wompi (widget embebido) + Mercado Pago (Checkout Pro redirect) — cobertura máxima en Colombia
4. **Secrets SSM**: Nunca hardcodeados. Caché en Lambda con 15 min TTL
5. **Lambda única (monolito)**: Todos los endpoints en una función. Separar cuando crezca
6. **Soft-delete**: Productos con status="deleted"
7. **Sin WAF**: Eliminado para simplificar (riesgo asumido en v2)
8. **Vanilla JS**: Backoffice sin frameworks para zero dependencies
