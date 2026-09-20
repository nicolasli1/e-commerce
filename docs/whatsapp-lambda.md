# Avisos de pedidos por WhatsApp desde AWS Lambda

Investigación: 19 de septiembre de 2026. Propuesta, **no habilitada ni desplegada**.

## Opción recomendada para esta arquitectura

Sí: una Lambda puede enviar WhatsApp mediante **AWS End User Messaging Social**, usando el cliente boto3 `socialmessaging` y la operación `send_whatsapp_message`. No es envío SMS de SNS ni una sesión automatizada de WhatsApp Web. La Lambda existente `sales-website-dev-api` ya procesa eventos de pedidos y correos, pero no envía WhatsApp.

Arquitectura propuesta: pago Wompi verificado → evento durable del pedido → SQS → Lambda de notificaciones → End User Messaging Social → dos destinatarios de la tienda. Separar el envío del webhook de pago para que un fallo de mensajería no afecte al cobro.

El propietario confirmó que solo utiliza Wompi; Mercado Pago y Nequi directo no forman parte del lanzamiento. Los métodos que aparezcan dentro de Wompi son gestionados por esa pasarela.

## Qué hace falta antes de activar

1. Vincular una cuenta WhatsApp Business (WABA) y un número remitente a AWS. Los dos teléfonos de recepción indicados por el propietario no sustituyen esta alta.
2. Confirmar permiso de los receptores y obtener aprobación de la plantilla. No asumir aprobación ni categoría de facturación para alertas internas.
3. Configurar región admitida, ID del remitente, versión vigente de Meta, nombre/idioma de plantilla y destinatarios desde parámetros del backend; no incluir números internos o credenciales en el frontend.
4. Autorizar a la Lambda únicamente el envío desde el recurso requerido; configurar destino de eventos para estados de entrega, alarmas y presupuesto.
5. Confirmar precios actuales antes de habilitar facturación. No se activó ningún servicio ni se enviaron mensajes en esta entrega.

## Ejemplo mínimo del envío

Este ejemplo muestra la llamada de SDK, no un worker listo para producción. `reference` debe proceder de un pedido aprobado y validado por backend; `recipient` debe salir de una lista configurada, nunca del request público de checkout.

```python
import json
import os
import boto3

client = boto3.client("socialmessaging")

def send_order_alert(reference, recipient):
    message = {
        "messaging_product": "whatsapp",
        "to": recipient,
        "type": "template",
        "template": {
            "name": os.environ["WHATSAPP_TEMPLATE_NAME"],
            "language": {"code": os.environ["WHATSAPP_TEMPLATE_LANGUAGE"]},
            "components": [{"type": "body", "parameters": [
                {"type": "text", "text": reference}
            ]}],
        },
    }
    return client.send_whatsapp_message(
        originationPhoneNumberId=os.environ["WHATSAPP_ORIGINATION_PHONE_NUMBER_ID"],
        metaApiVersion=os.environ["META_API_VERSION"],
        message=json.dumps(message).encode("utf-8"),
    )["messageId"]
```

La plantilla aprobada de este ejemplo debe tener exactamente un parámetro de cuerpo. Se puede diseñar otra con referencia, estado del pago, total e instalación. El ID de mensaje significa aceptación del envío, no entrega confirmada.

## Fiabilidad y pruebas

- Persistir el evento junto con la transición de pago; prevenir pérdida entre confirmar el pedido y encolarlo.
- Deduplicar por pedido, tipo de evento y destinatario. Procesar cada receptor independientemente.
- Registrar intentos, ID del proveedor y estados; manejar los timeouts ambiguos sin prometer entrega exactamente una vez.
- Reintentos con espera progresiva, cola de mensajes fallidos y alertas. Mantener correo independiente.
- Solo comunicar «pagado» tras verificación Wompi en servidor. No usar el retorno del navegador como prueba de pago.
- No enviar direcciones ni datos personales innecesarios; dirigir al backoffice autenticado.
- Probar duplicados, destinatario no disponible, credenciales/permisos inválidos y estado de entrega. Tests automáticos con transporte simulado; pruebas reales solo coordinadas.

## Fuentes oficiales

- [Envío de mensajes y requisitos WABA/consentimiento/ventana de atención](https://docs.aws.amazon.com/social-messaging/latest/userguide/whatsapp-send-message.html).
- [Plantillas en AWS End User Messaging Social](https://docs.aws.amazon.com/social-messaging/latest/userguide/managing-templates.html).
- [Contrato boto3 de send_whatsapp_message](https://docs.aws.amazon.com/boto3/latest/reference/services/socialmessaging/client/send_whatsapp_message.html).

Fuera de la ventana de atención se necesita plantilla aprobada. Registrar destinos de eventos permite conocer entregas fallidas; no basta con que la llamada Lambda termine correctamente.
