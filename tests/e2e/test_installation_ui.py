"""Read-only browser scenarios; never submit an order or contact a gateway."""
import pytest


@pytest.mark.parametrize('mobile', [False, True], ids=['desktop','mobile'])
@pytest.mark.parametrize('theme', ['light','dark'])
def test_optional_installation_cart_checkout_and_coverage(browser, local_site_url, mobile, theme):
    context = browser.new_context(viewport={'width': 390 if mobile else 1440, 'height':844 if mobile else 1000}, is_mobile=mobile, color_scheme=theme)
    try:
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(local_site_url, wait_until='load')
        page.evaluate("addToCart({productId:'screen',name:'Pantalla de prueba',category:'pantallas',price:200000})")
        page.locator('#cartNavBtn').click()
        assert page.locator('#cartInstallation').is_visible()
        assert not page.locator('#installationOptIn').is_checked()
        assert '200.000' in page.locator('#cartTotal').inner_text()
        page.locator('#installationOptIn').check()
        assert '300.000' in page.locator('#cartTotal').inner_text()
        assert page.locator('#checkoutBtn').is_visible()
        button_box = page.locator('#checkoutBtn').bounding_box()
        assert button_box['y'] + button_box['height'] <= page.viewport_size['height']
        page.locator('#checkoutBtn').click()
        assert page.locator('#checkoutInstallation').is_visible()
        assert page.locator('input[name="checkoutProvider"]').count() == 1
        body = page.evaluate('checkoutPayload()')
        assert body['provider'] == 'wompi'
        assert body['installation']['productId'] == 'screen'
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.locator('#checkoutCity').fill('Soacha')
        assert 'solo está disponible' in page.locator('#checkoutInstallation').inner_text()
        assert not page.locator('#checkoutCity').evaluate('element => element.checkValidity()')
        page.locator('#checkoutInstallation button').click()
        assert page.evaluate('checkoutPayload().installation') is None
        assert page.locator('#checkoutCity').evaluate('element => element.checkValidity()')
        assert errors == []
    finally:
        context.close()


def test_eligibility_detail_and_removal(page, local_site_url):
    page.goto(local_site_url, wait_until='load')
    page.evaluate("openProductDetail({productId:'screen',name:'Pantalla',category:'pantallas',price:200000,stock:5,images:[],variants:[]})")
    assert page.locator('.installation-detail').is_visible()
    page.evaluate('closeProductDetail()')
    page.evaluate("addToCart({productId:'tool',name:'Herramienta',category:'herramientas-diy',price:10000})")
    page.locator('#cartNavBtn').click()
    assert page.locator('#cartInstallation').is_hidden()
    page.evaluate("addToCart({productId:'screen',name:'Pantalla',category:'pantallas',price:200000}); renderCart()")
    page.locator('#installationOptIn').check()
    page.evaluate("removeFromCart('screen::base')")
    page.wait_for_function('selectedInstallation() === null')
    assert page.locator('#cartInstallation').is_hidden()
    assert '10.000' in page.locator('#cartTotal').inner_text()
