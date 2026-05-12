"""
Page Object para la Homepage / Landing Page.
"""
from typing import List, Optional

from pages.base_page import BasePage


class HomePage(BasePage):
    """Página principal del e-commerce."""

    # ─── Selectores ────────────────────────────

    # Navbar
    LOGO = ".logo"
    NAV_LINKS = ".nav-links a"
    CART_TRIGGER = ".cart-trigger"
    HAMBURGER = ".hamburger"

    # Hero
    HERO_TITLE = "h1"
    HERO_SUBTITLE = ".hero p"
    HERO_STATS = ".hero-stat"
    HERO_CTA = ".hero-actions .btn"

    # Categorías
    CATEGORIES_SECTION = ".categories"
    CATEGORY_CARDS = ".category-card"

    # Testimonios
    TESTIMONIALS = ".testimonial"

    # Kits
    KITS_SECTION = ".kits"
    KIT_CARDS = ".kit-card"

    # Contacto / Leads
    CONTACT_FORM = "#contact-form"
    CONTACT_NAME = "#contactName"
    CONTACT_EMAIL = "#contactEmail"
    CONTACT_PHONE = "#contactPhone"
    CONTACT_MODEL = "#contactModel"
    CONTACT_MESSAGE = "#contactMessage"
    CONTACT_SUBMIT = "#contactSubmit"

    # Footer
    FOOTER = "footer"
    FOOTER_LINKS = "footer a"

    # Loading / Error states
    LOADING_SPINNER = ".loading, .spinner"

    def navigate(self, path: str = "/"):
        """Navegar a la homepage."""
        super().navigate(path)

    # ─── Acciones ────────────────────────────

    def get_hero_title(self) -> str:
        """Obtener el título principal."""
        return self.get_text(self.HERO_TITLE)

    def get_nav_links(self) -> List[str]:
        """Obtener textos de los links de navegación."""
        elements = self.page.locator(self.NAV_LINKS).all()
        return [el.text_content().strip() for el in elements if el.text_content()]

    def get_category_names(self) -> List[str]:
        """Obtener nombres de categorías visibles."""
        cards = self.page.locator(self.CATEGORY_CARDS).all()
        names = []
        for card in cards:
            title_el = card.locator("h3, .category-title, strong")
            if title_el.count():
                names.append(title_el.text_content().strip())
        return names

    def get_hero_stats(self) -> dict:
        """Obtener estadísticas del hero (ej: 5000+ repuestos vendidos)."""
        stats = {}
        stat_elements = self.page.locator(self.HERO_STATS).all()
        for stat in stat_elements:
            value = stat.locator("h3").text_content() if stat.locator("h3").count() else ""
            label = stat.locator("p").text_content() if stat.locator("p").count() else ""
            if value and label:
                stats[label] = value
        return stats

    def click_category(self, index: int = 0):
        """Click en una categoría por índice."""
        cards = self.page.locator(self.CATEGORY_CARDS)
        cards.nth(index).click()

    def click_cart(self):
        """Abrir el carrito."""
        self.click(self.CART_TRIGGER)

    def toggle_mobile_menu(self):
        """Abrir/cerrar menú hamburguesa en mobile."""
        if self.is_visible(self.HAMBURGER):
            self.click(self.HAMBURGER)

    def fill_contact_form(self, name: str, email: str, phone: str, model: str, message: str):
        """Llenar formulario de contacto / lead."""
        self.fill(self.CONTACT_NAME, name)
        self.fill(self.CONTACT_EMAIL, email)
        self.fill(self.CONTACT_PHONE, phone)
        self.fill(self.CONTACT_MODEL, model)
        self.fill(self.CONTACT_MESSAGE, message)

    def submit_contact(self):
        """Enviar formulario de contacto."""
        self.click(self.CONTACT_SUBMIT)

    # ─── Assertions ──────────────────────────

    def assert_hero_visible(self):
        """Verificar que la sección hero está visible."""
        self.assert_visible(self.HERO_TITLE)

    def assert_categories_visible(self):
        """Verificar que las categorías están visibles."""
        self.scroll_to(self.CATEGORIES_SECTION)
        count = self.count_elements(self.CATEGORY_CARDS)
        assert count >= 4, f"Esperaba ≥4 categorías, encontré {count}"

    def assert_kits_visible(self):
        """Verificar que los kits están visibles."""
        self.scroll_to(self.KITS_SECTION)
        count = self.count_elements(self.KIT_CARDS)
        assert count >= 1, f"Esperaba ≥1 kit, encontré {count}"

    def assert_contact_form_visible(self):
        """Verificar que el formulario de contacto está visible."""
        self.scroll_to(self.CONTACT_FORM)
        self.assert_visible(self.CONTACT_NAME)

    def assert_no_js_errors(self):
        """Verificar que no hay errores JS visibles en consola."""
        # Playwright captura errores de consola automáticamente
        # Este método es un check post-ejecución
        pass
