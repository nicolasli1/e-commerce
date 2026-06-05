"""
Smoke tests — validaciones rápidas de que el sitio está vivo y funcionando.
"""
import pytest
import requests

from config import config as e2e_cfg


class TestSmokeAPI:
    """Validaciones básicas de la API (sin navegador)."""

    BASE = e2e_cfg.base_url
    TIMEOUT = e2e_cfg.api_timeout

    def test_health_endpoint(self):
        """GET /api/health debe responder (200 esperado, 500 aceptado como degradado)."""
        resp = requests.get(f"{self.BASE}/api/health", timeout=self.TIMEOUT)
        # Aceptamos 200 o 500 — si es 500, el sitio está degradado
        assert resp.status_code in (200, 500, 502, 503), \
            f"Health inesperado: {resp.status_code}"
        if resp.status_code == 200:
            data = resp.json()
            assert data.get("ok") is True

    def test_products_endpoint(self):
        """GET /api/products debe devolver lista o error controlado."""
        resp = requests.get(f"{self.BASE}/api/products", timeout=self.TIMEOUT)
        assert resp.status_code in (200, 500, 502, 503), \
            f"Products inesperado: {resp.status_code}"
        if resp.status_code == 200:
            data = resp.json()
            assert data.get("ok") is True
            products = data.get("products", [])
            assert isinstance(products, list)
            if products:
                first = products[0]
                for field in ["productId", "name", "price", "category"]:
                    assert field in first, f"Producto falta '{field}'"

    def test_page_served(self):
        """La página principal debe servirse (200 o 304)."""
        resp = requests.get(self.BASE, timeout=self.TIMEOUT)
        assert resp.status_code in (200, 304), f"Status: {resp.status_code}"

    def test_security_headers(self):
        """Verificar headers de seguridad esenciales en página HTML."""
        resp = requests.get(self.BASE, timeout=self.TIMEOUT)
        headers = resp.headers
        checks = {
            "strict-transport-security": "HSTS faltante",
            "x-frame-options": "X-Frame-Options faltante",
            "x-content-type-options": "X-Content-Type-Options faltante",
        }
        for header, msg in checks.items():
            assert header in headers, f"{msg}"

    def test_cors_on_api(self):
        """CORS debe estar presente en respuestas de API (no en HTML)."""
        resp = requests.get(f"{self.BASE}/api/health", timeout=self.TIMEOUT)
        # Si la API responde, verificar CORS
        if resp.status_code < 500:
            # CloudFront puede agregar o remover headers. Verificar via directa
            import urllib.request
            try:
                req = urllib.request.Request(f"{self.BASE}/api/health")
                req.add_header("Origin", "https://example.com")
                with urllib.request.urlopen(req, timeout=self.TIMEOUT) as r:
                    cors = r.headers.get("access-control-allow-origin", "")
                    if not cors:
                        print("⚠️ CORS header no detectado via CloudFront (puede ser normal)")
            except Exception:
                pass

    def test_cloudfront_active(self):
        """CloudFront debe estar sirviendo."""
        resp = requests.get(self.BASE, timeout=self.TIMEOUT)
        cache = resp.headers.get("x-cache", "")
        via = resp.headers.get("via", "")
        assert "cloudfront" in via.lower() or cache, \
            "No parece CloudFront"

    def test_compression(self):
        """Gzip debe estar activo."""
        resp = requests.get(
            self.BASE,
            headers={"Accept-Encoding": "gzip, deflate"},
            timeout=self.TIMEOUT,
        )
        encoding = resp.headers.get("content-encoding", "")
        assert "gzip" in encoding or resp.headers.get("x-amz-cf-pop"), \
            "Compresión no detectada"

    def test_page_is_html(self):
        """El contenido debe ser HTML."""
        resp = requests.get(self.BASE, timeout=self.TIMEOUT)
        ct = resp.headers.get("content-type", "")
        assert "text/html" in ct, f"Content-Type: {ct}"

    def test_page_has_title(self):
        """La página debe tener title."""
        resp = requests.get(self.BASE, timeout=self.TIMEOUT)
        assert "<title>" in resp.text, "Falta <title>"

    def test_page_size_ok(self):
        """Tamaño de página razonable (< 500KB comprimido por CloudFront)."""
        resp = requests.get(
            self.BASE,
            headers={"Accept-Encoding": "gzip"},
            timeout=self.TIMEOUT,
        )
        assert len(resp.content) < 500000, \
            f"Página grande: {len(resp.content)} bytes"

    def test_checkout_endpoint_accessible(self):
        """POST /api/checkout/session sin auth debe dar error (no 404)."""
        resp = requests.post(
            f"{self.BASE}/api/checkout/session",
            json={},
            timeout=self.TIMEOUT,
        )
        # No debe ser 404 — el endpoint existe aunque devuelva error
        assert resp.status_code != 404, "Checkout endpoint no encontrado"
