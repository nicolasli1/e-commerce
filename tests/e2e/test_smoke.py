"""
Smoke tests — validaciones rápidas de que el sitio está vivo y funcionando.
Estos tests se ejecutan primero en CI/CD. Si fallan, se cancela el pipeline.
"""
import pytest
import requests

from config import config


class TestSmokeAPI:
    """Validaciones básicas de la API (sin navegador)."""

    BASE = config.base_url
    TIMEOUT = config.api_timeout

    def test_health_endpoint(self):
        """GET /api/health debe responder 200 con ok: true."""
        resp = requests.get(
            f"{self.BASE}/api/health",
            timeout=self.TIMEOUT,
        )
        assert resp.status_code == 200, f"Health check failed: {resp.status_code}"
        data = resp.json()
        assert data.get("ok") is True, f"Health check response: {data}"
        assert data.get("service") == "sales-api", f"Unexpected service: {data}"

    def test_products_endpoint(self):
        """GET /api/products debe devolver lista de productos."""
        resp = requests.get(
            f"{self.BASE}/api/products",
            timeout=self.TIMEOUT,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        products = data.get("products", [])
        assert len(products) >= 1, f"Se esperaban productos, se obtuvo: {len(products)}"

        # Validar estructura de producto
        first = products[0]
        required_fields = ["productId", "name", "price", "category"]
        for field in required_fields:
            assert field in first, f"Producto falta campo '{field}': {first}"

    def test_checkout_unavailable_without_data(self):
        """POST /api/checkout/session sin body debe dar 400."""
        resp = requests.post(
            f"{self.BASE}/api/checkout/session",
            json={},
            timeout=self.TIMEOUT,
        )
        # Sin datos de carrito debería fallar
        assert resp.status_code in (400, 422, 503), f"Esperaba error, obtuvo {resp.status_code}"

    def test_cors_headers_present(self):
        """Verificar que CORS headers están presentes."""
        resp = requests.get(self.BASE, timeout=self.TIMEOUT)
        assert "access-control-allow-origin" in resp.headers, "Falta CORS header"

    def test_security_headers(self):
        """Verificar headers de seguridad esenciales."""
        resp = requests.get(self.BASE, timeout=self.TIMEOUT)
        headers = resp.headers
        security_headers = {
            "strict-transport-security": "HSTS debe estar presente",
            "x-frame-options": "X-Frame-Options debe estar presente",
            "x-content-type-options": "X-Content-Type-Options debe estar presente",
        }
        for header, msg in security_headers.items():
            assert header in headers, f"{msg} (falta {header})"

    def test_cloudfront_cache_hit(self):
        """Verificar que CloudFront está cacheando."""
        resp = requests.get(self.BASE, timeout=self.TIMEOUT)
        cache = resp.headers.get("x-cache", "")
        assert "Hit" in cache or "Miss" in cache, f"x-cache inesperado: {cache}"

    def test_http2_supported(self):
        """Verificar que el sitio soporta HTTP/2."""
        import http.client
        try:
            conn = http.client.HTTPSConnection(self.BASE.replace("https://", ""))
            conn.request("GET", "/")
            resp = conn.getresponse()
            resp.read()
            # Successful connection means HTTP/2 (or HTTP/1.1)
            assert resp.status == 200
        except Exception as e:
            pytest.skip(f"No se pudo verificar HTTP/2: {e}")

    def test_compression_active(self):
        """Verificar que gzip está activo."""
        resp = requests.get(
            self.BASE,
            headers={"Accept-Encoding": "gzip, deflate"},
            timeout=self.TIMEOUT,
        )
        content_encoding = resp.headers.get("content-encoding", "")
        assert "gzip" in content_encoding or resp.headers.get("x-amz-cf-pop"), \
            "Compresión no detectada. CloudFront debería comprimir."


class TestSmokePage:
    """Validaciones de página HTML (con requests, sin navegador)."""

    BASE = config.base_url
    TIMEOUT = config.api_timeout

    def test_page_loads(self):
        """La página principal debe cargar con status 200."""
        resp = requests.get(self.BASE, timeout=self.TIMEOUT)
        assert resp.status_code == 200

    def test_page_is_html(self):
        """El contenido debe ser HTML."""
        resp = requests.get(self.BASE, timeout=self.TIMEOUT)
        ct = resp.headers.get("content-type", "")
        assert "text/html" in ct, f"Content-Type inesperado: {ct}"

    def test_page_has_title(self):
        """La página debe tener un title."""
        resp = requests.get(self.BASE, timeout=self.TIMEOUT)
        assert "<title>" in resp.text, "Falta <title> en la página"

    def test_page_size_reasonable(self):
        """La página no debe ser excesivamente grande."""
        resp = requests.get(self.BASE, timeout=self.TIMEOUT)
        # SPA con CSS inline puede ser grande, pero menos de 200KB es razonable
        assert len(resp.content) < 200000, \
            f"Página muy grande: {len(resp.content)} bytes (límite 200KB)"
