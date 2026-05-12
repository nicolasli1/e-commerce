"""
Page Object para el Checkout.
"""
from typing import Dict, Optional

from pages.base_page import BasePage


class CheckoutPage(BasePage):
    """Flujo de checkout: formulario, pago, confirmación."""

    # ─── Selectores ────────────────────────────

    # Formulario de checkout
    CHECKOUT_CONTAINER = "#checkout, .checkout, [data-testid='checkout']"
    CHECKOUT_FULL_NAME = "#checkoutFullName, #fullName, [name='fullName']"
    CHECKOUT_EMAIL = "#checkoutEmail, #email, [name='email']"
    CHECKOUT_PHONE = "#checkoutPhone, #phone, [name='phone']"
    CHECKOUT_LEGAL_ID_TYPE = "#checkoutLegalIdType, #idType, [name='idType']"
    CHECKOUT_LEGAL_ID = "#checkoutLegalId, #idNumber, [name='idNumber']"
    CHECKOUT_NOTES = "#checkoutNotes, #notes, [name='notes']"
    CHECKOUT_ACCEPT_STORE = "#checkoutAcceptStore"
    CHECKOUT_ACCEPT_PAYMENT = "#checkoutAcceptPayment"
    CHECKOUT_PAY_BTN = "#checkoutPayBtn, .btn-pay, [data-testid='pay']"

    # Proveedores de pago
    PAYMENT_MERCADOPAGO = ".payment-mp, [data-provider='mercadopago'], #providerMP"
    PAYMENT_WOMPI = ".payment-wompi, [data-provider='wompi'], #providerWompi"

    # Estado / Resultado
    CHECKOUT_STATUS = ".checkout-status, #checkoutStatus, .status-message"
    CHECKOUT_ERROR = ".checkout-error, .error-message"
    CHECKOUT_SUCCESS = ".checkout-success, .success-message"
    CHECKOUT_RESULT = ".checkout-result, #checkoutResult"
    ORDER_REFERENCE = ".order-reference, #reference"
    ORDER_TOTAL = ".order-total"

    # Seguimiento de órdenes
    TRACKING_REFERENCE = "#trackingReference, .tracking-input"
    TRACKING_BTN = "#trackingBtn, .btn-track"
    TRACKING_RESULT = ".tracking-result"
    TRACKING_ERROR = ".tracking-error"

    def wait_for_checkout(self):
        """Esperar a que el checkout esté visible."""
        self.wait_for_selector(self.CHECKOUT_CONTAINER)

    def fill_checkout_form(self, customer: Dict[str, str]):
        """Llenar el formulario de checkout."""
        if customer.get("fullName"):
            self.fill(self.CHECKOUT_FULL_NAME, customer["fullName"])
        if customer.get("email"):
            self.fill(self.CHECKOUT_EMAIL, customer["email"])
        if customer.get("phone"):
            self.fill(self.CHECKOUT_PHONE, customer["phone"])
        if customer.get("legalIdType"):
            self.select_option(self.CHECKOUT_LEGAL_ID_TYPE, customer["legalIdType"])
        if customer.get("legalId"):
            self.fill(self.CHECKOUT_LEGAL_ID, customer["legalId"])
        if customer.get("notes"):
            self.fill(self.CHECKOUT_NOTES, customer["notes"])

    def select_payment_provider(self, provider: str = "mercadopago"):
        """Seleccionar el proveedor de pago."""
        if provider == "mercadopago":
            self.click(self.PAYMENT_MERCADOPAGO)
        elif provider == "wompi":
            self.click(self.PAYMENT_WOMPI)

    def accept_terms(self):
        """Aceptar términos y condiciones."""
        self.check(self.CHECKOUT_ACCEPT_STORE)
        self.check(self.CHECKOUT_ACCEPT_PAYMENT)

    def pay(self):
        """Iniciar el pago."""
        self.click(self.CHECKOUT_PAY_BTN)

    def get_status_message(self) -> Optional[str]:
        """Obtener mensaje de estado del checkout."""
        if self.is_visible(self.CHECKOUT_STATUS):
            return self.get_text(self.CHECKOUT_STATUS)
        return None

    def get_order_reference(self) -> Optional[str]:
        """Obtener la referencia de la orden creada."""
        if self.is_visible(self.ORDER_REFERENCE):
            return self.get_text(self.ORDER_REFERENCE)
        return None

    def is_success(self) -> bool:
        """Verificar si el checkout fue exitoso."""
        return self.is_visible(self.CHECKOUT_SUCCESS)

    def is_error(self) -> bool:
        """Verificar si hay un error en el checkout."""
        return self.is_visible(self.CHECKOUT_ERROR)

    # ─── Seguimiento ───────────────────────────

    def track_order(self, reference: str):
        """Consultar estado de una orden."""
        self.fill(self.TRACKING_REFERENCE, reference)
        self.click(self.TRACKING_BTN)
        self.wait(500)

    def get_tracking_info(self) -> Optional[str]:
        """Obtener información del tracking."""
        if self.is_visible(self.TRACKING_RESULT):
            return self.get_text(self.TRACKING_RESULT)
        return None

    # ─── API directa ───────────────────────────

    def create_checkout_session_via_api(
        self,
        api_client,
        product_id: str,
        quantity: int = 1,
        provider: str = "mercadopago",
        customer: Optional[Dict] = None,
    ) -> Dict:
        """Crear sesión de checkout directamente vía API."""
        import requests

        if customer is None:
            customer = {
                "fullName": "Test E2E User",
                "email": "e2e-test@nexcore-test.co",
                "phoneNumber": "3001234567",
                "phoneNumberPrefix": "+57",
                "legalIdType": "CC",
                "legalId": "1234567890",
            }

        payload = {
            "provider": provider,
            "cart": [{"productId": product_id, "quantity": quantity}],
            "customer": customer,
            "notes": "E2E test checkout",
        }

        response = api_client.post(
            f"{self.base_url}/api/checkout/session",
            json=payload,
            timeout=15,
        )
        return response.json()

    # ─── Assertions ──────────────────────────

    def assert_checkout_form_visible(self):
        """Verificar que el formulario de checkout está visible."""
        self.assert_visible(self.CHECKOUT_FULL_NAME)
        self.assert_visible(self.CHECKOUT_EMAIL)

    def assert_payment_options_visible(self):
        """Verificar que hay opciones de pago disponibles."""
        mp = self.is_visible(self.PAYMENT_MERCADOPAGO)
        wompi = self.is_visible(self.PAYMENT_WOMPI)
        assert mp or wompi, "No hay opciones de pago visibles"

    def assert_order_created(self):
        """Verificar que se creó una orden (referencia presente)."""
        ref = self.get_order_reference()
        assert ref, "No se encontró referencia de orden"
        assert ref.strip(), "Referencia de orden vacía"
