"""
Browser E2E coverage for cart interactions.

These tests run against the local static frontend so we can catch
responsive/cart regressions before a deploy reaches CloudFront.
"""

from __future__ import annotations

import contextlib

import pytest


def _open_page(browser, url: str, *, mobile: bool):
    options = {}
    if mobile:
        options.update(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
        )
    else:
        options.update(viewport={"width": 1440, "height": 1200})

    context = browser.new_context(**options)
    page = context.new_page()
    page.goto(url, wait_until="load")
    return context, page


@pytest.mark.parametrize("mobile", [False, True], ids=["desktop", "mobile"])
def test_cart_button_is_visible_and_opens_modal(
    browser, local_site_url, mobile
):
    context, page = _open_page(browser, local_site_url, mobile=mobile)
    try:
        cart_button = page.locator("#cartNavBtn")
        expect_modal = page.locator("#cartModal")
        modal_panel = page.locator("#cartModal .modal")

        assert cart_button.is_visible(), "Cart trigger should stay visible"
        cart_button.click()

        expect_modal.wait_for(state="visible")
        page.wait_for_timeout(400)
        assert "open" in (expect_modal.get_attribute("class") or "")
        assert modal_panel.is_visible(), "Cart panel should open inside the viewport"
        box = modal_panel.bounding_box()
        assert box is not None
        viewport = page.viewport_size
        assert viewport is not None
        assert box["y"] >= 0
        assert box["y"] + box["height"] <= viewport["height"]
        assert page.locator("#cartEmpty").is_visible()
    finally:
        with contextlib.suppress(Exception):
            context.close()


@pytest.mark.parametrize("mobile", [False, True], ids=["desktop", "mobile"])
def test_checkout_button_opens_checkout_modal(
    browser, local_site_url, mobile
):
    options = {}
    if mobile:
        options.update(viewport={"width": 390, "height": 844}, is_mobile=True)
    else:
        options.update(viewport={"width": 1440, "height": 1200})

    context = browser.new_context(**options)
    context.add_init_script(
        """
        localStorage.setItem('repuestoscel_cart', JSON.stringify([
          { productId: 'prod-1', name: 'Pantalla iPhone 13', price: 180000, quantity: 2 }
        ]));
        """
    )
    page = context.new_page()
    page.goto(local_site_url, wait_until="load")

    try:
        page.locator("#cartNavBtn").click()
        page.locator("#checkoutBtn").click()
        page.wait_for_timeout(400)

        checkout_modal = page.locator("#checkoutModal")
        checkout_panel = page.locator("#checkoutModal .modal")
        assert checkout_modal.is_visible()
        assert checkout_panel.is_visible()
        assert page.locator("#checkoutPayBtn").is_visible()
        assert "Finaliza tu pedido" in checkout_panel.inner_text()
        box = checkout_panel.bounding_box()
        assert box is not None
        viewport = page.viewport_size
        assert viewport is not None
        assert box["y"] >= 0
        assert box["height"] <= viewport["height"]
        if mobile:
            assert box["x"] <= 1
            assert box["width"] >= viewport["width"] - 2
    finally:
        with contextlib.suppress(Exception):
            context.close()


def test_mobile_product_detail_keeps_purchase_action_readable(
    browser, local_site_url
):
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
    )
    context.add_init_script(
        "localStorage.setItem('repuestoscel_theme_mode', 'repair');"
    )
    page = context.new_page()
    page.goto(local_site_url, wait_until="load")

    try:
        page.evaluate(
            """
            openProductDetail({
              productId: 'mobile-detail-test',
              name: 'Pantalla Tecno Spark Go 2024',
              description: 'Pantalla compatible para prueba móvil.',
              price: 60000,
              category: 'pantallas',
              quality: 'AAA',
              shippingTime: '2-4 días hábiles',
              warranty: 'Con sellos y no instalada',
              stock: 100,
              variants: [{
                variantId: 'go-2024',
                model: 'Go 2024',
                quality: 'AAA',
                price: 60000,
                stock: 100,
                images: []
              }]
            });
            """
        )
        page.wait_for_timeout(400)

        modal = page.locator("#productDetailModal .modal")
        gallery = page.locator("#productDetailModal .gallery-main")
        action = page.locator("#productDetailModal .detail-actions")
        note = page.locator("#productDetailModal .detail-selected-variant")
        button = action.locator("button")

        assert modal.is_visible()
        viewport = page.viewport_size
        assert viewport is not None
        modal_box = modal.bounding_box()
        gallery_box = gallery.bounding_box()
        assert modal_box is not None
        assert gallery_box is not None
        assert modal_box["height"] <= viewport["height"]
        assert gallery_box["height"] <= 340

        modal.evaluate("element => { element.scrollTop = element.scrollHeight; }")
        action_box = action.bounding_box()
        note_box = note.bounding_box()
        button_box = button.bounding_box()
        assert action_box is not None
        assert note_box is not None
        assert button_box is not None
        assert button_box["width"] >= action_box["width"] - 34
        assert note_box["y"] + note_box["height"] <= button_box["y"]
        assert button_box["y"] + button_box["height"] <= viewport["height"]

        action_background = action.evaluate(
            "element => getComputedStyle(element).backgroundColor"
        )
        assert action_background != "rgba(0, 0, 0, 0)"
    finally:
        with contextlib.suppress(Exception):
            context.close()
