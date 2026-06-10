"""
Shared fixtures and configuration for RepuestosCel tests.
"""
import os

# Configuración
BASE_URL = os.environ.get(
    "REPUESTOSCEL_BASE_URL", "https://d1ag0uf6e1dp20.cloudfront.net"
)
API_KEY = os.environ.get("REPUESTOSCEL_API_KEY", "repuestoscel…2026")
ADMIN_USER = os.environ.get("REPUESTOSCEL_ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("REPUESTOSCEL_ADMIN_PASS", "admin123")
