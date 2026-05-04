# CDK Architecture – Sales Website

## Estructura del proyecto CDK

```
infra/cdk/
├── app.py                          # Entry point CDK
├── cdk.json                        # Config CDK CLI
├── requirements.txt                # Dependencias Python
├── stacks/
│   ├── __init__.py
│   ├── frontend_stack.py           # S3 + CloudFront + WAF
│   └── backend_stack.py            # API Gateway + Lambda + DynamoDB
```

## Stack frontend (`FrontendStack`)

### Recursos

| Recurso                        | Tipo CDK                    | Notas |
|--------------------------------|-----------------------------|-------|
| S3 Bucket                      | `s3.Bucket` (L2)            | Privado, cifrado, versionado. Auto-destroy en dev. |
| Origin Access Control          | `cloudfront.CfnOriginAccessControl` (L1) | SigV4, always sign. |
| Security Headers Policy        | `cloudfront.ResponseHeadersPolicy` (L2)  | CSP, HSTS, X-Frame-Options, Referrer-Policy, XSS. |
| WAF WebACL                     | `wafv2.CfnWebACL` (L1)     | Scope=CLOUDFRONT. |
| CloudFront Distribution        | `cloudfront.CfnDistribution` (L1) | OAC + WAF + error pages SPA. |
| Bucket Policy                  | `iam.PolicyStatement`       | Solo CloudFront puede leer. |

### WAF – Reglas incluidas

| Prioridad | Nombre | Tipo |
|-----------|--------|------|
| 1 | AWS-AWSManagedRulesCommonRuleSet | Managed (Core rule set: SQLi, XSS, LFI, RCE, etc.) |
| 2 | AWS-AWSManagedRulesSQLiRuleSet   | Managed (SQL injection) |
| 3 | AWS-AWSManagedRulesKnownBadInputsRuleSet | Managed (Known bad inputs) |
| 4 | RateLimit | Rate-based (2000 req / 5 min / IP) |

### Parámetros de entrada

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `project_name` | `str` | `"sales-website"` | Prefijo para nombres de recursos. |
| `environment` | `str` | `"dev"` | Entorno (dev/stage/prod). |
| `price_class` | `str` | `"PriceClass_100"` | CloudFront price class. |
| `api_endpoint` | `str\|None` | `None` | URL del API Gateway (backend). Si se pasa, CloudFront añade el origin `api/*`. |

## Stack backend (`BackendStack`)

### Recursos

| Recurso             | Tipo CDK                     | Notas |
|---------------------|------------------------------|-------|
| DynamoDB Table      | `dynamodb.Table` (L2)        | On-demand, partition key = `id`. |
| Lambda Function     | `lambda_.Function` (L2)      | Python 3.12, inline code, 256 MB, 10s timeout. |
| IAM Role            | (creado por L2)              | Permisos: logs + DynamoDB PutItem. |
| HTTP API            | `apigwv2.HttpApi` (L2)       | CORS abierto. |
| Integration         | `HttpLambdaIntegration` (L2) | Proxy a Lambda. |
| Routes              | `add_routes()`               | `GET /api/health`, `POST /api/leads`. |

### Endpoints de la API

| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| `GET`  | `/api/health` | — | `{"ok": true, "service": "sales-api"}` |
| `POST` | `/api/leads`  | `{"name": "...", "email": "...", "message": "..."}` | `{"ok": true, "leadId": "uuid"}` |

### Parámetros de entrada

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `project_name` | `str` | `"sales-website"` | Prefijo para nombres de recursos. |
| `environment` | `str` | `"dev"` | Entorno (dev/stage/prod). |
| `enable_backend` | `bool` | `True` | Si es `False`, no se crean recursos backend. |

## Referencias cruzadas entre stacks

```
app.py
 ├── BackendStack (región por defecto)
 │    └── api_endpoint ──────────────────────┐
 │                                           ▼
 └── FrontendStack (us-east-1)
      └── api_endpoint → CloudFront API origin + cache behavior
```

- `BackendStack.api_endpoint` se expone como `@property` para que `FrontendStack` lo reciba.
- CDK genera automáticamente `Fn::ImportValue` / `Export` en CloudFormation.
- `frontend.add_dependency(backend)` asegura orden de creación.

## Despliegue con contexto personalizado

```bash
# Desplegar backend en us-east-2 y frontend en us-east-1
cdk deploy --all \
  --context environment=prod \
  --context project_name=acme-sales \
  --context price_class=PriceClass_200

# Solo frontend estático (sin backend, sin Lambda, sin DynamoDB)
cdk deploy acme-sales-prod-frontend \
  --context enable_backend=false

# Ver la plantilla generada sin desplegar
cdk synth
```

## Próximos pasos recomendados

1. **Dominio personalizado**: Añadir `acm.Certificate` en `us-east-1` y pasarlo a `CloudFrontDistribution` con `viewer_certificate`.
2. **Logs de acceso**: Habilitar `cloudfront.LoggingConfiguration` y logs de S3.
3. **CI/CD**: Agregar GitHub Actions que ejecute `cdk deploy` y `aws s3 sync`.
4. **WAF personalizado**: Añadir reglas IP set o geo-match si hay tráfico de regiones específicas.
5. **Separación prod/stage**: Usar Context Parameters para reutilizar el mismo app.py con diferentes entornos.
