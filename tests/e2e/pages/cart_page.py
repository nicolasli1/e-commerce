"""
Page Object para el Carrito de Compras.
"""
from typing import List, Optional

from pages.base_page import BasePage


class CartPage(BasePage):
    """Carrito de compras (modal/panel lateral)."""

    # ─── Selectores ────────────────────────────

    CART_PANEL = ".cart-panel, #cart, [data-testid='cart']"
    CART_ITEMS = ".cart-item, [data-testid='cart-item']"
    CART_ITEM_NAME = ".cart-item-name, .item-name"
    CART_ITEM_PRICE = ".cart-item-price, .item-price"
    CART_ITEM_QTY = ".cart-item-qty, .item-qty, input[type='number']"
    CART_TOTAL = ".cart-total, .total-price, #cartTotal"
    CART_EMPTY_MSG = ".cart-empty, .empty-cart"
    CHECKOUT_BTN = ".checkout-btn, #checkoutBtn, [data-testid='checkout']"
    CLOSE_CART = ".cart-close, .close-cart, .cart-overlay"
    CART_COUNT = ".cart-count, .cart-badge"
    ADD_TO_CART_BTN = ".add-to-cart, .btn-add-cart, [data-testid='add-to-cart']"
    PRODUCT_CARD = ".product-card, .category-card"
    REMOVE_ITEM_BTN = ".remove-item, .cart-remove"

    def open_cart(self):
        """Abrir el panel del carrito."""
        self.click(self.CART_TRIGGER)
        self.wait(500)  # Tiempo para animación

    def close_cart(self):
        """Cerrar el carrito."""
        if self.is_visible(self.CLOSE_CART):
            self.click(self.CLOSE_CART)
        else:
            # Hacer click fuera del carrito
            self.page.click("body", position={"x": 10, "y": 10})

    def add_product_to_cart(self, product_index: int = 0):
        """Agregar un producto al carrito desde el catálogo."""
        product_cards = self.page.locator(self.PRODUCT_CARD)
        count = product_cards.count()
        assert count > product_index, f"No hay producto índice {product_index}"

        add_btn = product_cards.nth(product_index).locator(self.ADD_TO_CART_BTN)
        if add_btn.count():
            add_btn.click()
            self.wait(300)
        else:
            # Si no hay botón directo, hacer click en la card y buscar add-to-cart
            product_cards.nth(product_index).click()
            self.wait(300)
            if self.is_visible(self.ADD_TO_CART_BTN):
                self.click(self.ADD_TO_CART_BTN)

    def get_cart_items(self) -> List[dict]:
        """Obtener lista de items en el carrito."""
        items = []
        item_elements = self.page.locator(self.CART_ITEMS).all()
        for item in item_elements:
            name = item.locator(self.CART_ITEM_NAME).text_content()
            price = item.locator(self.CART_ITEM_PRICE).text_content()
            qty_input = item.locator(self.CART_ITEM_QTY)
            qty = qty_input.get_attribute("value") or qty_input.text_content() or "1"
            items.append({
                "name": name.strip() if name else "",
                "price": price.strip() if price else "",
                "quantity": qty.strip(),
            })
        return items

    def get_total(self) -> Optional[str]:
        """Obtener el texto del total del carrito."""
        if self.is_visible(self.CART_TOTAL):
            return self.get_text(self.CART_TOTAL)
        return None

    def is_empty(self) -> bool:
        """Verificar si el carrito está vacío."""
        return self.is_visible(self.CART_EMPTY_MSG)

    def get_item_count(self) -> int:
        """Obtener el contador del carrito."""
        if self.is_visible(self.CART_COUNT):
            text = self.get_text(self.CART_COUNT)
            try:
                return int(text.strip())
            except ValueError:
                return 0
        return 0

    def update_quantity(self, item_index: int = 0, quantity: int = 2):
        """Actualizar cantidad de un item."""
        qty_inputs = self.page.locator(self.CART_ITEM_QTY)
        if qty_inputs.count() > item_index:
            qty_inputs.nth(item_index).fill(str(quantity))

    def remove_item(self, item_index: int = 0):
        """Eliminar un item del carrito."""
        remove_btns = self.page.locator(self.REMOVE_ITEM_BTN)
        if remove_btns.count() > item_index:
            remove_btns.nth(item_index).click()

    def proceed_to_checkout(self):
        """Ir al checkout."""
        self.click(self.CHECKOUT_BTN)
        self.wait(500)

    # ─── Assertions ──────────────────────────

    def assert_cart_visible(self):
        """Verificar que el panel del carrito es visible."""
        self.assert_visible(self.CART_PANEL)

    def assert_item_in_cart(self, product_name: str):
        """Verificar que un producto está en el carrito."""
        items = self.get_cart_items()
        names = [item["name"].lower() for item in items]
        assert product_name.lower() in str(names), f"'{product_name}' no está en el carrito"

    def assert_cart_count(self, expected: int):
        """Verificar el contador del carrito."""
        actual = self.get_item_count()
        assert actual == expected, f"Carrito: esperado {expected}, actual {actual}"
