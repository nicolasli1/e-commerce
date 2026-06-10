# DevOps Report — Infraestructura Backoffice RepuestosCel

**Fecha:** 2026-05-03
**Autor:** DevOps (subagent)

## Resumen de Cambios

Se preparó la infraestructura completa de CloudFormation + CDK para el backoffice de RepuestosCel, siguiendo el plan definido en `docs/backoffice-plan.md`.

---

## 1. CloudFormation (`infra/cloudformation/sales-website.yaml`)

### Tablas DynamoDB nuevas
- **`products`** — PK: `productId` (String). Billing: PAY_PER_REQUEST. SSE y Point-in-Time Recovery habilitados.
- **`quotes`** — PK: `quoteId` (String). Misma configuración.
- **`leads`** — Ya existía (PK: `id`). Se actualizó el IAM Role para incluir permisos de lectura/escritura.

### Rutas API Gateway nuevas (`/api/admin/*`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/admin/login` | Autenticación (retorna token Bearer) |
| GET | `/api/admin/products` | Listar productos |
| POST | `/api/admin/products` | Crear producto |
| PUT | `/api/admin/products/{productId}` | Actualizar producto |
| DELETE | `/api/admin/products/{productId}` | Soft-delete producto |
| GET | `/api/admin/leads` | Listar leads |
| PUT | `/api/admin/leads/{leadId}` | Marcar como contactado / agregar notas |
| GET | `/api/admin/quotes` | Listar cotizaciones |
| PUT | `/api/admin/quotes/{quoteId}` | Cambiar estado / agregar notas |

### CloudFront Function — `AdminAuthFunction`
- Asociada al cache behavior `admin/*` (evento: viewer-request).
- Valida cookie de sesión `session`.
- Si no hay cookie → redirige a `/admin/login`.
- Rutas públicas: `/admin/login`, `/admin/assets/`.

### IAM Role actualizado
- Permisos completos (PutItem, GetItem, Scan, UpdateItem, DeleteItem) para las tres tablas DynamoDB.
- Se crearon policies separadas para leads, products y quotes.

### Bucket Policy
- Ya permitía acceso CloudFront a `/*`. Se mantiene igual (el backoffice SPA se sirve bajo `/admin/*` desde S3).

### Parámetros nuevos
- `AdminSessionSecret` — secreto para firmar tokens JWT-like en la Lambda.

### Lambda actualizada
- Runtime: Python 3.12, Timeout: 30s (antes 10s).
- Handler expandido con:
  - Autenticación HMAC + base64 (token estilo JWT sin librerías externas).
  - CRUD completo de productos (soft-delete con status "deleted").
  - Listado y actualización de leads (contactado, notas).
  - Listado y actualización de cotizaciones (status, notas).
- Validación de token Bearer vía header `Authorization` para rutas `/api/admin/*`.

---

## 2. CDK (`infra/cdk/stacks/`)

### `backend_stack.py` — Actualizado
- Tablas: `LeadsTable`, `ProductsTable`, `QuotesTable`.
- Routas admin en API Gateway: todas las listadas arriba.
- `grant_read_write_data` para las 3 tablas.
- Lambda con código inline expandido (idéntico en funcionalidad al de CloudFormation).
- Environment variables: `LEADS_TABLE`, `PRODUCTS_TABLE`, `QUOTES_TABLE`, `ADMIN_SESSION_SECRET`.
- Outputs: `ProductsTableName`, `QuotesTableName`.

### `frontend_stack.py` — Actualizado
- `AdminAuthFunction` — CloudFront Function publicada desde archivo `cloudfront-functions/admin-auth.js`.
- Cache behavior `admin/*` con:
  - Origen S3.
  - Security headers policy.
  - CloudFront Function association (viewer-request).
  - Cookies forwards: all (necesario para session cookie).
  - Query string forwards: true.
- Output: `AdminAuthFunctionArn`.

### Archivo nuevo
- `infra/cdk/cloudfront-functions/admin-auth.js` — CloudFront Function para validación de cookie de sesión.

---

## 3. Commits realizados

| Archivo | Cambio |
|---------|--------|
| `infra/cloudformation/sales-website.yaml` | Tablas + rutas admin + CloudFront Function + Lambda expandida + IAM + parámetro secreto |
| `infra/cdk/stacks/backend_stack.py` | Tablas + rutas admin + permisos + Lambda expandida |
| `infra/cdk/stacks/frontend_stack.py` | CloudFront Function + cache behavior admin + output |
| `infra/cdk/cloudfront-functions/admin-auth.js` | CloudFront Function (nuevo) |
| `docs/devops-report.md` | Este reporte |

---

## Notas para el Developer

1. **Endpoint**: Las rutas admin están bajo `/api/admin/*` en el mismo API Gateway existente.
2. **Auth**: Login en `POST /api/admin/login` → retorna `{ token: "payload.sig" }`. Enviar como `Authorization: Bearer <token>`.
3. **Frontend**: El backoffice SPA debe desplegarse en S3 bajo la carpeta `/admin/` (e.g., `s3://bucket/admin/`).
4. **Credenciales**: Actualizar `AdminSessionSecret` (Parameter Store en prod) y las credenciales admin (actualmente hardcodeadas como placeholder).
5. **Lambda**: El código inline en CloudFormation usa `AdminSessionSecret` desde environment variable. En CDK es placeholder — reemplazar en producción.
