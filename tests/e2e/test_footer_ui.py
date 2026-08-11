"""Regresiones locales del footer y el centro de información."""

from __future__ import annotations

import pytest

BANNER_ASSETS = {
    "guia": "repuestoscel-guia-banner-v2.webp",
    "compatibilidad": "repuestoscel-compatibilidad-banner-v2.webp",
    "volumen": "repuestoscel-volumen-banner-v2.webp",
    "faq": "repuestoscel-preguntas-banner-v2.webp",
}


def _open(page, local_site_url: str):
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(f"{local_site_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("footer [data-info-page]")
    page.wait_for_function("document.querySelectorAll('#productsGrid .product-card').length > 0")
    return errors


def test_footer_has_no_dead_links_and_categories_filter_catalog(page, local_site_url):
    errors = _open(page, local_site_url)

    links = page.locator("footer a")
    assert links.count() >= 18
    hrefs = links.evaluate_all("elements => elements.map(element => element.getAttribute('href'))")
    assert all(href and href != "#" for href in hrefs)
    assert page.locator("footer [data-footer-category]").count() == 7

    page.locator('footer [data-footer-category="pantallas"]').click()
    page.wait_for_function(
        "document.querySelector('#productsFilterInfo').textContent.toLowerCase().includes('pantallas')"
    )
    assert page.locator("#productsFilterActions .filter-chip.active").inner_text().startswith("Pantallas")
    assert errors == []


@pytest.mark.parametrize(
    "slug",
    ["sobre", "guia", "compatibilidad", "volumen", "faq", "garantias", "envios", "terminos", "privacidad", "cookies"],
)
def test_every_information_link_opens_real_content(page, local_site_url, slug):
    errors = _open(page, local_site_url)
    page.locator(f'footer [data-info-page="{slug}"]').click()

    modal = page.locator("#infoModal")
    assert modal.get_attribute("aria-hidden") == "false"
    assert modal.locator("#infoModalTitle").inner_text().strip()
    assert len(modal.locator(".info-content").inner_text().strip()) > 60
    banner = modal.locator(".info-banner")
    assert banner.count() == (1 if slug in BANNER_ASSETS else 0)
    if slug in BANNER_ASSETS:
        assert banner.get_attribute("src").endswith(BANNER_ASSETS[slug])
        assert banner.evaluate("image => image.complete && image.naturalWidth > 0")

    page.locator("#infoModalCloseBtn").click()
    assert modal.get_attribute("aria-hidden") == "true"
    assert errors == []


def test_information_cta_prefills_contact_and_escape_restores_focus(page, local_site_url):
    errors = _open(page, local_site_url)
    trigger = page.locator('footer [data-info-page="volumen"]')
    trigger.click()
    page.get_by_role("button", name="Solicitar cotización por volumen").click()

    assert page.locator("#infoModal").get_attribute("aria-hidden") == "true"
    assert page.locator("#messageInput").input_value().startswith("Hola, necesito una cotización por volumen")

    guide = page.locator('footer [data-info-page="guia"]')
    guide.click()
    page.keyboard.press("Escape")
    assert page.locator("#infoModal").get_attribute("aria-hidden") == "true"
    assert guide.evaluate("element => element === document.activeElement")
    assert errors == []


@pytest.mark.parametrize("theme", ["light", "dark"])
@pytest.mark.parametrize(
    "viewport",
    [{"width": 320, "height": 700}, {"width": 390, "height": 844}],
    ids=["mobile-320", "mobile-390"],
)
def test_information_center_mobile_in_both_themes(browser, local_site_url, theme, viewport):
    context = browser.new_context(
        viewport=viewport,
        locale="es-CO",
        color_scheme=theme,
    )
    context.add_init_script(
        f"localStorage.setItem('repuestoscel_theme_mode', '{theme}')"
    )
    try:
        page = context.new_page()
        errors = _open(page, local_site_url)
        page.locator('footer [data-info-page="guia"]').click()
        page.wait_for_selector("#infoModal.open")
        page.wait_for_timeout(400)

        metrics = page.evaluate(
            """
            () => {
              const modal = document.querySelector('#infoModal .info-modal');
              const rect = modal.getBoundingClientRect();
              return {
                width: rect.width,
                height: rect.height,
                viewportWidth: innerWidth,
                viewportHeight: innerHeight,
                pageOverflow: document.documentElement.scrollWidth > innerWidth,
                theme: document.documentElement.dataset.theme,
              };
            }
            """
        )
        assert metrics["theme"] == theme
        assert metrics["width"] == metrics["viewportWidth"]
        assert metrics["height"] == metrics["viewportHeight"]
        assert metrics["pageOverflow"] is False
        assert page.locator("#infoModal .info-banner").is_visible()
        assert errors == []
    finally:
        context.close()
