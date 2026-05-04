"""
Shared fixtures and configuration for NexCore tests.
"""
import os

# Configuración
BASE_URL = os.environ.get(
    "NEXCORE_BASE_URL", "https://d1ag0uf6e1dp20.cloudfront.net"
)
API_KEY = os.environ.get("NEXCORE_API_KEY", "nexcor…2026")
ADMIN_USER = os.environ.get("NEXCORE_ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("NEXCORE_ADMIN_PASS", "admin123")
