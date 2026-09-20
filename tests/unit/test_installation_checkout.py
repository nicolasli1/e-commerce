"""Exercise the deployed handler, not a copied implementation; all AWS is mocked."""
import json
import types
from pathlib import Path

import boto3
import pytest
from moto import mock_aws


@pytest.fixture
def api(monkeypatch):
    monkeypatch.setenv('AWS_DEFAULT_REGION', 'us-east-1')
    with mock_aws():
        db = boto3.resource('dynamodb', region_name='us-east-1')
        for name, key in [('products', 'productId'), ('orders', 'reference'), ('leads', 'id'), ('quotes', 'quoteId')]:
            db.create_table(TableName='test-' + name, KeySchema=[{'AttributeName': key, 'KeyType': 'HASH'}], AttributeDefinitions=[{'AttributeName': key, 'AttributeType': 'S'}], BillingMode='PAY_PER_REQUEST')
        source = Path('infra/cdk/lambda_src/api_handler.py.tmpl').read_text()
        for name in ['products', 'orders', 'leads', 'quotes']:
            source = source.replace('__' + name.upper() + '_TABLE_NAME__', 'test-' + name)
        module = types.ModuleType('checkout_under_test')
        exec(compile(source, 'api_handler.py.tmpl', 'exec'), module.__dict__)
        monkeypatch.setattr(module, 'wompi_enabled', lambda: True)
        monkeypatch.setattr(module, 'get_wompi_public_key', lambda: 'pub_test_only')
        monkeypatch.setattr(module, 'get_wompi_integrity_secret', lambda: 'test-only-secret')
        for product, category in [('screen', 'pantallas'), ('tool', 'herramientas-diy')]:
            module.products_table.put_item(Item={'productId': product, 'name': product, 'category': category, 'price': 200000, 'stock': 5})
        yield module


def payload():
    return {'provider': 'wompi', 'shippingZone': 'bogota', 'cart': [{'productId': 'screen', 'quantity': 1}], 'customer': {'fullName': 'Prueba local', 'email': 'qa@example.invalid', 'phoneNumber': '3000000000'}, 'shippingAddress': {'city': 'Bogotá', 'country': 'CO', 'addressLine1': 'Dirección de prueba'}, 'installation': {'productId': 'screen'}}


def checkout(api, body):
    result = api.create_checkout_session({'body': json.dumps(body), 'headers': {'origin': 'https://repuestoscel.com'}})
    return result['statusCode'], json.loads(result['body'])


def test_installation_total_is_persisted_and_signed_by_wompi(api):
    body = payload()
    body['installation']['amountInCents'] = 1  # Never trust the browser's price.
    status, result = checkout(api, body)
    assert status == 201
    order = result['order']
    assert order['installationFeeInCents'] == 10000000
    assert order['amountInCents'] == order['subtotalInCents'] + order['deliveryFeeInCents'] + 10000000
    assert result['wompi']['amountInCents'] == order['amountInCents']
    widget = result['wompi']
    assert widget['signature']['integrity'] == api.build_integrity_signature(order['reference'], order['amountInCents'], 'COP', widget['expirationTime'])
    assert api.orders_table.get_item(Key={'reference': order['reference']})['Item']['installation']['quantity'] == 1
    public = json.loads(api.get_checkout_order(order['reference'])['body'])['order']
    assert public['installationFeeInCents'] == 10000000
    assert 'Instalación' in api.build_order_summary_lines(order)
    assert 'Instalación' in api.email_items_table(order)


def test_installation_is_not_preselected_or_multiplied_by_cart_quantity(api):
    body = payload()
    body['cart'][0]['quantity'] = 3
    status, result = checkout(api, body)
    assert status == 201
    assert result['order']['installationFeeInCents'] == 10000000
    body.pop('installation')
    status, result = checkout(api, body)
    assert status == 201
    assert result['order']['installation'] is None
    assert result['order']['installationFeeInCents'] == 0


@pytest.mark.parametrize('city,zone,country', [('Medellín','antioquia','CO'), ('Soacha','bogota','CO'), ('Bogotá','bogota','US'), ('Bogotá','antioquia','CO')])
def test_installation_rejects_outside_bogota_without_creating_order(api, city, zone, country):
    body = payload()
    body['shippingZone'] = zone
    body['shippingAddress'].update(city=city, country=country)
    assert checkout(api, body)[0] == 400
    assert api.orders_table.scan()['Count'] == 0


@pytest.mark.parametrize('selection', [{'productId':'tool'}, {'productId':'missing'}, {'productId':'screen', 'variantId':'wrong'}, True, []])
def test_installation_validates_cart_reference_and_type(api, selection):
    body = payload()
    body['installation'] = selection
    body['cart'].append({'productId':'tool','quantity':1})
    assert checkout(api, body)[0] == 400
    assert api.orders_table.scan()['Count'] == 0


@pytest.mark.parametrize('provider', ['mercadopago','nequi','interrapidisimo_cod'])
def test_disabled_payment_providers_cannot_create_orders(api, provider):
    body = payload()
    body['provider'] = provider
    assert checkout(api, body)[0] == 400
    assert api.orders_table.scan()['Count'] == 0
