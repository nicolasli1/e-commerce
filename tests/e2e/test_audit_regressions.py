"""Regresiones para los hallazgos de la auditoría general del storefront."""

from __future__ import annotations

from pathlib import Path

import requests


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_seo_metadata_and_cacheable_assets(local_site_url):
    response = requests.get(f"{local_site_url}/", timeout=10)
    html = response.text

    assert response.status_code == 200
    assert len(response.content) < 100_000
    assert '<link rel="canonical" href="https://repuestoscel.com/"' in html
    assert 'property="og:url" content="https://repuestoscel.com/"' in html
    assert 'property="og:image" content="https://repuestoscel.com/og-image.jpg"' in html
    assert 'name="twitter:image" content="https://repuestoscel.com/og-image.jpg"' in html
    assert "d1ag0uf6e1dp20.cloudfront.net" not in html
    assert "+57-300-000-0000" not in html

    for asset in ("/css/styles.css", "/js/theme-init.js", "/js/app.js", "/og-image.jpg"):
        asset_response = requests.get(f"{local_site_url}{asset}", timeout=10)
        assert asset_response.status_code == 200, asset
        assert len(asset_response.content) > 100, asset
    assert requests.get(f"{local_site_url}/og-image.jpg", timeout=10).headers["Content-Type"] == "image/jpeg"


def test_robots_and_sitemap_use_public_domain():
    robots = (PROJECT_ROOT / "frontend" / "robots.txt").read_text()
    sitemap = (PROJECT_ROOT / "frontend" / "sitemap.xml").read_text()
    assert "https://repuestoscel.com/sitemap.xml" in robots
    assert "<loc>https://repuestoscel.com/</loc>" in sitemap
    assert "cloudfront.net" not in robots + sitemap


def test_cart_dialog_focus_and_live_announcement(page, local_site_url):
    page.goto(local_site_url, wait_until="load")
    trigger = page.locator("#cartNavBtn")
    trigger.click()

    modal = page.locator("#cartModal")
    assert modal.get_attribute("role") == "dialog"
    assert modal.get_attribute("aria-modal") == "true"
    assert modal.get_attribute("aria-hidden") == "false"
    assert page.locator("#cartCloseBtn").evaluate("el => el === document.activeElement")

    page.keyboard.press("Escape")
    assert modal.get_attribute("aria-hidden") == "true"
    assert trigger.evaluate("el => el === document.activeElement")

    page.evaluate("showCartToast('Producto de prueba agregado al carrito')")
    page.wait_for_function("document.querySelector('#cartLiveRegion').textContent.includes('Producto de prueba')")


def test_checkout_dialog_focus_and_escape(browser, local_site_url):
    context = browser.new_context(viewport={"width": 390, "height": 844})
    context.add_init_script(
        """
        localStorage.setItem('repuestoscel_cart', JSON.stringify([
          { productId: 'audit-1', name: 'Pantalla de prueba', price: 120000, quantity: 1 }
        ]));
        """
    )
    try:
        page = context.new_page()
        page.goto(local_site_url, wait_until="load")
        page.locator("#cartNavBtn").click()
        page.locator("#checkoutBtn").click()

        modal = page.locator("#checkoutModal")
        assert modal.get_attribute("role") == "dialog"
        assert modal.get_attribute("aria-hidden") == "false"
        assert page.locator("#checkoutFullName").evaluate("el => el === document.activeElement")

        page.keyboard.press("Escape")
        assert modal.get_attribute("aria-hidden") == "true"
        assert page.locator("#cartNavBtn").evaluate("el => el === document.activeElement")
    finally:
        context.close()


def test_mobile_menu_semantics_focus_and_layout(browser, local_site_url):
    context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
    try:
        page = context.new_page()
        page.goto(local_site_url, wait_until="load")
        trigger = page.locator("#mobileMenuButton")
        trigger.click()

        panel = page.locator("#mobileNavPanel")
        assert trigger.get_attribute("aria-expanded") == "true"
        assert panel.get_attribute("role") == "dialog"
        assert panel.get_attribute("aria-hidden") == "false"
        assert page.locator(".mobile-nav-close").evaluate("el => el === document.activeElement")

        page.keyboard.press("Escape")
        assert trigger.get_attribute("aria-expanded") == "false"
        assert panel.get_attribute("aria-hidden") == "true"
        assert trigger.evaluate("el => el === document.activeElement")

        metrics = page.evaluate(
            """
            () => ({
              overflow: document.documentElement.scrollWidth > innerWidth,
              controls: ['#themeModeSelect', '#searchToggle', '#cartNavBtn', '#mobileMenuButton']
                .map(selector => {
                  const rect = document.querySelector(selector).getBoundingClientRect();
                  return { selector, width: rect.width, height: rect.height };
                })
            })
            """
        )
        assert metrics["overflow"] is False
        assert all(item["width"] >= 44 and item["height"] >= 44 for item in metrics["controls"])
    finally:
        context.close()


def test_product_dialog_restores_focus(page, local_site_url):
    page.goto(local_site_url, wait_until="load")
    page.evaluate(
        """
        () => {
          const trigger = document.createElement('button');
          trigger.id = 'auditProductTrigger';
          trigger.textContent = 'Abrir producto de prueba';
          trigger.addEventListener('click', () => openProductDetail({
            productId: 'audit-product',
            name: 'Pantalla de prueba',
            description: 'Pantalla compatible para verificar el diálogo.',
            price: 120000,
            category: 'pantallas',
            stock: 2,
            images: [],
            variants: []
          }));
          document.body.appendChild(trigger);
        }
        """
    )
    trigger = page.locator("#auditProductTrigger")
    trigger.click()

    modal = page.locator("#productDetailModal")
    assert modal.get_attribute("role") == "dialog"
    assert modal.get_attribute("aria-hidden") == "false"
    assert page.locator(".product-detail-close-btn").evaluate("el => el === document.activeElement")

    page.keyboard.press("Escape")
    assert modal.get_attribute("aria-hidden") == "true"
    assert trigger.evaluate("el => el === document.activeElement")
