# Developer Report — Backoffice Frontend (SPA)

## Resumen

Se creó el frontend SPA del backoffice de RepuestosCel en la carpeta `backoffice/`. Es una aplicación de una sola página (SPA) construida con HTML, CSS y JavaScript vanilla — sin frameworks ni librerías externas.

## Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `backoffice/index.html` | SPA shell con sidebar, login page, y carga de scripts |
| `backoffice/css/style.css` | Estilos oscuros consistentes con la landing (Inter, glassmorphism, variables CSS) |
| `backoffice/js/config.js` | Configuración global (`API_BASE_URL`, `API_KEY`) |
| `backoffice/js/api.js` | Cliente HTTP con fetch, headers de auth, manejo de 401 |
| `backoffice/js/auth.js` | Módulo de autenticación (login/logout/token) |
| `backoffice/js/app.js` | Router SPA basado en hash + controladores de páginas |

## Funcionalidades implementadas

### Login (`#/login`)
- Formulario usuario + contraseña
- Consume `POST /api/admin/login`
- Guarda token en `localStorage`
- Redirige al dashboard al autenticarse
- Muestra errores de credenciales

### Dashboard (`#/dashboard`)
- Consume `GET /api/admin/dashboard`
- 4 cards: Total Productos, Total Leads, Cotizaciones, Cotizaciones Recientes
- Tabla con las 5 últimas cotizaciones

### Productos (`#/products`)
- Consume `GET /api/admin/products`
- Tabla con columnas: Nombre, Precio, Categoría, Stock, Estado, Acciones
- Filtro por categoría (dropdown dinámico)
- Modal para crear/editar producto (formulario completo)
- Botón eliminar con confirmación (soft-delete)
- Productos eliminados se muestran tachados

### Leads (`#/leads`)
- Consume `GET /api/admin/leads`
- Tabla con indicador visual de contactado (círculo verde/gris)
- Botón "Marcar Contactado" → `PUT /api/admin/leads/{id}`

### Cotizaciones (`#/quotes`)
- Consume `GET /api/admin/quotes`
- Select dropdown para cambiar estado (pending → contacted → closed)
- Guarda cambios al seleccionar nueva opción

## Diseño

- **Tema oscuro** idéntico a la landing (`#0a0a0f`, `#f5f5f7`, `#86868b`)
- **Tipografía Inter** (misma que la landing)
- **Glassmorphism** en cards y modales
- **Sidebar fijo** a la izquierda (260px), contenido a la derecha
- **Responsive**: sidebar colapsable en mobile con toggle
- **Botones pill** con gradientes
- **Transiciones suaves** en todos los elementos interactivos
- **Iconos Unicode** (sin librerías externas)

## API consumida

| Método | Ruta | Uso |
|--------|------|-----|
| POST | `/api/admin/login` | Login |
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET | `/api/admin/products` | Listar productos |
| POST | `/api/admin/products` | Crear producto |
| PUT | `/api/admin/products/{id}` | Actualizar producto |
| DELETE | `/api/admin/products/{id}` | Soft-delete producto |
| GET | `/api/admin/leads` | Listar leads |
| PUT | `/api/admin/leads/{id}` | Marcar lead contactado |
| GET | `/api/admin/quotes` | Listar cotizaciones |
| PUT | `/api/admin/quotes/{id}` | Actualizar estado de cotización |

## Consideraciones

- La URL base de la API es configurable vía `CONFIG.API_BASE_URL` (vació por defecto = mismo dominio)
- El API Key se envía en cada request via header `x-api-key`
- Tokens expirados redirigen automáticamente al login (manejo de 401)
- Todos los strings se escapan para prevenir XSS
- Sin dependencias externas — listo para deploy directo a S3 + CloudFront
