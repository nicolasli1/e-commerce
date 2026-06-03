"""
Tests E2E de la Homepage — validaciones contra HTML real, sin selectores frágiles.
"""
import pytest
import requests
from config import config as e2e_cfg


class TestSiteAlive:
    """Tests de alcance: el sitio está vivo y cargando."""

    def test_homepage_loads(self, page, base_url):
        """La página debe cargar sin errores JS."""
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.goto(base_url, wait_until="networkidle")
        title = page.title()
        assert "NexCore" in title or "Repuestos" in title, f"Title: {title}"
        assert len(errors) == 0, f"Errores JS: {errors}"

    def test_hero_section(self, page, base_url):
        """El hero debe tener título y botones CTA."""
        page.goto(base_url, wait_until="networkidle")
        body = page.content()
        # Verificar copy actual del hero
        assert "repuesto" in body.lower() or "dispositivo" in body.lower(), \
            "Hero no contiene copy esperado"
        btns = page.locator("button, .btn, a.btn").all()
        assert len(btns) >= 3, f"Esperaba ≥3 botones, encontré {len(btns)}"


    def test_navbar_has_links(self, page, base_url):
        """La barra de navegación debe tener links."""
        page.goto(base_url, wait_until="networkidle")
        links = page.locator("nav a, .navbar a, .nav-links a").all()
        texts = [l.text_content().strip() for l in links if l.text_content()]
        assert len(texts) >= 2, f"Nav links: {texts}"

    def test_categories_exist(self, page, base_url):
        """Debe haber categorías de productos visibles."""
        page.goto(base_url, wait_until="networkidle")
        # Buscar categorías por texto
        body_text = page.text_content("body") or ""
        categories = ["Pantallas", "Baterías", "Flex", "Cámaras", "Tapas", "Herramientas"]
        found = [c for c in categories if c.lower() in body_text.lower()]
        assert len(found) >= 3, f"Pocas categorías: {found}"

    def test_footer_exists(self, page, base_url):
        """Footer debe estar presente."""
        page.goto(base_url, wait_until="networkidle")
        footer = page.locator("footer").count()
        assert footer > 0, "No hay footer"

    def test_cart_button_exists(self, page, base_url):
        """Botón de carrito debe estar visible."""
        page.goto(base_url, wait_until="networkidle")
        cart = page.locator("[class*='cart'], #cart, [data-testid='cart'], button:has(svg)").all()
        assert len(cart) >= 1, "No se encontró botón de carrito"


class TestSiteFunctional:
    """Tests funcionales del sitio."""

    def test_products_load_from_api(self, page, base_url):
        """Los productos deben cargarse desde la API."""
        page.goto(base_url, wait_until="networkidle")
        page.wait_for_timeout(2000)  # Esperar que cargue el fetch
        body = page.text_content("body") or ""
        # Debería mostrar algún producto
        product_indicators = ["$", "COP", "Agregar", "OLED", "AMOLED", "Batería", "Flex", "Cámara"]
        found = [p for p in product_indicators if p.lower() in body.lower()]
        assert len(found) >= 2, f"Productos no cargados: {found}"

    def test_responsive_mobile(self, page, base_url):
        """El sitio debe cargar en viewport mobile sin errores."""
        page.set_viewport_size({"width": 375, "height": 812})
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.goto(base_url, wait_until="networkidle")
        assert len(errors) == 0, f"Errores JS en mobile: {errors}"

    def test_contact_form_present(self, page, base_url):
        """Debe haber un formulario de contacto."""
        page.goto(base_url, wait_until="networkidle")
        inputs = page.locator("input[type='email'], input#emailInput, input[name='email']").all()
        assert len(inputs) >= 1, "No se encontró input de email"

    def test_site_loads_under_10s(self, page, base_url):
        """La página debe cargar en menos de 10s (CI puede ser lento)."""
        import time
        page.set_default_timeout(15000)
        start = time.time()
        page.goto(base_url, wait_until="load")
        elapsed = time.time() - start
        assert elapsed < 10, f"Tardó {elapsed:.2f}s"


class TestAuthUI:
    """Tests de UI — autenticación de cliente fue removida, se valida navegación."""

    def test_rastrear_button_exists(self, page, base_url):
        """El CTA de rastreo debe estar en el navbar."""
        page.goto(base_url, wait_until="networkidle")
        rastrear = page.locator("text=Rastrear, text=Rastrea").all()
        assert len(rastrear) >= 1, "No se encontró botón/link de rastreo en navbar"
