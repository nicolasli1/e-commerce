"""Blocking, local regressions for the storefront and admin color schemes."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Optional

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[2]
STOREFRONT_THEME_KEY = "repuestoscel_theme_mode"
ADMIN_THEME_KEY = "repuestoscel_admin_theme_mode"


def _context(
    browser,
    *,
    color_scheme: str = "dark",
    reduced_motion: str = "no-preference",
    viewport: Optional[Dict[str, int]] = None,
    storage: Optional[Dict[str, str]] = None,
    block_storage: bool = False,
):
    context = browser.new_context(
        color_scheme=color_scheme,
        reduced_motion=reduced_motion,
        viewport=viewport or {"width": 1440, "height": 900},
        locale="es-CO",
    )
    context.route("https://**", lambda route: route.abort())
    if storage:
        context.add_init_script(
            f"""
            if (!window.sessionStorage.getItem('__theme_test_seeded')) {{
              Object.entries({json.dumps(storage)}).forEach(([key, value]) => {{
                window.localStorage.setItem(key, value);
              }});
              window.sessionStorage.setItem('__theme_test_seeded', '1');
            }}
            """,
        )
    if block_storage:
        context.add_init_script(
            """
            for (const method of ['getItem', 'setItem', 'removeItem']) {
              Object.defineProperty(Storage.prototype, method, {
                configurable: true,
                value() { throw new DOMException('Storage disabled', 'SecurityError'); }
              });
            }
            """
        )
    return context


def _open_storefront(context, local_site_url: str):
    page = context.new_page()
    page.goto(f"{local_site_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#themeModeSelect")
    return page


def _open_admin(context, local_site_url: str):
    page = context.new_page()
    page.goto(f"{local_site_url}/admin/#/login", wait_until="domcontentloaded")
    page.wait_for_selector("#loginThemeMode")
    return page


@pytest.mark.parametrize(
    ("mode", "os_scheme", "resolved"),
    [
        ("light", "dark", "light"),
        ("dark", "light", "dark"),
        ("system", "light", "light"),
        ("system", "dark", "dark"),
    ],
)
def test_storefront_resolves_system_light_and_dark(
    browser, local_site_url, mode, os_scheme, resolved
):
    context = _context(
        browser,
        color_scheme=os_scheme,
        storage={STOREFRONT_THEME_KEY: mode},
    )
    try:
        page = _open_storefront(context, local_site_url)
        page.wait_for_function(
            "expected => document.documentElement.dataset.theme === expected",
            arg=resolved,
        )
        state = page.evaluate(
            """
            () => ({
              mode: document.documentElement.dataset.themeMode,
              theme: document.documentElement.dataset.theme,
              source: document.documentElement.dataset.themeSource,
              colorScheme: getComputedStyle(document.documentElement).colorScheme,
              selected: document.querySelector('#themeModeSelect').value,
              meta: document.querySelector('#themeColorMeta').content,
            })
            """
        )
        assert state["mode"] == mode
        assert state["theme"] == resolved
        assert state["source"] == "user"
        assert state["selected"] == mode
        assert resolved in state["colorScheme"]
        assert state["meta"] == ("#080810" if resolved == "dark" else "#f6f9fa")
    finally:
        context.close()


def test_storefront_defaults_to_system_and_persists_user_choice(
    browser, local_site_url
):
    context = _context(browser, color_scheme="light")
    try:
        page = _open_storefront(context, local_site_url)
        page.wait_for_function(
            "document.documentElement.dataset.visualTheme === 'dark'"
        )
        assert page.locator("html").get_attribute("data-theme-mode") == "system"
        assert page.locator("html").get_attribute("data-theme-source") == "system"
        assert page.locator("html").get_attribute("data-theme") == "light"
        assert page.locator("#themeModeSelect").input_value() == "system"

        page.locator("#themeModeSelect").select_option("dark")
        assert page.locator("html").get_attribute("data-theme-source") == "user"
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector("#themeModeSelect")
        assert page.locator("html").get_attribute("data-theme") == "dark"
        assert page.locator("html").get_attribute("data-theme-source") == "user"
        assert page.evaluate("localStorage.getItem('repuestoscel_theme_mode')") == "dark"
    finally:
        context.close()


def test_storefront_remote_visual_theme_does_not_override_system_default(
    browser, local_site_url
):
    context = _context(browser, color_scheme="dark")
    context.route(
        "**/api/site-settings*",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"settings":{"visualTheme":"repair"}}',
        ),
    )
    try:
        page = _open_storefront(context, local_site_url)
        page.wait_for_function(
            "document.documentElement.dataset.visualTheme === 'repair'"
        )
        assert page.locator("html").get_attribute("data-theme-mode") == "system"
        assert page.locator("html").get_attribute("data-theme-source") == "system"
        assert page.locator("html").get_attribute("data-theme") == "dark"
        assert page.locator("html").get_attribute("data-visual-theme") == "repair"
    finally:
        context.close()


@pytest.mark.parametrize(
    "stored_key", [STOREFRONT_THEME_KEY, "repuestoscel_site_theme"]
)
def test_storefront_migrates_repair_to_light(browser, local_site_url, stored_key):
    context = _context(browser, storage={stored_key: "repair"})
    try:
        page = _open_storefront(context, local_site_url)
        assert page.locator("html").get_attribute("data-theme-mode") == "light"
        assert page.locator("html").get_attribute("data-theme") == "light"
        values = page.evaluate(
            """
            () => ({
              current: localStorage.getItem('repuestoscel_theme_mode'),
              legacy: localStorage.getItem('repuestoscel_site_theme'),
            })
            """
        )
        assert values == {"current": "light", "legacy": None}

        page.reload(wait_until="domcontentloaded")
        assert page.locator("html").get_attribute("data-theme-mode") == "light"
    finally:
        context.close()


def test_storefront_discards_invalid_theme_storage(browser, local_site_url):
    context = _context(browser, storage={STOREFRONT_THEME_KEY: "sepia"})
    try:
        page = _open_storefront(context, local_site_url)
        page.wait_for_function(
            "document.documentElement.dataset.visualTheme === 'dark'"
        )
        assert page.locator("html").get_attribute("data-theme-mode") == "system"
        assert page.locator("html").get_attribute("data-theme-source") == "system"
        assert page.locator("html").get_attribute("data-theme") == "dark"
        assert page.evaluate("localStorage.getItem('repuestoscel_theme_mode')") is None
    finally:
        context.close()


def test_storefront_theme_synchronizes_between_tabs(browser, local_site_url):
    context = _context(browser, color_scheme="dark")
    try:
        first = _open_storefront(context, local_site_url)
        second = _open_storefront(context, local_site_url)
        first.locator("#themeModeSelect").select_option("light")
        second.wait_for_function(
            """
            document.documentElement.dataset.themeMode === 'light' &&
            document.querySelector('#themeModeSelect').value === 'light'
            """
        )
    finally:
        context.close()


def test_system_mode_tracks_live_os_changes_in_both_apps(browser, local_site_url):
    context = _context(
        browser,
        color_scheme="light",
        storage={STOREFRONT_THEME_KEY: "system", ADMIN_THEME_KEY: "system"},
    )
    try:
        storefront = _open_storefront(context, local_site_url)
        admin = _open_admin(context, local_site_url)
        assert storefront.locator("html").get_attribute("data-theme") == "light"
        assert admin.locator("html").get_attribute("data-theme") == "light"

        storefront.emulate_media(color_scheme="dark")
        admin.emulate_media(color_scheme="dark")
        storefront.wait_for_function(
            "document.documentElement.dataset.theme === 'dark'"
        )
        admin.wait_for_function("document.documentElement.dataset.theme === 'dark'")

        storefront.locator("#themeModeSelect").select_option("light")
        admin.locator("#loginThemeMode").select_option("light")
        storefront.emulate_media(color_scheme="light")
        admin.emulate_media(color_scheme="light")
        storefront.emulate_media(color_scheme="dark")
        admin.emulate_media(color_scheme="dark")
        assert storefront.locator("html").get_attribute("data-theme") == "light"
        assert admin.locator("html").get_attribute("data-theme") == "light"
    finally:
        context.close()


def test_storefront_survives_blocked_storage(browser, local_site_url):
    context = _context(browser, color_scheme="dark", block_storage=True)
    errors: list[str] = []
    try:
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(f"{local_site_url}/", wait_until="domcontentloaded")
        page.wait_for_selector("#themeModeSelect")
        page.locator("#themeModeSelect").select_option("light")
        assert page.locator("html").get_attribute("data-theme") == "light"
        assert errors == []
    finally:
        context.close()


def test_storefront_discards_corrupt_cart_storage(browser, local_site_url):
    context = _context(browser, storage={"repuestoscel_cart": "not-json"})
    errors: list[str] = []
    try:
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(f"{local_site_url}/", wait_until="domcontentloaded")
        page.wait_for_selector("#cartNavBtn")
        assert page.locator("#cartCount").inner_text() == "0"
        assert page.evaluate("localStorage.getItem('repuestoscel_cart')") is None
        assert errors == []
    finally:
        context.close()


def test_reduced_motion_is_honored_by_both_apps(browser, local_site_url):
    context = _context(browser, reduced_motion="reduce")
    try:
        storefront = _open_storefront(context, local_site_url)
        storefront_state = storefront.evaluate(
            """
            () => ({
              media: matchMedia('(prefers-reduced-motion: reduce)').matches,
              scroll: getComputedStyle(document.documentElement).scrollBehavior,
              animation: getComputedStyle(document.querySelector('.hero-glow')).animationDuration,
            })
            """
        )
        assert storefront_state["media"] is True
        assert storefront_state["scroll"] == "auto"
        assert storefront_state["animation"] in {"0s", "0.01ms", "1e-05s"}

        admin = _open_admin(context, local_site_url)
        admin_state = admin.evaluate(
            """
            () => ({
              media: matchMedia('(prefers-reduced-motion: reduce)').matches,
              animation: getComputedStyle(document.querySelector('.login-glow')).animationDuration,
            })
            """
        )
        assert admin_state["media"] is True
        assert admin_state["animation"] in {"0s", "0.01ms", "1e-05s"}
    finally:
        context.close()


def test_storefront_has_no_horizontal_overflow_at_320px(browser, local_site_url):
    context = _context(browser, viewport={"width": 320, "height": 720})
    try:
        page = _open_storefront(context, local_site_url)
        assert page.evaluate(
            "document.documentElement.scrollWidth <= window.innerWidth + 1"
        )
        for selector in ("#cartNavBtn", "#themeToggle", ".hamburger"):
            locator = page.locator(selector)
            assert locator.is_visible(), f"{selector} should remain usable at 320px"
            box = locator.bounding_box()
            assert box is not None
            assert box["x"] >= 0
            assert box["x"] + box["width"] <= 321
    finally:
        context.close()


@pytest.mark.parametrize(
    ("mode", "os_scheme", "resolved"),
    [
        ("light", "dark", "light"),
        ("dark", "light", "dark"),
        ("system", "light", "light"),
        ("system", "dark", "dark"),
    ],
)
def test_admin_resolves_and_persists_theme(
    browser, local_site_url, mode, os_scheme, resolved
):
    context = _context(
        browser,
        color_scheme=os_scheme,
        storage={ADMIN_THEME_KEY: mode},
    )
    try:
        page = _open_admin(context, local_site_url)
        assert page.locator("html").get_attribute("data-admin-theme-mode") == mode
        assert page.locator("html").get_attribute("data-theme") == resolved
        assert page.locator("#loginThemeMode").input_value() == mode

        page.locator("#loginThemeMode").select_option("light")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector("#loginThemeMode")
        assert page.locator("html").get_attribute("data-theme") == "light"
        assert page.evaluate(
            "localStorage.getItem('repuestoscel_admin_theme_mode')"
        ) == "light"
    finally:
        context.close()


def test_admin_ignores_invalid_theme_and_synchronizes_tabs(browser, local_site_url):
    context = _context(browser, storage={ADMIN_THEME_KEY: "repair"})
    try:
        first = _open_admin(context, local_site_url)
        second = _open_admin(context, local_site_url)
        assert first.locator("html").get_attribute("data-admin-theme-mode") == "system"
        assert first.evaluate(
            "localStorage.getItem('repuestoscel_admin_theme_mode')"
        ) is None
        first.locator("#loginThemeMode").select_option("dark")
        second.wait_for_function(
            """
            document.documentElement.dataset.theme === 'dark' &&
            document.querySelector('#loginThemeMode').value === 'dark'
            """
        )
    finally:
        context.close()


def test_admin_survives_blocked_storage(browser, local_site_url):
    context = _context(browser, color_scheme="dark", block_storage=True)
    errors: list[str] = []
    try:
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(f"{local_site_url}/admin/#/login", wait_until="domcontentloaded")
        page.wait_for_selector("#loginThemeMode")
        page.locator("#loginThemeMode").select_option("light")
        assert page.locator("html").get_attribute("data-theme") == "light"
        assert errors == []
    finally:
        context.close()


def test_theme_bootstraps_are_ordered_before_stylesheets():
    storefront = (PROJECT_ROOT / "frontend" / "index.html").read_text()
    admin = (PROJECT_ROOT / "backoffice" / "index.html").read_text()

    assert storefront.index("Resolve the color scheme before CSS paints") < storefront.index(
        "<style>"
    )
    assert admin.index('src="js/theme-init.js') < admin.index(
        'rel="stylesheet" href="css/style.css'
    )
