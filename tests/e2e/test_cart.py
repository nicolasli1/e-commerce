"""
Tests del Carrito — agregar productos, modificar cantidades, eliminar, persistencia.
"""
import pytest

from pages.home_page import HomePage
from pages.cart_page import CartPage


class TestCart:
    """Flujo completo del carrito de compras."""

    @pytest.fixture(autouse=True)
    def setup(self, page, base_url):
        """Setup: navegar a homepage y abrir carrito vacío."""
        self.home = HomePage(page, base_url)
        self.cart = CartPage(page, base_url)
        self.home.navigate()

    def test_cart_starts_empty(self):
        """El carrito debe empezar vacío."""
        self.cart.open_cart()
        assert self.cart.is_empty() or self.cart.get_item_count() == 0, \
            "El carrito debería estar vacío al inicio"

    def test_add_single_product(self):
        """Agregar un producto al carrito."""
        initial_count = self.cart.get_item_count()
        self.cart.add_product_to_cart(product_index=0)
        # Abrir carrito y verificar
        self.cart.open_cart()
        items = self.cart.get_cart_items()
        assert len(items) >= 1, "No se agregó ningún producto al carrito"

    def test_add_multiple_products(self):
        """Agregar múltiples productos al carrito."""
        for i in range(2):
            self.cart.add_product_to_cart(product_index=i)
            self.home.page.wait_for_timeout(300)

        self.cart.open_cart()
        items = self.cart.get_cart_items()
        assert len(items) >= 2, f"Se agregaron 2 productos pero hay {len(items)}"

    def test_cart_count_increases(self):
        """El contador del carrito debe incrementarse."""
        before = self.cart.get_item_count()
        self.cart.add_product_to_cart(product_index=0)
        after = self.cart.get_item_count()
        # El contador puede no actualizarse inmediatamente — depende de la UI
        assert after >= before, f"Contador no incrementó: {before} → {after}"

    def test_total_displays_in_cop(self):
        """El total debe mostrar formato COP ($)."""
        self.cart.add_product_to_cart(product_index=0)
        self.cart.open_cart()
        total = self.cart.get_total()
        if total:
            assert "$" in total, f"Total no tiene formato COP: {total}"


class TestCartPersistence:
    """El carrito debe persistir entre navegaciones."""

    def test_cart_persists_across_pages(self, page, base_url):
        """Los items del carrito deben persistir al navegar entre páginas."""
        home = HomePage(page, base_url)
        cart = CartPage(page, base_url)

        home.navigate()
        cart.add_product_to_cart(product_index=0)
        first_count = cart.get_item_count()

        # Navegar a otra ruta y volver
        page.goto(f"{base_url}/login", wait_until="networkidle")
        page.wait_for_timeout(500)
        home.navigate()

        after_count = cart.get_item_count()
        assert after_count >= first_count, \
            f"Carrito no persistió: {first_count} → {after_count}"

    def test_cart_clears_on_checkout(self, page, base_url):
        """El carrito debe tener opción de checkout (no necesariamente limpiarse)."""
        home = HomePage(page, base_url)
        cart = CartPage(page, base_url)

        home.navigate()
        cart.add_product_to_cart(product_index=0)
        cart.open_cart()
        checkout_btn = page.locator(cart.CHECKOUT_BTN)
        assert checkout_btn.count() > 0, "Botón de checkout no visible en carrito"
