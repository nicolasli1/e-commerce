"""
QA Tests — Pruebas de flujos CRUD del backoffice NexCore

Ejecutar: python -m pytest tests/qa/ -v --tb=short
Requiere: URL del sitio accesible
"""

import os
import requests

BASE_URL = os.environ.get("NEXCORE_BASE_URL", "https://d1ag0uf6e1dp20.cloudfront.net")
ADMIN_USER = os.environ.get("NEXCORE_ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("NEXCORE_ADMIN_PASS", "admin123")


def _login():
    r = requests.post(f"{BASE_URL}/api/admin/login",
                      json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=10)
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["token"]


class TestProductosQA:
    """Flujo completo de productos: crear, listar, editar, eliminar."""

    def test_01_crear_producto(self):
        """Crear un producto con todos los campos."""
        token = _login()
        r = requests.post(f"{BASE_URL}/api/admin/products",
                          headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                          json={
                              "name": "iPhone 17 Pro",
                              "description": "Display 6.7 pulgadas, chip A19",
                              "price": 1299.99,
                              "category": "repuesto",
                              "stock": 10,
                              "imageUrl": "https://example.com/iphone17.jpg"
                          }, timeout=10)
        assert r.status_code == 201, f"❌ Crear producto falló: {r.status_code} {r.text}"
        data = r.json()
        assert data["ok"] is True
        assert "product" in data
        assert data["product"]["name"] == "iPhone 17 Pro"
        assert float(data["product"]["price"]) == 1299.99
        print(f"  ✅ Producto creado: {data['product']['productId'][:8]}...")
        return data["product"]["productId"]

    def test_02_listar_productos(self):
        """Listar productos debe incluir el creado."""
        token = _login()
        r = requests.get(f"{BASE_URL}/api/admin/products",
                         headers={"Authorization": f"Bearer {token}"}, timeout=10)
        assert r.status_code == 200, f"❌ Listar productos falló: {r.status_code}"
        data = r.json()
        assert "products" in data
        assert len(data["products"]) >= 1
        print(f"  ✅ Productos listados: {len(data['products'])} encontrados")

    def test_03_crear_producto_sin_nombre(self):
        """Crear producto sin nombre debe fallar con 400."""
        token = _login()
        r = requests.post(f"{BASE_URL}/api/admin/products",
                          headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                          json={"price": 99.99}, timeout=10)
        assert r.status_code == 400, f"❌ Debería fallar con 400: {r.status_code}"

    def test_04_crear_producto_sin_precio(self):
        """Crear producto sin precio debe fallar con 400."""
        token = _login()
        r = requests.post(f"{BASE_URL}/api/admin/products",
                          headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                          json={"name": "Test"}, timeout=10)
        assert r.status_code == 400, f"❌ Debería fallar con 400: {r.status_code}"

    def test_05_precio_negativo(self):
        """Crear producto con precio negativo."""
        token = _login()
        r = requests.post(f"{BASE_URL}/api/admin/products",
                          headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                          json={"name": "Test", "price": -100}, timeout=10)
        # Aceptar 201 (se crea) o 400 (se rechaza)
        assert r.status_code in (201, 400), f"❌ Inesperado: {r.status_code}"
        print(f"  ⚠️  Precio negativo: HTTP {r.status_code} (depende de validación)")

    def test_06_stock_cero(self):
        """Crear producto con stock en cero."""
        token = _login()
        r = requests.post(f"{BASE_URL}/api/admin/products",
                          headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                          json={"name": "Sin Stock", "price": 50, "stock": 0}, timeout=10)
        assert r.status_code == 201, f"❌ Stock 0 falló: {r.status_code} {r.text}"
        assert r.json()["product"]["stock"] == 0

    def test_07_crear_y_editar_producto(self):
        """Crear producto y luego editarlo."""
        token = _login()
        # Crear
        r = requests.post(f"{BASE_URL}/api/admin/products",
                          headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                          json={"name": "Original", "price": 100, "category": "test"}, timeout=10)
        assert r.status_code == 201
        pid = r.json()["product"]["productId"]

        # Editar
        r = requests.put(f"{BASE_URL}/api/admin/products/{pid}",
                         headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                         json={"name": "Editado", "price": 150.50}, timeout=10)
        assert r.status_code == 200, f"❌ Editar falló: {r.status_code} {r.text}"
        data = r.json()
        assert data["product"]["name"] == "Editado"
        assert float(data["product"]["price"]) == 150.50
        print(f"  ✅ Producto editado correctamente")

    def test_08_eliminar_producto(self):
        """Eliminar producto (soft-delete)."""
        token = _login()
        # Crear
        r = requests.post(f"{BASE_URL}/api/admin/products",
                          headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                          json={"name": "A Eliminar", "price": 99}, timeout=10)
        pid = r.json()["product"]["productId"]

        # Eliminar
        r = requests.delete(f"{BASE_URL}/api/admin/products/{pid}",
                            headers={"Authorization": f"Bearer {token}"}, timeout=10)
        assert r.status_code == 200, f"❌ Eliminar falló: {r.status_code} {r.text}"
        print(f"  ✅ Producto eliminado (soft-delete)")

    def test_09_producto_no_existe(self):
        """Editar producto inexistente debe dar 404."""
        token = _login()
        r = requests.put(f"{BASE_URL}/api/admin/products/no-existe-id",
                         headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                         json={"name": "No existe"}, timeout=10)
        assert r.status_code == 404, f"❌ Debería ser 404: {r.status_code}"

    def test_10_dashboard_actualizado(self):
        """Dashboard debe reflejar los productos creados."""
        token = _login()
        r = requests.get(f"{BASE_URL}/api/admin/dashboard",
                         headers={"Authorization": f"Bearer {token}"}, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["totalProducts"] >= 1
        assert "totalLeads" in data
        assert "recentQuotes" in data
        print(f"  ✅ Dashboard: {data['totalProducts']} productos, {data['totalLeads']} leads")


class TestLeadsQA:
    """Flujo completo de leads."""

    def test_01_crear_lead_publico(self):
        """Crear lead desde el formulario público."""
        r = requests.post(f"{BASE_URL}/api/leads",
                          json={"name": "QA Test", "email": "qa@nexcore.test",
                                "message": "Prueba de lead desde QA"}, timeout=10)
        assert r.status_code == 201, f"❌ Crear lead falló: {r.status_code} {r.text}"
        assert r.json()["ok"] is True
        print(f"  ✅ Lead creado: {r.json()['leadId'][:8]}...")

    def test_02_crear_lead_sin_email(self):
        """Crear lead sin email debe fallar."""
        r = requests.post(f"{BASE_URL}/api/leads",
                          json={"name": "QA Test"}, timeout=10)
        assert r.status_code == 400, f"❌ Debería fallar con 400: {r.status_code}"

    def test_03_listar_leads(self):
        """Listar leads autenticado."""
        token = _login()
        r = requests.get(f"{BASE_URL}/api/admin/leads",
                         headers={"Authorization": f"Bearer {token}"}, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "leads" in data
        assert len(data["leads"]) >= 1
        print(f"  ✅ Leads listados: {len(data['leads'])} encontrados")

    def test_04_marcar_contactado(self):
        """Marcar lead como contactado."""
        token = _login()
        # Obtener primer lead
        r = requests.get(f"{BASE_URL}/api/admin/leads",
                         headers={"Authorization": f"Bearer {token}"}, timeout=10)
        leads = r.json()["leads"]
        if not leads:
            print("  ⚠️  No hay leads para marcar")
            return
        lead_id = leads[0]["id"]

        # Marcar como contactado
        r = requests.put(f"{BASE_URL}/api/admin/leads/{lead_id}",
                         headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                         json={"contacted": True}, timeout=10)
        assert r.status_code == 200, f"❌ Marcar contactado falló: {r.status_code} {r.text}"
        print(f"  ✅ Lead {lead_id[:8]} marcado como contactado")


class TestSeguridadQA:
    """Pruebas de seguridad."""

    def test_01_sin_token(self):
        """Endpoint admin sin token debe dar 401."""
        r = requests.get(f"{BASE_URL}/api/admin/products", timeout=10)
        assert r.status_code == 401, f"❌ Debería ser 401: {r.status_code}"

    def test_02_token_invalido(self):
        """Endpoint admin con token inválido debe dar 401."""
        r = requests.get(f"{BASE_URL}/api/admin/products",
                         headers={"Authorization": "Bearer token-invalido"}, timeout=10)
        assert r.status_code == 401, f"❌ Debería ser 401: {r.status_code}"

    def test_03_crear_producto_sin_auth(self):
        """POST sin token debe dar 401."""
        r = requests.post(f"{BASE_URL}/api/admin/products",
                          json={"name": "Test", "price": 100}, timeout=10)
        assert r.status_code == 401, f"❌ Debería ser 401: {r.status_code}"

    def test_04_health_publico(self):
        """Health check debe ser público."""
        r = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert r.status_code == 200

    def test_05_crear_lead_publico(self):
        """Crear lead debe ser público."""
        r = requests.post(f"{BASE_URL}/api/leads",
                          json={"name": "Test", "email": "test@test.com"}, timeout=10)
        assert r.status_code == 201
