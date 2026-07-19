# Product Gallery Redesign Audit

## Contexto

RepuestosCel vende piezas pequenas y tecnicas: pantallas, baterias, flex, conectores y accesorios de reparacion. En este tipo de compra la foto no es decoracion; es evidencia. El cliente necesita confirmar forma, conector, etiqueta, empaque, estado visual y compatibilidad antes de pagar.

## Referencias revisadas

- Baymard Institute: investigacion de UX ecommerce sobre imagenes de producto y galerias.
- Shopify Help Center: patrones de media/product images en tiendas online.
- Nielsen Norman Group: principios de imagenes de producto para ecommerce.
- iFixit Parts: enfoque de partes de reparacion con calidad, compatibilidad y confianza.
- Patrones observables de Amazon, Mercado Libre, eBay, AliExpress y Apple Store: imagen principal dominante, miniaturas utiles, zoom/enlarge sin tapar la compra, y baja friccion en mobile.

## Problemas encontrados

- La imagen principal competia con un marco pesado y no siempre aprovechaba el area disponible.
- El control de zoom flotaba encima del producto y podia tapar detalles importantes.
- Las miniaturas eran pequenas y poco accionables; parecian imagenes decorativas, no navegacion.
- En desktop el modal se sentia angosto para productos con informacion tecnica y varias variantes.
- En mobile faltaba una interaccion natural de swipe entre fotos cuando no hay zoom activo.
- El cierre, zoom y flechas compartian espacio visual con la foto, bajando la percepcion premium.
- No habia modo de inspeccion real a pantalla completa dentro del detalle.

## Decision de diseno

- Convertir la galeria en una estacion de inspeccion: miniaturas grandes, imagen protagonista, controles separados del producto y fullscreen.
- En desktop usar un layout de miniaturas laterales, como ecommerce maduro, para no consumir altura.
- En mobile mantener miniaturas horizontales y agregar swipe entre imagenes.
- Mantener el look premium oscuro/claro, pero con menos ruido sobre la foto.
- Hacer el zoom mas claro: barra, botones, porcentaje y boton "Ver grande" fuera de la imagen.

## Impacto esperado

- Mas confianza al revisar repuestos tecnicos.
- Menos abandono por dudas visuales.
- Mejor usabilidad en desktop y mobile.
- Mejor accesibilidad por miniaturas en botones, etiquetas ARIA y navegacion con teclado.
