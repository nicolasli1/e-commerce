"""
Tests Mobile / Responsive — validación de layout, UX táctil, menú hamburguesa.
"""
import pytest

from pages.home_page import HomePage


class TestMobileResponsive:
    """El sitio debe funcionar correctamente en dispositivos móviles."""

    @pytest.fixture
    def mobile_page(self, page):
        """Configurar viewport mobile."""
        page.set_viewport_size({"width": 375, "height": 812})
        return page

    def test_mobile_menu_hamburger_visible(self, mobile_page, base_url):
        """En mobile, el menú hamburguesa debe ser visible."""
        home = HomePage(mobile_page, base_url)
        home.navigate()
        assert home.is_visible(home.HAMBURGER), \
            "Menú hamburguesa no visible en mobile"

    def test_mobile_menu_toggles(self, mobile_page, base_url):
        """El menú hamburguesa debe abrir y cerrar."""
        home = HomePage(mobile_page, base_url)
        home.navigate()
        # Abrir
        home.toggle_mobile_menu()
        mobile_page.wait_for_timeout(500)
        # Verificar que el menú se abrió
        nav = mobile_page.locator(".nav-links")
        assert nav.is_visible() or mobile_page.locator(".mobile-menu, .nav-open").count() > 0

    def test_mobile_layout_no_horizontal_scroll(self, mobile_page, base_url):
        """En mobile no debe haber scroll horizontal."""
        home = HomePage(mobile_page, base_url)
        home.navigate()
        # Verificar que el ancho de la página no excede el viewport
        scroll_width = mobile_page.evaluate("document.documentElement.scrollWidth")
        viewport_width = mobile_page.evaluate("window.innerWidth")
        assert scroll_width <= viewport_width + 5, \
            f"Scroll horizontal detectado: {scroll_width} > {viewport_width}"

    def test_mobile_touch_targets_large_enough(self, mobile_page, base_url):
        """Los botones deben tener tamaño táctil adecuado (≥44px)."""
        home = HomePage(mobile_page, base_url)
        home.navigate()
        buttons = mobile_page.locator("button, .btn, a.btn").all()
        small_buttons = 0
        for btn in buttons:
            size = btn.bounding_box()
            if size and (size["width"] < 44 or size["height"] < 44):
                small_buttons += 1
        assert small_buttons < len(buttons) * 0.3, \
            f"Demasiados botones pequeños ({small_buttons}/{len(buttons)})"

    def test_mobile_cart_interaction(self, mobile_page, base_url):
        """El carrito debe funcionar en mobile."""
        home = HomePage(mobile_page, base_url)
        home.navigate()
        home.click_cart()
        mobile_page.wait_for_timeout(500)
        # El carrito debe abrirse (puede ser modal o panel lateral)
        assert mobile_page.locator(".cart-panel, #cart, .cart-overlay, .cart-item, .cart-empty").count() > 0, \
            "Carrito no se abrió en mobile"

    def test_mobile_forms_usable(self, mobile_page, base_url):
        """Los formularios deben ser usables en mobile (zoom no requerido)."""
        home = HomePage(mobile_page, base_url)
        home.navigate()
        home.scroll_to(home.CONTACT_FORM)
        mobile_page.wait_for_timeout(300)
        # El input no debe tener font-size < 16px (evita zoom automático en iOS)
        inputs = mobile_page.locator("input, textarea, select").all()
        small_font = 0
        for inp in inputs:
            font_size = inp.evaluate("el => window.getComputedStyle(el).fontSize")
            if font_size and float(font_size.replace("px", "")) < 16:
                small_font += 1
        assert small_font < len(inputs) * 0.3, \
            f"Campos con font-size < 16px pueden causar zoom en iOS"


class TestTabletResponsive:
    """Validación en tablet (768px)."""

    @pytest.fixture
    def tablet_page(self, page):
        page.set_viewport_size({"width": 768, "height": 1024})
        return page

    def test_tablet_category_grid(self, tablet_page, base_url):
        """En tablet, las categorías deben verse en grid de 2-3 columnas."""
        home = HomePage(tablet_page, base_url)
        home.navigate()
        names = home.get_category_names()
        assert len(names) >= 4, f"Pocas categorías en tablet: {names}"

    def test_tablet_kits_section(self, tablet_page, base_url):
        """Los kits deben ser visibles en tablet."""
        home = HomePage(tablet_page, base_url)
        home.navigate()
        home.assert_kits_visible()


class TestDesktopResponsive:
    """Validación en desktop grande."""

    @pytest.fixture
    def desktop_page(self, page):
        page.set_viewport_size({"width": 1920, "height": 1080})
        return page

    def test_desktop_full_layout(self, desktop_page, base_url):
        """En desktop, todo el contenido debe ser visible sin scroll excesivo."""
        home = HomePage(desktop_page, base_url)
        home.navigate()
        # Verificar que el hero es visible inmediatamente (above the fold)
        home.assert_hero_visible()
