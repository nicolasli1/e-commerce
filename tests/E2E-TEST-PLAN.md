# 🧪 RepuestosCel E2E Testing — Plan Maestro

---

## 1. 📦 Recommended Stack

| Tecnología | Por qué |
|-----------|---------|
| **Python 3.12** | Estándar en el proyecto, mismo runtime que Lambda |
| **pytest** | Framework más maduro, plugins, fixtures, CI-ready |
| **Playwright** | Mejor que Selenium: más rápido, auto-wait, networkidle, multi-browser, mobile emulation |
| **pytest-xdist** | Ejecución paralela nativa (-n auto) |
| **pytest-html** | Reportes auto-contenidos con screenshots |
| **pytest-retry** | Reintentos automáticos en tests flaky |
| **requests** | Llamadas API directas sin overhead de navegador |

**Playwright vs Selenium:**
- Playwright: 2-3x más rápido, auto-wait nativo, mejor mobile emulation, network interception
- Selenium: más ecosistema, pero más lento y menos estable para CI
- **Gana Playwright** — más moderno, menos código boilerplate

---

## 2. 📁 Folder Structure

```
tests/e2e/
├── __init__.py
├── conftest.py              # Fixtures globales de pytest
├── config.py                # Configuración centralizada (env vars + defaults)
├── pytest.ini               # Config de pytest
│
├── pages/                   # Page Object Model
│   ├── __init__.py
│   ├── base_page.py         # Clase base con métodos comunes
│   ├── home_page.py         # Homepage / Landing
│   ├── cart_page.py         # Carrito de compras
│   ├── checkout_page.py     # Checkout + pagos
│   └── auth_page.py         # Login / Registro
│
├── utils/
│   ├── __init__.py
│   └── helpers.py           # Generadores de datos, API client, report helpers
│
├── test_smoke.py            # 🔥 Smoke tests (API health, headers, reachability)
├── test_homepage.py         # 🏠 Homepage (hero, stats, categorías, kits, contacto)
├── test_navigation.py       # 🧭 Navegación (rutas, SPA routing, anchors)
├── test_cart.py             # 🛒 Carrito (agregar, persistencia, contador)
├── test_checkout.py         # 💳 Checkout (API + validaciones + seguimiento)
├── test_mobile.py           # 📱 Mobile / Responsive (375px, 768px, 1920px)
├── test_auth.py             # 🔐 Auth (login, registro, recuperación) — próximo sprint
│
├── report/                  # Reportes HTML generados
│   └── e2e-report.html
│
└── screenshots/             # Screenshots automáticos en fallos
    └── FAIL_test_name_*.png
```

---

## 3. 🧪 E2E Test Plan

### Fase 1 — Smoke (siempre, pre-deploy)
| # | Test | Prioridad | Tiempo |
|---|------|-----------|--------|
| 1.1 | Health endpoint responde 200 | 🔴 P0 | ~1s |
| 1.2 | Products endpoint devuelve lista | 🔴 P0 | ~1s |
| 1.3 | Security headers presentes (HSTS, CSP, X-Frame) | 🔴 P0 | ~1s |
| 1.4 | CloudFront cache funcionando | 🟡 P1 | ~1s |
| 1.5 | Gzip compression activa | 🟡 P1 | ~1s |
| 1.6 | HTTP/2 soportado | 🟢 P2 | ~1s |
| 1.7 | CORS headers presentes | 🟡 P1 | ~1s |

### Fase 2 — Homepage (cada deploy)
| # | Test | Prioridad | Tiempo |
|---|------|-----------|--------|
| 2.1 | Hero visible con título y CTA | 🔴 P0 | ~3s |
| 2.2 | Navbar con links funcionales | 🔴 P0 | ~2s |
| 2.3 | Estadísticas visibles (5000+ vendidos, etc.) | 🟡 P1 | ~2s |
| 2.4 | Categorías (≥4) visibles | 🔴 P0 | ~2s |
| 2.5 | Kits section visible | 🟡 P1 | ~2s |
| 2.6 | Formulario de contacto presente | 🟡 P1 | ~2s |
| 2.7 | Footer presente | 🟢 P2 | ~2s |
| 2.8 | Carga < 5s | 🟡 P1 | ~5s |
| 2.9 | Sin imágenes rotas | 🟡 P1 | ~3s |

### Fase 3 — Navegación (cada deploy)
| # | Test | Prioridad | Tiempo |
|---|------|-----------|--------|
| 3.1 | Rutas SPA cargan sin errores | 🔴 P0 | ~3s |
| 3.2 | Carrito se abre al hacer click | 🟡 P1 | ~2s |
| 3.3 | Anchor links hacen smooth scroll | 🟢 P2 | ~2s |
| 3.4 | Rutas inválidas no rompen la app | 🟡 P1 | ~2s |

### Fase 4 — Carrito (cada deploy)
| # | Test | Prioridad | Tiempo |
|---|------|-----------|--------|
| 4.1 | Carrito empieza vacío | 🔴 P0 | ~2s |
| 4.2 | Agregar un producto | 🔴 P0 | ~3s |
| 4.3 | Agregar múltiples productos | 🟡 P1 | ~4s |
| 4.4 | Contador se incrementa | 🟡 P1 | ~2s |
| 4.5 | Total en formato COP | 🟡 P1 | ~2s |
| 4.6 | Carrito persiste entre páginas | 🟡 P1 | ~5s |
| 4.7 | Botón checkout visible | 🔴 P0 | ~2s |

### Fase 5 — Checkout / API (cada deploy)
| # | Test | Prioridad | Tiempo |
|---|------|-----------|--------|
| 5.1 | Crear sesión de checkout | 🔴 P0 | ~3s |
| 5.2 | Respuesta incluye datos de orden | 🔴 P0 | ~3s |
| 5.3 | Mercado Pago: preferenceId + initPoint | 🔴 P0 | ~3s |
| 5.4 | Checkout multi-producto | 🟡 P1 | ~3s |
| 5.5 | Tracking de orden por referencia | 🟡 P1 | ~3s |
| 5.6 | Validación de campos requeridos | 🟡 P1 | ~3s |
| 5.7 | Wompi deshabilitado (error controlado) | 🟡 P1 | ~2s |

### Fase 6 — Mobile (cada release)
| # | Test | Prioridad | Tiempo |
|---|------|-----------|--------|
| 6.1 | Menú hamburguesa visible | 🟡 P1 | ~3s |
| 6.2 | Menú hamburguesa abre/cierra | 🟡 P1 | ~4s |
| 6.3 | Sin scroll horizontal | 🟡 P1 | ~2s |
| 6.4 | Touch targets ≥ 44px | 🟢 P2 | ~3s |
| 6.5 | Carrito funciona en mobile | 🟡 P1 | ~3s |
| 6.6 | Inputs sin zoom (font-size ≥ 16px) | 🟢 P2 | ~2s |

---

## 4. 🚀 Pipeline CI/CD

### Ejecución

```
[Push/PR] → Smoke (1m) → E2E Shard 1 (5m)
                         → E2E Shard 2 (5m) → Consolidar Reporte (30s)
                         → E2E Shard 3 (5m)
```

**Triggers:**
- Push a main/master (con cambios en frontend, backend, tests)
- Pull request a main/master (bloqueante)
- Schedule: cada 4h en horario laboral
- Workflow dispatch manual

**Post-deploy smoke:** Idealmente ejecutar smoke tests **después** del deploy para validar que el sitio está vivo.

### Secrets requeridos en GitHub
| Secret | Propósito |
|--------|-----------|
| `E2E_BASE_URL` | URL del ambiente a testear |
| `E2E_ADMIN_USER` | Usuario admin (para tests auth) |
| `E2E_ADMIN_PASS` | Password admin |
| `E2E_API_KEY` | API Key para endpoints protegidos |

---

## 5. 🏗️ Ambientes

| Ambiente | URL | Propósito |
|----------|-----|-----------|
| **Dev** | cloudfront.net actual | Tests diarios, dev integration |
| **Stage** | (por definir) | Pre-producción, validación final |
| **Prod** | (custom domain) | Smoke tests post-deploy |

**Aislamiento:** Usar datos de prueba dedicados (test user, test product IDs). No modificar datos reales.

---

## 6. 📊 Observabilidad

- **Reportes HTML** auto-contenidos (pytest-html)
- **JUnit XML** para integración con GitHub Actions
- **Screenshots automáticos** en cada fallo
- **Logs claros** con timestamps y niveles
- **Durations** visibles (--durations=10)
- **Trazabilidad**: cada test tiene ID único vinculado al test plan

---

## 7. 🚀 Execution Commands

```bash
# Todo
./run-e2e.sh all

# Smoke rápido
./run-e2e.sh smoke

# Tests de checkout
./run-e2e.sh tag checkout

# Debug con navegador visible
./run-e2e.sh headed

# Archivo específico
./run-e2e.sh file test_cart.py

# Mobile
./run-e2e.sh mobile

# API directa
./run-e2e.sh api

# Shard 1/3
./run-e2e.sh shard 1 3

# Solo instalar dependencias
./run-e2e.sh setup
```

---

## 8. 🏆 Best Practices

1. **Tests independientes** — cada test puede ejecutarse solo
2. **No depender del estado** — cada test crea su propio estado
3. **Timeouts generosos** — 30s default, 45s navegación
4. **Retries en flaky tests** — 2 reintentos automáticos
5. **Screenshots en fallos** — siempre
6. **Logs claros** — emojis + timestamps
7. **Page Object Model** — encapsula selectores, facilita mantenimiento
8. **Un selector por test** — no repetir magic strings
9. **Test data centralizada** — config.py, no hardcodeada
10. **Parallelizable** — xdist + sharding para CI

---

## 9. 📈 Scaling Strategy

| Fase | Cobertura | Cuándo |
|------|-----------|--------|
| **V1 (ahora)** | 30 tests: smoke + homepage + nav + cart + checkout + mobile | 🚀 Listo |
| **V2** | + auth (login, register, forgot password) | Sprint 2 |
| **V3** | + admin backoffice CRUD | Sprint 3 |
| **V4** | + performance (Lighthouse CI) | Mes 2 |
| **V5** | + visual regression (Playwright snapshot) | Mes 3 |
| **V6** | + load testing (locust/k6) | Mes 3+ |

**Total tests V1:** ~30 tests, ~2-3 minutos en paralelo, ~5-8 minutos en secuencial.

---

*Plan diseñado por [main agent] con Playwright + pytest*
*Actualizado: 2026-05-11*
