"""
Tests de la Homepage — validación visual, navegación, contenido, formularios.
"""
import pytest

from pages.home_page import HomePage


class TestHomepageLoad:
    """La homepage debe cargar correctamente con todos los elementos clave."""

    def test_homepage_hero_visible(self, page, base_url):
        """El hero principal debe ser visible."""
        home = HomePage(page, base_url)
        home.navigate()
        home.assert_hero_visible()

    def test_homepage_title(self, page, base_url):
        """El título debe mencionar repuestos para celulares."""
        home = HomePage(page, base_url)
        home.navigate()
        title = home.get_hero_title()
        assert "Repuestos" in title or "reparación" in title.lower() or "celular" in title.lower(), \
            f"Título inesperado: {title}"

    def test_nav_links_present(self, page, base_url):
        """La barra de navegación debe tener links."""
        home = HomePage(page, base_url)
        home.navigate()
        links = home.get_nav_links()
        assert len(links) >= 3, f"Esperaba ≥3 nav links, encontré {len(links)}: {links}"

    def test_cart_icon_present(self, page, base_url):
        """El icono del carrito debe estar visible."""
        home = HomePage(page, base_url)
        home.navigate()
        assert home.is_visible(home.CART_TRIGGER), "Icono de carrito no visible"

    def test_hero_stats_present(self, page, base_url):
        """Las estadísticas del hero deben estar visibles."""
        home = HomePage(page, base_url)
        home.navigate()
        stats = home.get_hero_stats()
        assert len(stats) >= 2, f"Esperaba ≥2 stats, encontré {len(stats)}"

    def test_categories_visible(self, page, base_url):
        """Las categorías de productos deben estar visibles."""
        home = HomePage(page, base_url)
        home.navigate()
        names = home.get_category_names()
        assert len(names) >= 4, f"Esperaba ≥4 categorías, encontré {len(names)}: {names}"

    def test_kits_section_visible(self, page, base_url):
        """La sección de kits debe estar visible."""
        home = HomePage(page, base_url)
        home.navigate()
        home.assert_kits_visible()

    def test_contact_form_present(self, page, base_url):
        """El formulario de contacto debe estar presente."""
        home = HomePage(page, base_url)
        home.navigate()
        home.assert_contact_form_visible()

    def test_footer_present(self, page, base_url):
        """El footer debe estar presente."""
        home = HomePage(page, base_url)
        home.navigate()
        home.scroll_to("footer")
        assert home.is_visible("footer"), "Footer no visible"

    def test_page_loads_under_5s(self, page, base_url):
        """La página debe cargar en menos de 5 segundos."""
        import time
        home = HomePage(page, base_url)
        start = time.time()
        home.navigate()
        elapsed = time.time() - start
        assert elapsed < 5, f"Página tardó {elapsed:.2f}s en cargar (límite 5s)"

    def test_no_broken_images(self, page, base_url):
        """No debe haber imágenes rotas."""
        home = HomePage(page, base_url)
        home.navigate()
        images = page.locator("img").all()
        broken = 0
        for img in images:
            src = img.get_attribute("src") or ""
            if src and not src.startswith("data:"):
                natural = img.evaluate("el => el.naturalWidth === 0")
                if natural:
                    broken += 1
        assert broken == 0, f"Se encontraron {broken} imágenes rotas"


class TestHomepageResponsive:
    """La homepage debe verse bien en diferentes tamaños de pantalla."""

    @pytest.mark.parametrize("viewport_name", ["desktop", "tablet", "mobile"])
    def test_homepage_responsive(self, page, base_url, viewport_name):
        """La homepage debe cargar en todos los viewports principales."""
        from config import config

        vp = config.viewports[viewport_name]
        page.set_viewport_size(vp)
        home = HomePage(page, base_url)
        home.navigate()
        home.assert_hero_visible()
        home.screenshot(f"homepage_{viewport_name}")


class TestHomepageContactForm:
    """El formulario de contacto debe funcionar."""

    def test_contact_form_fields(self, page, base_url):
        """El formulario debe tener todos los campos requeridos."""
        home = HomePage(page, base_url)
        home.navigate()
        home.scroll_to(home.CONTACT_FORM)
        assert home.is_visible(home.CONTACT_NAME), "Falta campo nombre"
        assert home.is_visible(home.CONTACT_EMAIL), "Falta campo email"
        assert home.is_visible(home.CONTACT_PHONE), "Falta campo teléfono"
        assert home.is_visible(home.CONTACT_SUBMIT), "Falta botón enviar"
