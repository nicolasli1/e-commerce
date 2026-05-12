"""
Configuración centralizada para tests E2E.
Todas las variables de entorno y defaults viven aquí.
"""
import os
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class E2EConfig:
    # URL base del sitio
    base_url: str = os.getenv("E2E_BASE_URL", "https://d1ag0uf6e1dp20.cloudfront.net")

    # Timeouts (segundos)
    timeout: int = int(os.getenv("E2E_TIMEOUT", "30"))
    navigation_timeout: int = int(os.getenv("E2E_NAV_TIMEOUT", "45"))
    api_timeout: int = int(os.getenv("E2E_API_TIMEOUT", "15"))

    # Viewports para responsive
    viewports: dict = field(default_factory=lambda: {
        "desktop": {"width": 1440, "height": 900},
        "tablet": {"width": 768, "height": 1024},
        "mobile": {"width": 375, "height": 812},
    })

    # Headless mode
    headless: bool = os.getenv("E2E_HEADLESS", "true").lower() == "true"

    # Screenshots
    screenshot_dir: str = os.getenv(
        "E2E_SCREENSHOT_DIR",
        os.path.join(os.path.dirname(__file__), "screenshots"),
    )
    report_dir: str = os.getenv(
        "E2E_REPORT_DIR",
        os.path.join(os.path.dirname(__file__), "report"),
    )

    # Retry config
    retry_count: int = int(os.getenv("E2E_RETRIES", "2"))
    retry_delay: int = int(os.getenv("E2E_RETRY_DELAY", "2"))

    # Parallel workers
    workers: int = int(os.getenv("E2E_WORKERS", "4"))

    # Admin credentials (desde secrets de CI, no hardcodear)
    admin_user: Optional[str] = os.getenv("E2E_ADMIN_USER")
    admin_pass: Optional[str] = os.getenv("E2E_ADMIN_PASS")

    # API Key para endpoints protegidos
    api_key: Optional[str] = os.getenv("E2E_API_KEY")

    # Productos de prueba (IDs reales del seed)
    test_product_ids: list = field(default_factory=lambda: [
        "42600a9c-5d3f-4c5b-a1a3-bed43d4b122b",  # Pack adhesivo
        "b1912b21-4589-436e-8f55-475f6ffb14b4",  # Pantalla OLED iPhone 11
        "1f80eddd-861e-4d73-8a7a-a773ba436b74",  # Batería iPhone XR
    ])

    # Test user credentials (crear en setup si no existen)
    test_user_email: str = os.getenv("E2E_TEST_USER_EMAIL", "e2e-test@nexcore-test.co")
    test_user_pass: str = os.getenv("E2E_TEST_USER_PASS", "TestNexCore2026!")
    test_user_name: str = "Test E2E User"

    # API endpoints
    api_health: str = "/api/health"
    api_products: str = "/api/products"
    api_leads: str = "/api/leads"
    api_checkout: str = "/api/checkout/session"
    api_orders: str = "/api/checkout/orders"


config = E2EConfig()
