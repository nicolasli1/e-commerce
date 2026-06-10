# Backoffice Plan — RepuestosCel

## Objetivo

Crear un panel de administración web (backoffice) para gestionar el e-commerce RepuestosCel desde un solo lugar.

## Stack Técnico

- **Frontend:** SPA Vanilla JS (sin framework) alojada en S3 → CloudFront ruta `/admin/*`
- **Backend:** Lambda (Node.js) con endpoints REST para Admin
- **Auth:** Basic Auth + API Key protegido por CloudFront Functions / Lambda@Edge
- **DB:** DynamoDB (tablas existentes + nuevas para el backoffice)

## Funcionalidades (MVP)

### 1. Gestión de Productos (CRUD)
- Listar productos
- Crear/Editar producto (nombre, descripción, precio, categoría, imagen URL, stock)
- Eliminar producto (soft-delete)
- Ordenar/filtrar por categoría, precio, stock

### 2. Gestión de Leads
- Ver leads capturados desde el formulario de la landing
- Marcar como contactado
- Exportar a CSV

### 3. Gestión de Órdenes / Cotizaciones
- Visualizar cotizaciones solicitadas
- Cambiar estado (pendiente, contactado, cerrada)

### 4. Dashboard (v1 simple)
- Total de productos
- Total de leads
- Últimas cotizaciones
- Gráfica simple de leads por día (opcional)

## Arquitectura

```
/admin/*  →  CloudFront  →  S3 (backoffice SPA)
/api/admin/*  →  CloudFront  →  API Gateway HTTP API  →  Lambda (Admin)
```

**Protección:**
- CloudFront Function valida una cookie/token de sesión
- API Gateway valida API Key en el header `x-api-key`
- Login básico: formulario en `/admin/login` → valida contra credenciales en Parameter Store

## Tablas DynamoDB

| Tabla | Clave | Atributos |
|-------|-------|-----------|
| `products` | PK: `productId` | name, description, price, category, imageUrl, stock, createdAt, updatedAt, status |
| `leads` | PK: `leadId` | name, email, message, source, contacted, createdAt |
| `quotes` | PK: `quoteId` | name, email, plan, status, notes, createdAt |

## Plan de Trabajo

### Fase 1 — Backend (Developer)
1. Crear Lambda de Admin con endpoints CRUD para productos
2. Crear endpoints para leads (listar, marcar contactado)
3. Crear endpoints para cotizaciones
4. Añadir validación de API Key
5. Actualizar API Gateway con nuevas rutas

### Fase 2 — Backoffice Frontend (Developer)
1. Crear SPA en `/backoffice/` con HTML+CSS+JS vanilla
2. Login page
3. Dashboard page
4. Products CRUD (tabla + formularios)
5. Leads list + acciones
6. Quotes list + acciones

### Fase 3 — Infraestructura (DevOps)
1. Actualizar CloudFormation/CDK para:
   - Nuevo bucket policy para backoffice SPA
   - Nuevas rutas en API Gateway
   - Permisos Lambda para nuevas tablas DynamoDB
   - CloudFront Function para auth en /admin
   - Deploy automatizado del backoffice

## Dependencias

1. DevOps debe tener las tablas DynamoDB y rutas de API listas primero
2. Developer necesita confirmación de rutas API para el frontend
3. Integración final: Developer entrega, DevOps despliega

## Siguientes Pasos

1. ✅ CEO escribe este plan
2. ✅ Developer: implementa backend (Lambdas) — código inline en backend_stack.py
3. ✅ Developer: implementa frontend (SPA backoffice) — en /backoffice/
4. ✅ CEO: arregla CloudFront Function (pass-through, no cookie) + placeholders
5. ⬜ **DEV-OPS: Desplegar TODO** (backend stack + frontend stack + sync backoffice + invalidate CF)
