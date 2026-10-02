# Publicación SEO — RepuestosCel

## Objetivo técnico aplicado

El objetivo no es prometer una posición concreta en Google —ningún sitio puede garantizarla—, sino eliminar los impedimentos que hacían que Google solo pudiera indexar la portada.

Los cambios preparados incorporan:

- Una URL canónica rastreable por cada producto: `/productos/<nombre>-<id>`.
- HTML renderizado en servidor con título, descripción, imagen, compatibilidades, precio y disponibilidad leídos del catálogo activo.
- Datos estructurados `Product` y `Offer` que reflejan el precio, URL y disponibilidad reales.
- Un sitemap dinámico en `https://repuestoscel.com/sitemap.xml`, con portada y fichas activas.
- Metadatos, canonical y `SearchAction` de la portada centrados en “repuestos para celulares en Colombia”.
- Enlace desde la ficha indexable al catálogo transaccional con la búsqueda del producto aplicada.

No se incluyen ofertas, garantías, envíos, marcas de fabricante ni condiciones no verificadas.

## Archivos que se despliegan

- `frontend/index.html`
- `frontend/js/app.js`
- `infra/cdk/lambda_src/api_handler.py.tmpl`
- `infra/cdk/stacks/backend_stack.py`
- `infra/cdk/stacks/frontend_stack.py`
- `infra/cdk/app.py`

## Validación ya realizada

- Compilación de Python del Lambda y del script de despliegue.
- Validación sintáctica de JavaScript.
- Prueba de humo del HTML de producto y sitemap con un catálogo simulado.
- `cdk synth` con rutas API Gateway y comportamientos CloudFront para `productos/*` y `sitemap.xml`.

## Bloqueo actual de despliegue

La credencial local `arn:aws:iam::203918882873:user/Lupe` puede consultar la identidad pero no tiene permiso de `ssm:GetParameter` sobre `/cdk-bootstrap/hnb659fds/version` ni de asumir el rol CDK de despliegue. Por ello el deploy directo no alcanzó a modificar AWS.

Para publicar desde un entorno con permisos de despliegue, usar el pipeline de GitHub o ejecutar:

```bash
cd infra/cdk
cdk deploy sales-website-dev-backend \
  --context environment=dev \
  --context backend_region=us-east-1 \
  --context domain_names=repuestoscel.com,www.repuestoscel.com \
  --context allowed_origins=https://repuestoscel.com,https://www.repuestoscel.com,https://d1ag0uf6e1dp20.cloudfront.net \
  --context enable_backend=true \
  --require-approval never

cdk deploy sales-website-dev-frontend \
  --context environment=dev \
  --context backend_region=us-east-1 \
  --context domain_names=repuestoscel.com,www.repuestoscel.com \
  --context allowed_origins=https://repuestoscel.com,https://www.repuestoscel.com,https://d1ag0uf6e1dp20.cloudfront.net \
  --context enable_backend=true \
  --require-approval never
```

El árbol de trabajo actual contiene cambios no confirmados fuera de SEO. Revísalos o confirma cuáles incluir antes de hacer commit/push.

## Verificación posterior al deploy

```bash
curl -sS https://repuestoscel.com/robots.txt
curl -sS https://repuestoscel.com/sitemap.xml
curl -sSI https://repuestoscel.com/productos/<slug-del-sitemap>
```

Después, registrar el sitemap en Google Search Console y usar Inspección de URL sobre la portada y dos fichas. La indexación y el ranking pueden tardar días o semanas; medir impresiones, consultas y páginas indexadas en Search Console antes de concluir resultados.
