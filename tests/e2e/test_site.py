"""
E2E tests for RepuestosCel sales website.

Tests against the LIVE deployed site.
Requires: BASE_URL environment variable or defaults to CloudFront URL.
"""

import json
import os

import requests

BASE_URL = os.environ.get(
    "REPUESTOSCEL_BASE_URL", "https://d1ag0uf6e1dp20.cloudfront.net"
)
API_KEY = os.environ.get("REPUESTOSCEL_API_KEY", "repuestoscel…2026")
ADMIN_USER = os.environ.get("REPUESTOSCEL_ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("REPUESTOSCEL_ADMIN_PASS", "admin123")


class TestLandingPage:
    """Pruebas de la página principal."""

    def test_landing_page_returns_200(self):
        res = requests.get(f"{BASE_URL}/", timeout=15)
        assert res.status_code == 200

    def test_landing_page_has_correct_title(self):
        res = requests.get(f"{BASE_URL}/", timeout=15)
        assert "RepuestosCel" in res.text
        assert "Componentes Tecnológicos" in res.text

    def test_landing_page_has_hero_section(self):
        res = requests.get(f"{BASE_URL}/", timeout=15)
        assert "El futuro del" in res.text or "rendimiento técnico" in res.text

    def test_landing_page_has_contact_form(self):
        res = requests.get(f"{BASE_URL}/", timeout=15)
        assert "Cotización" in res.text or "contacto" in res.text.lower()


class TestBackofficeFrontend:
    """Pruebas del frontend del backoffice (SPA)."""

    def test_admin_login_page_returns_200(self):
        res = requests.get(f"{BASE_URL}/admin/login", timeout=15)
        assert res.status_code == 200

    def test_admin_login_page_is_backoffice(self):
        res = requests.get(f"{BASE_URL}/admin/login", timeout=15)
        assert "Backoffice" in res.text or "RepuestosCel Admin" in res.text

    def test_admin_dashboard_page_returns_200(self):
        res = requests.get(f"{BASE_URL}/admin/", timeout=15)
        assert res.status_code == 200

    def test_admin_login_page_has_form(self):
        res = requests.get(f"{BASE_URL}/admin/login", timeout=15)
        assert "Iniciar sesión" in res.text or "login" in res.text.lower()

    def test_admin_css_loads(self):
        res = requests.get(f"{BASE_URL}/admin/css/style.css", timeout=15)
        assert res.status_code == 200
        assert "RepuestosCel" in res.text or "backoffice" in res.text.lower()

    def test_admin_js_app_loads(self):
        res = requests.get(f"{BASE_URL}/admin/js/app.js", timeout=15)
        assert res.status_code == 200
        assert "RepuestosCel" in res.text or "App" in res.text

    def test_admin_js_api_loads(self):
        res = requests.get(f"{BASE_URL}/admin/js/api.js", timeout=15)
        assert res.status_code == 200

    def test_admin_js_auth_loads(self):
        res = requests.get(f"{BASE_URL}/admin/js/auth.js", timeout=15)
        assert res.status_code == 200

    def test_admin_js_config_loads(self):
        res = requests.get(f"{BASE_URL}/admin/js/config.js", timeout=15)
        assert res.status_code == 200


class TestAPI:
    """Pruebas de los endpoints de la API."""

    def test_api_health_returns_json(self):
        res = requests.get(f"{BASE_URL}/api/health", timeout=15)
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is True
        assert data.get("service") == "sales-api"

    def test_api_login_success(self):
        res = requests.post(
            f"{BASE_URL}/api/admin/login",
            headers={
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
            },
            json={"username": ADMIN_USER, "password": ADMIN_PASS},
            timeout=15,
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is True
        assert "token" in data

    def test_api_login_invalid_credentials(self):
        res = requests.post(
            f"{BASE_URL}/api/admin/login",
            headers={
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
            },
            json={"username": "admin", "password": "wrong"},
            timeout=15,
        )
        assert res.status_code == 401

    def test_api_login_missing_fields(self):
        res = requests.post(
            f"{BASE_URL}/api/admin/login",
            headers={
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
            },
            json={},
            timeout=15,
        )
        assert res.status_code in (400, 401)

    def _auth_token(self) -> str:
        """Helper: obtiene token de autenticación."""
        res = requests.post(
            f"{BASE_URL}/api/admin/login",
            headers={
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
            },
            json={"username": ADMIN_USER, "password": ADMIN_PASS},
            timeout=15,
        )
        return res.json().get("token", "")

    def test_api_products_list_empty(self):
        token = self._auth_token()
        res = requests.get(
            f"{BASE_URL}/api/admin/products",
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-key": API_KEY,
            },
            timeout=15,
        )
        assert res.status_code == 200
        data = res.json()
        assert "products" in data

    def test_api_create_product(self):
        token = self._auth_token()
        res = requests.post(
            f"{BASE_URL}/api/admin/products",
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-key": API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "name": "E2E Test Product",
                "price": 99.99,
                "category": "testing",
                "stock": 10,
            },
            timeout=15,
        )
        assert res.status_code == 201
        data = res.json()
        assert data["ok"] is True
        assert "product" in data
        return data["product"]["productId"]

    def test_api_dashboard(self):
        token = self._auth_token()
        res = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-key": API_KEY,
            },
            timeout=15,
        )
        assert res.status_code == 200
        data = res.json()
        assert "totalProducts" in data
        assert "totalLeads" in data
        assert "totalQuotes" in data
        assert "recentQuotes" in data

    def test_api_create_lead(self):
        res = requests.post(
            f"{BASE_URL}/api/leads",
            headers={
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
            },
            json={
                "name": "E2E Test User",
                "email": "e2e@test.com",
                "message": "Test desde E2E",
            },
            timeout=15,
        )
        assert res.status_code == 201
        data = res.json()
        assert data["ok"] is True
        assert "leadId" in data

    def test_api_unauthorized_without_token(self):
        """Endpoints admin deben rechazar sin token."""
        res = requests.get(
            f"{BASE_URL}/api/admin/products",
            headers={"x-api-key": API_KEY},
            timeout=15,
        )
        assert res.status_code == 401

    def test_api_unauthorized_with_wrong_token(self):
        res = requests.get(
            f"{BASE_URL}/api/admin/products",
            headers={
                "Authorization": "Bearer invalid-token-here",
                "x-api-key": API_KEY,
            },
            timeout=15,
        )
        assert res.status_code == 401


class TestE2EFlow:
    """Flujo completo: lead → admin login → ver lead en dashboard."""

    def test_full_flow(self):
        # 1. Crear un lead desde el frontend
        res_lead = requests.post(
            f"{BASE_URL}/api/leads",
            headers={
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
            },
            json={
                "name": "Flujo Completo",
                "email": "flujo@test.com",
                "message": "Prueba de flujo completo E2E",
            },
            timeout=15,
        )
        assert res_lead.status_code == 201

        # 2. Login como admin
        res_login = requests.post(
            f"{BASE_URL}/api/admin/login",
            headers={
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
            },
            json={"username": ADMIN_USER, "password": ADMIN_PASS},
            timeout=15,
        )
        assert res_login.status_code == 200
        token = res_login.json()["token"]

        # 3. Ver dashboard
        res_dash = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-key": API_KEY,
            },
            timeout=15,
        )
        assert res_dash.status_code == 200

        # 4. Listar leads (el nuevo lead debe aparecer)
        res_leads = requests.get(
            f"{BASE_URL}/api/admin/leads",
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-key": API_KEY,
            },
            timeout=15,
        )
        assert res_leads.status_code == 200
        data = res_leads.json()
        assert "leads" in data

        # 5. Crear un producto
        res_product = requests.post(
            f"{BASE_URL}/api/admin/products",
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-key": API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "name": "Producto E2E",
                "price": 499.99,
                "category": "e2e",
                "stock": 5,
            },
            timeout=15,
        )
        assert res_product.status_code == 201

        # 6. Listar productos
        res_products = requests.get(
            f"{BASE_URL}/api/admin/products",
            headers={
                "Authorization": f"Bearer {token}",
                "x-api-key": API_KEY,
            },
            timeout=15,
        )
        assert res_products.status_code == 200
        data = res_products.json()
        assert len(data["products"]) >= 1
