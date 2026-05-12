"""
Fixtures y configuración global de pytest para tests E2E con Playwright.
"""
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Generator, Optional

import pytest
import requests
from _pytest.config import Config
from _pytest.nodes import Item
from _pytest.reports import TestReport
from playwright.sync_api import Browser, BrowserContext, Page, Playwright, sync_playwright

from config import config


# ──────────────────────────────────────────────
# Hooks
# ──────────────────────────────────────────────

def pytest_addoption(parser):
    """Opciones custom de CLI para los tests E2E."""
    parser.addoption(
        "--base-url",
        action="store",
        default=config.base_url,
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


def pytest_configure(config: Config):
    """Setup inicial de pytest."""
    os.makedirs(config.screenshot_dir, exist_ok=True)
    os.makedirs(config.report_dir, exist_ok=True)


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item: Item, call):
    """Capturar screenshot automáticamente cuando un test falla."""
    outcome = yield
    report: TestReport = outcome.get_result()
    if report.when == "call" and report.failed:
        page = item.funcargs.get("page")
        if page:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            test_name = item.nodeid.replace("::", "_").replace("/", "_")
            screenshot_path = os.path.join(
                config.screenshot_dir,
                f"FAIL_{test_name}_{timestamp}.png",
            )
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"\n📸 Screenshot capturado: {screenshot_path}")


# ──────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────

@pytest.fixture(scope="session")
def playwright_instance() -> Generator[Playwright, None, None]:
    """Instancia única de Playwright por sesión."""
    with sync_playwright() as pw:
        yield pw


@pytest.fixture(scope="session")
def browser(playwright_instance: Playwright) -> Generator[Browser, None, None]:
    """Navegador Chromium (headless por defecto)."""
    browser = playwright_instance.chromium.launch(
        headless=config.headless,
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
def context(
    browser: Browser,
    request: pytest.FixtureRequest,
) -> Generator[BrowserContext, None, None]:
    """Contexto del navegador con viewport configurable."""
    viewport_name = request.config.getoption("--viewport", default="desktop")
    vp = config.viewports.get(viewport_name, config.viewports["desktop"])

    context = browser.new_context(
        viewport=vp,
        locale="es-CO",
        timezone_id="America/Bogota",
        permissions=["geolocation"],
        ignore_https_errors=True,
    )

    # Configurar timeouts
    context.set_default_timeout(config.timeout * 1000)
    context.set_default_navigation_timeout(config.navigation_timeout * 1000)

    yield context
    context.close()


@pytest.fixture
def page(context: BrowserContext) -> Generator[Page, None, None]:
    """Página del navegador lista para usar."""
    page = context.new_page()
    yield page


@pytest.fixture
def base_url(request: pytest.FixtureRequest) -> str:
    """URL base del sitio."""
    return request.config.getoption("--base-url", default=config.base_url)


@pytest.fixture
def api_base(base_url: str) -> str:
    """URL base para llamadas API directas."""
    return base_url


@pytest.fixture
def app(page: Page, base_url: str):
    """Fixture compuesto: navega al sitio y devuelve página + helpers."""
    from pages.home_page import HomePage
    home = HomePage(page, base_url)
    home.navigate()
    return {
        "page": page,
        "base_url": base_url,
        "home": home,
    }


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

@pytest.fixture
def api_client():
    """Cliente HTTP para llamadas directas a la API (sin navegador)."""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
    })
    if config.api_key:
        session.headers["x-api-key"] = config.api_key
    return session


@pytest.fixture
def screenshot_on_fail(page: Page, request: pytest.FixtureRequest):
    """Decorador para capturar screenshot en tests específicos."""
    yield
    if request.node.rep_call and request.node.rep_call.failed:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_name = request.node.name
        page.screenshot(
            path=os.path.join(config.screenshot_dir, f"{test_name}_{timestamp}.png"),
            full_page=True,
        )


@pytest.fixture
def test_product_ids() -> list:
    """IDs de productos de prueba para tests de carrito y checkout."""
    return config.test_product_ids
