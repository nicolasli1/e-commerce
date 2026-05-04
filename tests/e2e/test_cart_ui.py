"""
Browser E2E coverage for cart interactions.

These tests run against the local static frontend so we can catch
responsive/cart regressions before a deploy reaches CloudFront.
"""

from __future__ import annotations

import contextlib
import http.server
import socketserver
import threading
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright


FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):  # noqa: A003
        return


@pytest.fixture(scope="module")
def local_frontend_url():
    handler = lambda *args, **kwargs: QuietHandler(  # noqa: E731
        *args, directory=str(FRONTEND_DIR), **kwargs
    )

    with socketserver.TCPServer(("127.0.0.1", 0), handler) as server:
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{port}/index.html"
        finally:
            server.shutdown()
            thread.join(timeout=5)


@pytest.fixture(scope="module")
def playwright_browser():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            yield browser
        finally:
            browser.close()


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
    playwright_browser, local_frontend_url, mobile
):
    context, page = _open_page(playwright_browser, local_frontend_url, mobile=mobile)
    try:
        cart_button = page.locator("#cartNavBtn")
        expect_modal = page.locator("#cartModal")

        assert cart_button.is_visible(), "Cart trigger should stay visible"
        cart_button.click()

        expect_modal.wait_for(state="visible")
        assert "open" in (expect_modal.get_attribute("class") or "")
        assert page.locator("#cartEmpty").is_visible()
    finally:
        with contextlib.suppress(Exception):
            context.close()
