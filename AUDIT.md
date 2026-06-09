# Auditoría UX/UI y Conversión - NexCore Ecommerce

Fecha: 2026-06-08
Sitio auditado: https://d1ag0uf6e1dp20.cloudfront.net/

## Resumen Ejecutivo

NexCore ya tiene una base visual premium y un catálogo funcional, pero la conversión depende de que el comprador encuentre rápido la pieza correcta. El principal riesgo detectado era que la búsqueda no ocupaba el lugar central de la experiencia y que, ante búsquedas sin match exacto, la página podía sentirse vacía o poco orientadora.

La mejora crítica es tratar la home como una experiencia de descubrimiento tipo marketplace especializado: buscar por modelo, pieza, calidad y compatibilidad debe ser el primer flujo, no una acción secundaria del header.

## Framework y Arquitectura

- Frontend público: SPA estática en `frontend/index.html` con HTML, CSS y JavaScript vanilla.
- Backoffice: aplicación estática separada en `backoffice/index.html`, `backoffice/js/app.js`, `backoffice/js/api.js`, `backoffice/js/auth.js` y `backoffice/css/style.css`.
- Backend: API en AWS Lambda generada desde `infra/cdk/lambda_src/api_handler.py.tmpl`.
- Datos: productos provenientes de API conectada a DynamoDB en el despliegue.
- Componentes compartidos del frontend público: header/nav, hero, buscador, categorías, filtros, product cards, detalle de producto, carrito, checkout, tracking y modales.

## Flujo Evaluado Como Cliente

### Pantalla iPhone

El sitio devuelve resultados relacionados de iPhone/display, lo cual es útil, pero debe explicar si el resultado es exacto o relacionado. También debe evitar duplicidad visual en precios tipo "De de".

### Batería Samsung Galaxy

No hay resultado exacto en el catálogo actual. Antes la experiencia quedaba demasiado cerca de una página vacía. Debe ofrecer rutas de recuperación: buscar "Batería Samsung", "Batería", categoría baterías o contacto para compatibilidad.

### Cámara iPhone Pro

La búsqueda puede encontrar productos de iPhone aunque no sean cámara. Eso reduce confianza si no se distingue intención de pieza. La búsqueda debe respetar la intención "cámara" y no mostrar una pantalla sólo porque comparte modelo, salvo como sugerencia secundaria.

### Puerto de carga Xiaomi Redmi

No hay resultado exacto. La experiencia necesita mapear "puerto de carga" hacia flex/conectores/charging ports y ofrecer búsquedas cercanas.

## UX

### Fricción Para Encontrar Productos

- El buscador estaba disponible, pero no era el elemento dominante del hero.
- El usuario debía interpretar categorías antes de poder expresar su intención real.
- Las búsquedas sin match exacto no guiaban suficientemente hacia alternativas.
- Los filtros no comunicaban volumen disponible por categoría.

### Problemas de Navegación

- El CTA principal decía "Buscar repuesto", pero no abría una búsqueda directa dentro del hero.
- Categorías y filtros existían, pero necesitaban más comportamiento de marketplace.
- El usuario puede perder contexto si busca después de filtrar una categoría.

### Problemas de Búsqueda

- Ranking demasiado permisivo: productos relacionados por marca/modelo podían aparecer aunque la pieza solicitada fuera otra.
- Falta de diferenciación entre coincidencia exacta, relacionada y ausencia real.
- Estado vacío con poca orientación comercial.
- Barra de búsqueda del header y búsqueda contextual necesitaban sincronización.

### Problemas Mobile

- La búsqueda debe ser full width y fácil de tocar.
- Los chips de intención deben envolver correctamente sin apretar la UI.
- El carrito flotante es útil, pero no debe tapar estados importantes de búsqueda.

## UI

### Jerarquía Visual

- El hero comunicaba bien el mensaje "hazlo tú mismo", pero el input de búsqueda no era el centro de gravedad.
- Las cards tenían buena base visual, pero faltaba consistencia para mostrar categoría, stock, calidad y compatibilidad en la misma capa.

### Espaciado

- El diseño general respira mejor que un ecommerce tradicional, pero los flujos de catálogo necesitan densidad útil.
- Los filtros necesitaban conteos para ser más escaneables.

### Tipografía

- La jerarquía del hero es fuerte.
- Los metadatos técnicos en cards deben ser compactos, legibles y consistentes.

### Consistencia Visual

- El sistema claro/oscuro está avanzado.
- Algunos estados técnicos, como vacío y filtros, necesitaban integrarse mejor a ambos temas.

## Conversión

### Elementos Que Reducen Confianza

- Resultados que parecen coincidir pero no respetan la pieza buscada.
- Estados vacíos sin camino claro.
- Información técnica visible de forma incompleta en la card.
- Falta de énfasis en búsqueda por modelo desde el primer viewport.

### Información Faltante o Poco Visible

- Stock disponible en todas las cards.
- Compatibilidad visible desde la card.
- Calidad del repuesto visible incluso cuando el producto tiene variantes.
- Categoría del repuesto visible para escanear rápido.

### Llamados a la Acción

- "Ver catálogo" y búsqueda directa funcionan mejor que pedir al usuario explorar.
- "Ficha técnica" y "Elegir modelo" son CTAs adecuados para repuestos con variantes porque reducen compras equivocadas.

## Riesgos Para Producción

- Falta WAF en CloudFront/API.
- Falta un set amplio de productos reales para probar relevancia por marca y modelo.
- Falta medición de analítica para búsquedas sin resultado.
- Falta prueba de carga ligera sobre API de catálogo y checkout.
- El proyecto sigue siendo un frontend monolítico en `index.html`; funciona, pero a futuro conviene modularizar.
