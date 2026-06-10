# Plan Priorizado - Conversión y Búsqueda RepuestosCel

Fecha: 2026-06-08

## P0 - Impacto Crítico en Conversión

### P0.1 Buscador Principal en el Hero

Estado: implementado.

Convertir el buscador en el elemento principal del primer viewport. El usuario debe poder escribir "Pantalla iPhone", "Batería Samsung Galaxy" o "Puerto de carga Xiaomi Redmi" sin abrir menús adicionales.

Impacto esperado: más usuarios llegan al catálogo correcto desde el primer intento.

### P0.2 Ranking Que Respete la Intención de Pieza

Estado: implementado.

La búsqueda debe distinguir intención de pieza: pantalla, batería, cámara, flex, puerto de carga, tapa, adhesivo o herramienta. Si alguien busca cámara, una pantalla no debe aparecer como resultado principal sólo por coincidir con iPhone.

Impacto esperado: mayor confianza y menos frustración por resultados engañosos.

### P0.3 Estados Vacíos con Recuperación

Estado: implementado.

Cuando no haya coincidencia exacta, mostrar una explicación clara y botones de búsqueda cercana. La página no debe sentirse rota ni vacía.

Impacto esperado: reduce abandono en búsquedas sin stock exacto.

### P0.4 Cards con Datos de Compra Críticos

Estado: implementado.

Cada card debe mostrar stock, categoría, calidad y compatibilidad/modelos disponibles cuando existan.

Impacto esperado: el comprador entiende más rápido si el repuesto le sirve.

## P1 - Impacto Alto en Búsqueda y Descubrimiento

### P1.1 Filtros con Conteo

Estado: implementado.

Mostrar conteo por categoría para que el usuario sepa dónde hay inventario.

Impacto esperado: mejor orientación en catálogo y menos exploración a ciegas.

### P1.2 Sincronizar Buscadores

Estado: implementado.

Hero search, barra superior, chips y estados vacíos deben compartir la misma lógica y estado.

Impacto esperado: una sola experiencia de búsqueda coherente.

### P1.3 Mobile First en Búsqueda

Estado: implementado.

El buscador del hero se adapta a mobile con botón de ancho completo y chips táctiles.

Impacto esperado: menos fricción en el canal más probable de compra.

### P1.4 Medición de Búsquedas sin Resultado

Estado: pendiente.

Registrar queries sin resultado, categoría sugerida y cantidad de productos visibles. Idealmente enviar a CloudWatch o a una tabla simple para alimentar compras de inventario.

Impacto esperado: decidir qué productos cargar primero con datos reales.

## P2 - Mejoras Visuales y de Sistema

### P2.1 Modularizar Frontend

Estado: pendiente.

Separar `frontend/index.html` en módulos o migrar gradualmente a un framework si el producto sigue creciendo.

### P2.2 Página de Producto Más Profunda

Estado: parcial.

Agregar bloques más ricos de instalación, dificultad, herramientas necesarias, garantía y productos relacionados.

### P2.3 Pruebas E2E de Catálogo

Estado: pendiente.

Automatizar pruebas para búsqueda, filtros, detalle, carrito y checkout con productos mock y productos reales de staging.

### P2.4 Seguridad de Producción

Estado: pendiente.

Activar WAF, límites por IP, alertas de errores 4xx/5xx y protección adicional para endpoints admin.

## Criterios de Aceptación

- El hero permite buscar directamente.
- Las búsquedas se aplican al catálogo real.
- Los resultados muestran stock, compatibilidad, calidad y categoría.
- Un resultado vacío muestra alternativas accionables.
- Los filtros muestran conteos.
- La experiencia funciona en desktop y mobile.
- No se introduce regresión en carrito, detalle ni checkout.
