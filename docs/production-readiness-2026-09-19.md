# Preparación para producción — RepuestosCel

Fecha: 19 de septiembre de 2026.

## Dictamen y alcance

**No recomendaría dar por terminado el lanzamiento comercial ni aumentar tráfico de ventas antes de resolver los bloqueantes de pagos, inventario y publicación.** La tienda tiene una base funcional, pero aprobar pruebas de interfaz no demuestra que cobros, existencias y avisos sean fiables.

Esta revisión cubre los flujos principales de frontend, backoffice, Lambda API, carga de imágenes, infraestructura CDK, workflows y pruebas. Es una auditoría de código con reproducciones locales aisladas, no una certificación de seguridad ni una prueba integral de AWS y pasarelas reales.

- Base local: commit `4c90a44`, con cambios anteriores sin commit que se conservaron. El commit más reciente devuelto por la búsqueda de GitHub coincide con esta base; eso no sustituye un fetch de la rama.
- Se intentó `git pull --ff-only origin master`; quedó bloqueado porque `.git/FETCH_HEAD` no es escribible en esta sesión. **No se completó el pull.**
- El frontend, CSP, redirecciones y varias pruebas tienen cambios locales pendientes. Los hallazgos distinguen ese código del estado realmente desplegado, que no se puede inferir solo desde Git.
- Se consultó la página pública y referencias externas. No se crearon pedidos, cobros, usuarios, mensajes ni cambios de infraestructura en producción.
- **WAF permanece sin activar.** No se cambió su configuración; el valor local predeterminado sigue siendo `false`.

## Prioridades antes del lanzamiento

### P0 — Integridad del inventario

Evidencia: `infra/cdk/lambda_src/api_handler.py.tmpl:1400` (`build_order_items`) y `:2131` (`sync_order_inventory`).

1. El carrito comprueba disponibilidad por línea, sin sumar líneas del mismo producto/variante. Dos líneas de una unidad pasan cuando solo queda una.
2. Se descuentan productos uno a uno. Si uno falla, los anteriores ya se descontaron; al reintentar el pedido pueden descontarse otra vez porque no existe una marca atómica por operación.
3. Para variantes se lee y sobrescribe la lista completa; la condición solo comprueba que el producto exista, no que siga teniendo el stock leído. Dos compras simultáneas pueden perder actualizaciones.
4. Contraentrega queda lista para preparación, pero `sync_order_inventory` solo actúa sobre `APPROVED`. Falta una política explícita de reserva para esos pedidos y para pagos pendientes.

Reproducción usando las funciones reales extraídas mediante AST, tablas falsas en memoria y sin llamadas AWS:

```text
Producto A: stock inicial 10. Producto B: sin stock.
Primer intento del pedido A+B: A queda en 9; inventario FAILED.
Reintento del mismo pedido: A queda en 8; inventario FAILED.
Carrito con A repetido: acepta cantidad total 2 con stock disponible 1.
```

Acción: consolidar cantidades por SKU/variante; implementar reserva/descuento transaccional e idempotente junto con la marca del pedido; definir vencimiento/liberación de reservas y reversión por cancelación. No marcar automáticamente el pedido listo para preparar cuando el inventario falla. Probar concurrencia y fallos intermedios.

### P0 — Total enviado a Mercado Pago

Evidencia: API `:2419` (`build_mercadopago_preference`), `:2497` (`create_checkout_session`) y `:2729` (`update_order_from_mercadopago_payment`).

El pedido almacena `subtotal + envío`, pero la preferencia solo incluye el precio de los productos y una dirección; no envía el cargo de envío. La validación posterior sí compara el pago con el total del pedido. Con envío mayor que cero, el flujo puede cobrar menos de lo esperado y dejar un pago real en revisión por importe inconsistente.

Reproducción local de la preferencia: producto de $100.000 COP → items por $100.000, sin `shipments.cost` ni otro concepto de envío.

Acción: un único desglose calculado en servidor para productos, envío e instalación; convertir correctamente entre COP y centavos en cada pasarela; verificar que el total enviado y recibido coincida. Si un método no puede validarse, mantenerlo fuera del lanzamiento hasta completar su prueba sandbox.

### P0 si Nequi está habilitado — Vinculación de la transacción al pedido

Evidencia: API `:2800` (`update_order_from_nequi`) y `:2856` (`get_checkout_order`).

El tracking público admite `transactionId` del solicitante y para Nequi lo usa en lugar del identificador guardado. A diferencia de otros caminos, no se observa una comprobación de igualdad con la transacción original ni de importe/moneda/referencia antes de actualizar el estado.

Reproducción aislada: un pedido con `expected-payment`, consultado con `different-payment`, cambia a `APPROVED` cuando el proveedor simulado devuelve aprobación de esa otra transacción. Esto demuestra la validación faltante en código, **no un fraude ejecutado contra la pasarela real**.

Acción: consultar exclusivamente la transacción asociada al pedido o rechazar cualquier identificador diferente, validar los campos de conciliación disponibles en el contrato real de Nequi y proteger transiciones de estado frente a eventos atrasados/repetidos.

### P0 — Publicación no condicionada a las pruebas

Evidencia: `.github/workflows/deploy.yml:64` y `.github/workflows/e2e.yml:112`.

- El job de despliegue depende de `validate` (CDK synth), no del resultado de las suites funcionales de los otros workflows.
- El comando de UI E2E convierte fallos en éxito con `|| echo`.
- Los push usan entorno `dev` por defecto mientras el despliegue configura los dominios públicos. Hay que confirmar el mapeo actual antes de cambiarlo; renombrar stacks sin migración no es una solución segura.
- El sync del frontend usa `--delete` sobre la raíz del mismo bucket que contiene `/admin/`; puede borrar temporalmente el backoffice antes de volver a subirlo.
- Los assets separados tienen nombres estables y el workflow no declara una estrategia explícita de Cache-Control/versionado para una publicación consistente.

Acción: pipeline único con pruebas bloqueantes sobre el mismo commit, separación explícita de entornos y dominios, publicación que preserve `/admin/`, assets versionados o política de caché coherente, smoke posterior y rollback documentado. No desplegar indiscriminadamente todo el árbol local pendiente.

### P1 — Cuenta de cliente visible, backend incompleto

Evidencia: rutas en `infra/cdk/stacks/backend_stack.py:379`; frontend en `frontend/js/app.js:3595`, `:3640`, `:3684`; handler de API `:3043` hasta el final.

La infraestructura declara `/api/auth/register`, `/api/auth/login`, `/api/auth/me` y `/api/orders`, pero el handler no implementa esos casos. Ejecutar el handler real con eventos de esas cuatro rutas devolvió `404` en todos los casos.

Acción: implementar y probar autenticación/historial completos, o retirar temporalmente esos accesos y lanzar con compra como invitado. Al implementarlos, separar autorización de administrador/cliente; `admin_auth_required` actualmente acepta cualquier sujeto de un token válido. La identidad del pedido debe derivarse del token, no del `userId` enviado libremente por el navegador.

### P1 — Avisos y checkout sin garantías de idempotencia

Evidencia: API `:1570`, `:2211`, `:2297`, `:2497`; `BackendStack` configura autoinvocación asíncrona de Lambda.

- Existen correos de confirmación al cliente y alerta interna para `APPROVED` y `PAY_ON_DELIVERY`. No existe envío automático de WhatsApp en el código revisado.
- Cada solicitud de checkout genera una referencia nueva: falta una clave de idempotencia para dobles clics, reintentos de red y reenvíos.
- El envío de avisos y el posterior guardado de `SENT` no son atómicos; ejecuciones simultáneas pueden duplicar mensajes.
- Los errores de correo se convierten en resultados fallidos, pero la tarea asíncrona puede finalizar con éxito. No se observa cola de mensajes fallidos ni un proceso dedicado de reintento en `BackendStack`.

Acción: evento durable de pedido/pago, cola con reintentos y mensajes fallidos, deduplicación por pedido/evento/destinatario, y estado de entrega por canal. Que falle WhatsApp no debe fallar la compra ni impedir el correo.

### P1 — Protección contra abuso sin depender de WAF

Evidencia: `infra/cdk/cloudfront-functions/rate-limit.js:18` y `:60`; API `:794`.

- El limiter usa un objeto en memoria; no constituye un contador durable entre ejecuciones.
- Lee `request.clientIp`, pero CloudFront Functions expone la IP en `event.viewer.ip`, según la [documentación de AWS](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html).
- El límite especial de login apunta a `/api/auth/login`, no a `/api/admin/login`.
- Una API key distribuida con el frontend no es un secreto ni protege por sí sola contra bots.

Acción: throttling de API Gateway y límites persistentes donde corresponda para login, leads, checkout y consultas a pasarelas; validar también el acceso directo a API Gateway. Confirmar secretos requeridos antes de habilitar cada proveedor. **Estas medidas no requieren activar WAF.**

### P1 — CSP pendiente y carga de imágenes del backoffice

Evidencia: `infra/cdk/stacks/frontend_stack.py:103`, `:419`; `backoffice/js/api.js:165`.

La política CSP local pendiente no admite el origen S3 en `connect-src`; la carga nueva hace un PUT directo a una URL firmada de S3. La misma política se aplica a `/admin/*`. El fallback de imágenes pequeñas puede ocultar el fallo; las grandes no tienen esa alternativa.

Acción: permitir únicamente el origen S3 requerido o cambiar el flujo de subida. Probar en staging con las cabeceras reales, no solo en un servidor estático sin CSP. No ampliar a todos los dominios como solución general.

### P1 — Renderizado seguro y contenido comercial definitivo

- `frontend/js/app.js:2342` y `:2790` interpolan datos de producto en manejadores `onclick` dentro de HTML. `JSON.stringify` no escapa el delimitador de un atributo HTML entre comillas simples. Un apóstrofo puede romperlo; requiere eliminar esos manejadores y usar eventos/datos separados. Revisar también el resto de usos de `innerHTML`. No se hizo una explotación de XSS en producción.
- Las páginas de términos y privacidad conservan notas indicando que deben completarse la identificación legal, vigencia, responsable, domicilio y conservación (`frontend/js/app.js:3329`, `:3342`). Falta sustituir esos textos de borrador por información real validada por el negocio.
- Confirmar catálogo real: compatibilidad por modelo, calidad, fotos, stock, precios, envío, garantías/devoluciones y datos de contacto. No publicar promesas de servicio que todavía no estén definidas.

### P2 — Operación, respaldo y mantenimiento

- Hay retención y recuperación puntual para productos, cotizaciones y pedidos. Verificar restauración real y procedimiento de recuperación; la tabla de leads no declara recuperación puntual.
- No se observan en `BackendStack` alarmas específicas para pedidos sin conciliar, errores de inventario o avisos fallidos. Verificar el estado desplegado y añadir alertas accionables, no solo salud HTTP del sitio.
- Estandarizar el runtime local con Python 3.12 de Lambda/CI y hacer análisis actualizado de dependencias. En esta sesión las unitarias se ejecutaron con Python 3.9.6 y avisos de fin de soporte de boto3. No se realizó un análisis completo de CVE.
- Las pruebas unitarias de auth replican una implementación antigua en lugar de importar el código desplegado; por ejemplo, no prueban el formato actual `sub/exp`. Migrarlas a pruebas del handler real.

## WhatsApp a la tienda: propuesta de implementación

Confirmado por el propietario: dos destinatarios de la tienda, terminados en **4514** y **4291**. Configurar los números completos suministrados en un parámetro de backend; no publicarlos como destinatarios internos en el bundle del frontend.

### Eventos y contenido

1. **Pago confirmado:** enviar cuando la pasarela haya sido verificada en servidor, no al abrir el widget ni al regresar a la web.
2. **Pedido contraentrega recibido:** aviso separado que diga claramente «pendiente de cobro/confirmación»; nunca «pagado».
3. **Instalación solicitada:** incluirla en el aviso del pedido, con ciudad y estado de agenda; no prometer automáticamente una cita.

Ejemplo de contenido a someter a aprobación del proveedor:

> Nuevo pedido {{referencia}} · {{estado_pago}}. Total: {{total}} COP. Destino: {{ciudad}}. Instalación: {{instalacion}}. Revisa los detalles en el panel de pedidos.

Evitar datos personales innecesarios en el mensaje; el enlace de gestión debe exigir login. Una respuesta de API aceptada no significa mensaje entregado: registrar estados del proveedor.

### Diseño técnico y configuración pendiente

- Recomiendo integrar una API oficial (Meta Cloud API; Twilio es una alternativa si ya se dispone de cuenta) mediante un adaptador de backend. No automatizar WhatsApp Web ni depender de que el comprador pulse un enlace `wa.me`.
- Configurar cuenta de WhatsApp Business, remitente habilitado, credenciales en SSM/Secrets Manager, destinatarios y plantilla aprobada. Los teléfonos de destino no sustituyen al remitente; comprobar esa distinción en la cuenta elegida.
- Fuera de la ventana de atención de 24 horas se requiere una plantilla aprobada; no asumir que una alerta interna será aprobada en una categoría concreta sin la revisión del proveedor. Ver [documentación oficial de Twilio](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates).
- Confirmar autorización de los destinatarios para recibir avisos. Revisar tarifas vigentes del proveedor antes de activar facturación; no se estimó un costo por mensaje en esta auditoría.
- Propuesta AWS: evento/outbox persistido con la transición del pedido → SQS → Lambda de notificaciones → proveedor. Manejar duplicados, reintentos por destinatario, timeout ambiguo, callbacks autenticados y cola de mensajes fallidos. No prometer entrega exactamente una vez si el proveedor no ofrece esa garantía.
- Mantener correo como canal independiente y un botón de reintento controlado en backoffice.
- Aceptación: los dos destinatarios reciben el aviso; el fallo de uno no repite el del otro; un webhook duplicado no genera un aviso normal duplicado; pago fallido no se comunica como venta; contraentrega no se comunica como cobrada.

## Instalación opcional — $100.000 COP, solo Bogotá

**Confirmado:** precio deseado de $100.000 COP y disponibilidad únicamente en Bogotá por ahora.

**Pendiente antes de cobrar/publicar condiciones definitivas:** si el precio es por equipo, qué piezas/modelos cubre, inclusiones y exclusiones, taller o domicilio, dirección/zona, horarios y agenda, tratamiento de impuestos, garantía del servicio y qué sucede si la instalación no es viable. No inventar esas condiciones.

### Referencias de otros comercios

- [Samsung Colombia — centros de servicio y precios](https://www.samsung.com/co/centro-de-servicio-samsung/): presenta reparación por modelo y tipo, costo aproximado, impuestos y condiciones. Aplicación aquí: confirmar compatibilidad y alcance antes de ofrecer una tarifa universal.
- [Homecenter — servicios de instalación](https://www.homecenter.com.co/homecenter-co/category/cat11272/servicios-de-instalacion-y-garantias-extendidas/): comercializa la instalación como servicio con precio y unidad, separado de los productos. Aplicación aquí: concepto independiente y visible en el resumen. Es referencia de experiencia de compra, no comparación del precio de reparar un celular.

Las referencias respaldan cómo comunicar/ofrecer el servicio; **no prueban que $100.000 sea el precio de mercado**. Ese importe viene de la decisión del propietario.

### Dónde y cómo mostrarlo

1. Ficha de productos compatibles: bloque compacto junto al precio/compra, «¿Necesitas instalación? Disponible en Bogotá · $100.000 COP», con detalle de condiciones. Evitar añadirlo indiscriminadamente a herramientas o accesorios.
2. Carrito: opción sin preseleccionar, asociada al equipo/producto correspondiente. No multiplicar por todas las piezas si varias pertenecen a un mismo equipo; regla pendiente de confirmar.
3. Checkout: verificar cobertura en servidor, mostrar el cargo separado y reconfirmar cualquier cambio de ciudad. No cobrarlo fuera de Bogotá ni eliminarlo silenciosamente.
4. FAQ/ayuda: explicar cobertura, alcance y agenda. Un banner puede dar visibilidad, pero no reemplaza el selector ni el desglose.
5. Pedido/backoffice/correo/WhatsApp: mostrar si se solicitó instalación y si está pendiente de programación.

Hasta confirmar el alcance, se puede diseñar el bloque y una solicitud de contacto; no asumir que solicitar equivale a contratar o agendar.

### Modelo y pruebas requeridas

- Servicio propio con código, precio de servidor, elegibilidad por producto/modelo, cobertura y cantidad/unidad de cobro definida. No tratarlo como repuesto físico con stock.
- Guardar snapshot del precio/condiciones en el pedido. Propuesta de campo `installationFeeInCents`; $100.000 COP equivalen a **10.000.000** en la convención de centavos de esta API.
- Incluir el servicio en el mismo cálculo que alimenta UI, pedido, pasarela, notificaciones y reembolsos.
- Validar manipulación de precio desde frontend, cambio Bogotá→otra ciudad, productos no elegibles, varios equipos, desistimiento del servicio y compra sin instalación.
- Verificar móvil/escritorio y temas claro/oscuro/sistema, manteniendo «sistema» como valor por defecto.

## Verificaciones realizadas y limitaciones

| Verificación | Resultado de esta sesión |
| --- | --- |
| `python3 -m pytest -q tests/unit` | 24 aprobadas, 13 advertencias de boto3/Python; cobertura limitada |
| Suites locales footer, theme, cart y audit regressions | 49 casos recolectados; no ejecutados: error de permisos al abrir el servidor local; detenido en el primer setup |
| Inventario con fallo parcial y reintento | Doble descuento reproducido con funciones reales y tablas falsas |
| Carrito con SKU repetido | Cantidad superior al stock aceptada en la reproducción |
| Preferencia Mercado Pago | Cargo de envío ausente en payload inspeccionado con transporte simulado |
| Registro, login de cliente, perfil e historial | Handler real devolvió 404 en las cuatro rutas |
| Tracking Nequi con otra transacción | Validación de vinculación faltante reproducida con proveedor simulado |
| Pasarelas reales, entrega de mensajes, cabeceras en staging y recuperación AWS | Pendientes; no certificados |

Las reproducciones ejecutaron funciones extraídas del template mediante AST, sin importar inicializaciones de boto3 ni usar servicios externos. No sustituyen una suite de regresión permanente. No ejecutar indiscriminadamente las suites CRUD contra producción: pueden escribir datos.

## Orden recomendado de trabajo

1. Resolver el acceso de escritura a Git y actualizar de forma segura sin perder cambios pendientes; aislar una rama de release.
2. Corregir inventario, totales, conciliación Nequi e idempotencia; añadir pruebas contra funciones reales y concurrencia.
3. Implementar cuenta de cliente o ocultarla temporalmente; cerrar CSP/subida de imágenes, renderizado seguro y protección contra abuso sin WAF.
4. Definir las condiciones de instalación y activar el proveedor oficial de WhatsApp; desarrollar ambos con configuración por entorno y sin enviar mensajes reales desde tests.
5. Completar contenido comercial y operativo; validar correo, mensajes, pedidos y recuperación en staging.
6. Ejecutar E2E de escritorio/móvil con cabeceras reales, pruebas sandbox de todos los métodos habilitados y despliegue bloqueado ante fallos.
7. Publicar solo después de cumplir esos criterios; realizar una compra de verificación coordinada, con autorización para cobro y devolución, y vigilar errores/stock/entrega de avisos.

No se hizo push, deploy ni activación de WAF como parte de esta revisión.
