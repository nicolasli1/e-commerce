"""
Base Page Object — clase padre para todas las páginas.
Provee métodos comunes: navegación, esperas, screenshots, logging.
"""
import logging
from typing import Optional

from playwright.sync_api import Page, expect

logger = logging.getLogger("nexcore-e2e")


class BasePage:
    """Clase base con métodos reutilizables para todas las páginas."""

    def __init__(self, page: Page, base_url: str):
        self.page = page
        self.base_url = base_url
        self.logger = logger

    # ─── Navegación ────────────────────────────

    def navigate(self, path: str = "/"):
        """Navegar a una ruta relativa."""
        url = f"{self.base_url}{path}"
        self.logger.info(f"🌐 Navegando a: {url}")
        self.page.goto(url, wait_until="networkidle")

    def reload(self):
        """Recargar página actual."""
        self.page.reload(wait_until="networkidle")

    # ─── Esperas ───────────────────────────────

    def wait_for_selector(self, selector: str, timeout: Optional[int] = None):
        """Esperar a que un selector sea visible."""
        self.page.wait_for_selector(selector, state="visible", timeout=timeout)

    def wait_for_load(self):
        """Esperar a que la página cargue completamente."""
        self.page.wait_for_load_state("networkidle")

    def wait(self, ms: int):
        """Esperar milisegundos (usar con moderación)."""
        self.page.wait_for_timeout(ms)

    # ─── Interacciones ─────────────────────────

    def click(self, selector: str):
        """Hacer click en un selector."""
        self.logger.info(f"🖱️ Click en: {selector}")
        self.page.click(selector)

    def fill(self, selector: str, text: str):
        """Llenar un campo de texto."""
        self.logger.info(f"✏️ Llenando {selector}: '{text[:30]}...' " if len(text) > 30 else f"✏️ Llenando {selector}: '{text}'")
        self.page.fill(selector, text)

    def type_text(self, selector: str, text: str, delay: int = 50):
        """Escribir texto caracter por caracter."""
        self.page.type(selector, text, delay=delay)

    def select_option(self, selector: str, value: str):
        """Seleccionar opción de un select."""
        self.page.select_option(selector, value)

    def check(self, selector: str):
        """Marcar un checkbox."""
        self.page.check(selector)

    def scroll_to(self, selector: str):
        """Scroll a un elemento."""
        self.page.locator(selector).scroll_into_view_if_needed()

    def hover(self, selector: str):
        """Hover sobre un elemento."""
        self.page.hover(selector)

    # ─── Lectura ───────────────────────────────

    def get_text(self, selector: str) -> str:
        """Obtener texto de un elemento."""
        return self.page.text_content(selector) or ""

    def is_visible(self, selector: str) -> bool:
        """Verificar si un elemento es visible."""
        try:
            return self.page.locator(selector).is_visible()
        except Exception:
            return False

    def count_elements(self, selector: str) -> int:
        """Contar elementos que coinciden con un selector."""
        return self.page.locator(selector).count()

    def get_attribute(self, selector: str, attr: str) -> Optional[str]:
        """Obtener un atributo de un elemento."""
        return self.page.get_attribute(selector, attr)

    # ─── Assertions ────────────────────────────

    def assert_visible(self, selector: str, msg: Optional[str] = None):
        """Afirmar que un elemento es visible."""
        locator = self.page.locator(selector)
        try:
            expect(locator).to_be_visible()
        except AssertionError as e:
            msg = msg or f"Elemento no visible: {selector}"
            self.logger.error(f"❌ {msg}")
            raise AssertionError(msg) from e

    def assert_text(self, selector: str, expected: str):
        """Afirmar que un elemento contiene texto."""
        locator = self.page.locator(selector)
        expect(locator).to_contain_text(expected)

    def assert_url_contains(self, text: str):
        """Afirmar que la URL contiene texto."""
        expect(self.page).to_have_url(text, timeout=5000)

    def assert_title(self, title: str):
        """Afirmar el title de la página."""
        expect(self.page).to_have_title(title)

    # ─── Screenshots ───────────────────────────

    def screenshot(self, name: str, full_page: bool = True) -> str:
        """Tomar screenshot y guardarlo."""
        import os
        from datetime import datetime
        from config import config

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{name}_{timestamp}.png"
        path = os.path.join(config.screenshot_dir, filename)
        self.page.screenshot(path=path, full_page=full_page)
        self.logger.info(f"📸 Screenshot: {path}")
        return path

    # ─── Logging ───────────────────────────────

    def log_html(self):
        """Loggear el HTML actual (debug)."""
        html = self.page.content()
        self.logger.debug(f"📄 HTML ({len(html)} chars): {html[:500]}...")
