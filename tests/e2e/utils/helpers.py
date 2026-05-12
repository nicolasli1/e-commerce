"""
Utilidades para los tests E2E: helpers, data generators, API wrappers.
"""
import json
import logging
import os
import random
import string
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests

from config import config

logger = logging.getLogger("nexcore-e2e")


# ─── Data Generators ────────────────────────────

def random_email(prefix: str = "e2e") -> str:
    """Generar email aleatorio para tests."""
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    rand = "".join(random.choices(string.ascii_lowercase, k=6))
    return f"{prefix}.{ts}.{rand}@nexcore-test.co"


def random_phone() -> str:
    """Generar número de teléfono colombiano de prueba."""
    return f"300{random.randint(1000000, 9999999)}"


def random_id() -> str:
    """Generar número de cédula de prueba."""
    return str(random.randint(10000000, 99999999))


def random_name() -> str:
    """Generar nombre de prueba."""
    names = ["Carlos Test", "María Prueba", "Juan E2E", "Ana QA", "Pedro Dev"]
    return random.choice(names)


def test_customer(overrides: Optional[Dict] = None) -> Dict[str, str]:
    """Generar datos de cliente para checkout."""
    customer = {
        "fullName": config.test_user_name,
        "email": config.test_user_email,
        "phoneNumber": "3001234567",
        "phoneNumberPrefix": "+57",
        "legalIdType": "CC",
        "legalId": "1234567890",
    }
    if overrides:
        customer.update(overrides)
    return customer


# ─── API Wrappers ──────────────────────────────

class APIClient:
    """Cliente HTTP para interactuar con la API del e-commerce."""

    def __init__(self, base_url: str = config.base_url, api_key: Optional[str] = None):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json",
        })
        self.api_key = api_key or config.api_key
        if self.api_key:
            self.session.headers["x-api-key"] = self.api_key

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def get(self, path: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """GET request."""
        resp = self.session.get(self._url(path), params=params, timeout=config.api_timeout)
        resp.raise_for_status()
        return resp.json()

    def post(self, path: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """POST request."""
        resp = self.session.post(self._url(path), json=data or {}, timeout=config.api_timeout)
        try:
            return resp.json()
        except json.JSONDecodeError:
            return {"status": resp.status_code, "text": resp.text}

    def health_check(self) -> Dict[str, Any]:
        """GET /api/health."""
        return self.get(config.api_health)

    def get_products(self) -> List[Dict[str, Any]]:
        """GET /api/products."""
        data = self.get(config.api_products)
        return data.get("products", [])

    def create_checkout(
        self,
        product_id: str,
        quantity: int = 1,
        provider: str = "mercadopago",
        customer: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """POST /api/checkout/session."""
        payload = {
            "provider": provider,
            "cart": [{"productId": product_id, "quantity": quantity}],
            "customer": customer or test_customer(),
            "notes": "E2E test - API directa",
        }
        return self.post(config.api_checkout, payload)

    def track_order(self, reference: str) -> Dict[str, Any]:
        """GET /api/checkout/orders/{reference}."""
        return self.get(f"{config.api_orders}/{reference}")

    def submit_lead(self, data: Dict[str, str]) -> Dict[str, Any]:
        """POST /api/leads."""
        return self.post(config.api_leads, data)


# ─── Report Helpers ─────────────────────────────

def generate_report_summary(results: List[Dict]) -> str:
    """Generar resumen de resultados para el reporte."""
    total = len(results)
    passed = sum(1 for r in results if r.get("status") == "passed")
    failed = sum(1 for r in results if r.get("status") == "failed")
    skipped = sum(1 for r in results if r.get("status") == "skipped")

    lines = [
        "=" * 60,
        "📊 REPORTE E2E - NexCore",
        f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"URL: {config.base_url}",
        "=" * 60,
        f"Total: {total} | ✅ Pasaron: {passed} | ❌ Fallaron: {failed} | ⏭️ Saltados: {skipped}",
        "=" * 60,
    ]

    if failed > 0:
        lines.append("\n❌ TESTS FALLIDOS:")
        for r in results:
            if r.get("status") == "failed":
                lines.append(f"  - {r.get('name', 'unknown')}: {r.get('error', 'sin detalle')}")

    return "\n".join(lines)
