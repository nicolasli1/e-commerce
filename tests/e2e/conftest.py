"""
Fixtures y configuración global de pytest para tests E2E con Playwright.
"""
import json
import os
import sys
from datetime import datetime
from typing import Dict, Generator, Optional

import pytest
import requests

# Asegurar que podemos importar config desde cualquier working directory
_e2e_dir = os.path.dirname(os.path.abspath(__file__))
if _e2e_dir not in sys.path:
    sys.path.insert(0, _e2e_dir)

from config import config as e2e_cfg  # noqa: E402

# Lazy import: playwright solo se carga cuando se usan fixtures que lo necesitan
def _playwright():
    from playwright.sync_api import sync_playwright as _sync
    return _sync


# ──────────────────────────────────────────────
# Hooks
# ──────────────────────────────────────────────

def pytest_addoption(parser):
    """Opciones custom de CLI para los tests E2E."""
    parser.addoption(
        "--base-url",
        action="store",
        default=e2e_cfg.base_url,
        help="URL base del sitio a testear",
    )
    parser.addoption(
        "--viewport",
        action="store",
        default="desktop",
        choices=["desktop", "tablet", "mobile"],
        help="Viewport para los tests",
    )
    parser.addoption(
        "--headed",
        action="store_true",
        default=False,
        help="Ejecutar navegador con UI visible",
    )


def pytest_configure(config):
    """Setup inicial de pytest."""
    os.makedirs(e2e_cfg.screenshot_dir, exist_ok=True)
    os.makedirs(e2e_cfg.report_dir, exist_ok=True)


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Capturar screenshot automáticamente cuando un test falla."""
    outcome = yield
    report = outcome.get_result()
    if report.when == "call" and report.failed:
        page = item.funcargs.get("page")
        if page:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            test_name = item.nodeid.replace("::", "_").replace("/", "_")
            screenshot_path = os.path.join(
                e2e_cfg.screenshot_dir,
                f"FAIL_{test_name}_{timestamp}.png",
            )
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"\n📸 Screenshot capturado: {screenshot_path}")


# ──────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────

@pytest.fixture(scope="session")
def playwright_instance():
    """Instancia única de Playwright por sesión."""
    sync_pw = _playwright()
    with sync_pw() as pw:
        yield pw


@pytest.fixture(scope="session")
def browser(playwright_instance):
    """Navegador Chromium (headless por defecto)."""
    browser = playwright_instance.chromium.launch(
        headless=e2e_cfg.headless,
        args=[
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
        ],
    )
    yield browser
    browser.close()


@pytest.fixture
def context(browser, request):
    """Contexto del navegador con viewport configurable."""
    viewport_name = request.config.getoption("--viewport", default="desktop")
    vp = e2e_cfg.viewports.get(viewport_name, e2e_cfg.viewports["desktop"])

    context = browser.new_context(
        viewport=vp,
        locale="es-CO",
        timezone_id="America/Bogota",
        permissions=["geolocation"],
        ignore_https_errors=True,
    )
    context.set_default_timeout(e2e_cfg.timeout * 1000)
    context.set_default_navigation_timeout(e2e_cfg.navigation_timeout * 1000)
    yield context
    context.close()


@pytest.fixture
def page(context):
    """Página del navegador lista para usar."""
    page = context.new_page()
    yield page


@pytest.fixture
def base_url(request) -> str:
    """URL base del sitio."""
    return request.config.getoption("--base-url", default=e2e_cfg.base_url)


@pytest.fixture
def api_base(base_url: str) -> str:
    """URL base para llamadas API directas."""
    return base_url


@pytest.fixture
def app(page, base_url: str):
    """Fixture compuesto: navega al sitio."""
    from pages.home_page import HomePage
    home = HomePage(page, base_url)
    home.navigate()
    return {"page": page, "base_url": base_url, "home": home}


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

@pytest.fixture
def api_client():
    """Cliente HTTP para llamadas directas a la API (sin navegador)."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    if e2e_cfg.api_key:
        session.headers["x-api-key"] = e2e_cfg.api_key
    return session


@pytest.fixture
def screenshot_on_fail(page, request):
    """Capturar screenshot en tests específicos cuando fallan."""
    yield
    if request.node.rep_call and request.node.rep_call.failed:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_name = request.node.name
        page.screenshot(
            path=os.path.join(e2e_cfg.screenshot_dir, f"{test_name}_{timestamp}.png"),
            full_page=True,
        )


@pytest.fixture
def test_product_ids() -> list:
    """IDs de productos de prueba."""
    return e2e_cfg.test_product_ids
