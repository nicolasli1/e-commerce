"""
Unit tests for NexCore CRUD operations.

Tests the product/lead/quote logic that mirrors the inline Lambda code.
Uses moto to mock DynamoDB.
"""

import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
import pytest
from moto import mock_aws

mock_dynamodb = mock_aws

# ─── Fixtures ─────────────────────────────────────────────────


@pytest.fixture
def dynamo_tables():
    """Crea tablas DynamoDB mock para testing."""
    with mock_dynamodb():
        import boto3
        client = boto3.client("dynamodb", region_name="us-east-1")

        # Crear tabla de productos
        client.create_table(
            TableName="test-products",
            KeySchema=[{"AttributeName": "productId", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "productId", "AttributeType": "S"}
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        # Crear tabla de leads
        client.create_table(
            TableName="test-leads",
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )

        # Crear tabla de quotes
        client.create_table(
            TableName="test-quotes",
            KeySchema=[{"AttributeName": "quoteId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "quoteId", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )

        yield {
            "products": boto3.resource("dynamodb", region_name="us-east-1").Table(
                "test-products"
            ),
            "leads": boto3.resource("dynamodb", region_name="us-east-1").Table(
                "test-leads"
            ),
            "quotes": boto3.resource("dynamodb", region_name="us-east-1").Table(
                "test-quotes"
            ),
        }


# ─── Helpers (replican funciones de Lambda inline) ───────────


def create_product(table, data: dict) -> dict:
    required = ["name", "price"]
    for field in required:
        if not data.get(field):
            return {"statusCode": 400, "error": f"missing_field: {field}"}

    item = {
        "productId": str(uuid.uuid4()),
        "name": data["name"].strip(),
        "description": (data.get("description") or "").strip(),
        "price": Decimal(str(data["price"])),
        "category": (data.get("category") or "general").strip(),
        "imageUrl": (data.get("imageUrl") or "").strip(),
        "stock": int(data.get("stock", 0)),
        "status": data.get("status", "active").strip(),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    table.put_item(Item=item)
    return {"statusCode": 201, "product": item}


def list_products(table) -> list:
    items = table.scan().get("Items", [])
    items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return items


def update_product(table, product_id: str, data: dict) -> dict:
    existing = table.get_item(Key={"productId": product_id}).get("Item")
    if not existing:
        return {"statusCode": 404, "error": "not_found"}

    updates = {}
    for field in ["name", "description", "category", "imageUrl", "status"]:
        if field in data:
            updates[field] = data[field]
    if "price" in data:
        updates["price"] = Decimal(str(data["price"]))
    if "stock" in data:
        updates["stock"] = int(data["stock"])

    updates["updatedAt"] = datetime.now(timezone.utc).isoformat()

    update_expr = "SET " + ", ".join(f"#{k}=:v{k}" for k in updates)
    attr_names = {f"#{k}": k for k in updates}
    attr_vals = {f":v{k}": v for k, v in updates.items()}

    table.update_item(
        Key={"productId": product_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_vals,
        ReturnValues="ALL_NEW",
    )
    updated = table.get_item(Key={"productId": product_id}).get("Item")
    # Convert Decimal back to float for JSON serialization
    if updated and "price" in updated:
        updated["price"] = float(updated["price"])
    return {"statusCode": 200, "product": updated}


def delete_product(table, product_id: str) -> dict:
    existing = table.get_item(Key={"productId": product_id}).get("Item")
    if not existing:
        return {"statusCode": 404, "error": "not_found"}
    table.update_item(
        Key={"productId": product_id},
        UpdateExpression="SET #st=:val, #ut=:now",
        ExpressionAttributeNames={"#st": "status", "#ut": "updatedAt"},
        ExpressionAttributeValues={
            ":val": "deleted",
            ":now": datetime.now(timezone.utc).isoformat(),
        },
    )
    return {"statusCode": 200, "ok": True}


def create_lead(table, data: dict) -> dict:
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    message = (data.get("message") or "").strip()
    if not name or not email:
        return {"statusCode": 400, "error": "name_and_email_required"}

    item = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "message": message,
        "contacted": False,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    table.put_item(Item=item)
    return {"statusCode": 201, "leadId": item["id"]}


# ─── Tests: Products ─────────────────────────────────────────


class TestProducts:
    def test_create_product(self, dynamo_tables):
        table = dynamo_tables["products"]
        result = create_product(
            table, {"name": "Ryzen 7 9800X3D", "price": 479.99, "category": "cpu"}
        )
        assert result["statusCode"] == 201
        assert result["product"]["name"] == "Ryzen 7 9800X3D"
        assert float(result["product"]["price"]) == 479.99
        assert result["product"]["category"] == "cpu"
        assert result["product"]["status"] == "active"
        assert "productId" in result["product"]

    def test_create_product_missing_name(self, dynamo_tables):
        table = dynamo_tables["products"]
        result = create_product(table, {"price": 479.99})
        assert result["statusCode"] == 400

    def test_create_product_missing_price(self, dynamo_tables):
        table = dynamo_tables["products"]
        result = create_product(table, {"name": "Test"})
        assert result["statusCode"] == 400

    def test_list_products_empty(self, dynamo_tables):
        table = dynamo_tables["products"]
        items = list_products(table)
        assert items == []

    def test_list_products_with_data(self, dynamo_tables):
        table = dynamo_tables["products"]
        create_product(table, {"name": "A", "price": 100})
        create_product(table, {"name": "B", "price": 200})
        items = list_products(table)
        assert len(items) == 2

    def test_update_product(self, dynamo_tables):
        table = dynamo_tables["products"]
        created = create_product(table, {"name": "Old", "price": 100})
        pid = created["product"]["productId"]
        result = update_product(table, pid, {"name": "New Name", "price": 150})
        assert result["statusCode"] == 200
        assert result["product"]["name"] == "New Name"
        assert float(result["product"]["price"]) == 150.0

    def test_update_product_not_found(self, dynamo_tables):
        table = dynamo_tables["products"]
        result = update_product(
            table, "nonexistent-id", {"name": "Test"}
        )
        assert result["statusCode"] == 404

    def test_delete_product_soft(self, dynamo_tables):
        table = dynamo_tables["products"]
        created = create_product(table, {"name": "To Delete", "price": 100})
        pid = created["product"]["productId"]
        result = delete_product(table, pid)
        assert result["statusCode"] == 200
        # Verificar soft-delete (status = deleted)
        item = table.get_item(Key={"productId": pid}).get("Item")
        assert item["status"] == "deleted"

    def test_delete_product_not_found(self, dynamo_tables):
        table = dynamo_tables["products"]
        result = delete_product(table, "nonexistent-id")
        assert result["statusCode"] == 404


# ─── Tests: Leads ────────────────────────────────────────────


class TestLeads:
    def test_create_lead_success(self, dynamo_tables):
        table = dynamo_tables["leads"]
        result = create_lead(
            table, {"name": "Juan", "email": "juan@test.com", "message": "Hola"}
        )
        assert result["statusCode"] == 201
        assert "leadId" in result

    def test_create_lead_no_name(self, dynamo_tables):
        table = dynamo_tables["leads"]
        result = create_lead(table, {"email": "juan@test.com"})
        assert result["statusCode"] == 400

    def test_create_lead_no_email(self, dynamo_tables):
        table = dynamo_tables["leads"]
        result = create_lead(table, {"name": "Juan"})
        assert result["statusCode"] == 400

    def test_create_lead_normalizes_email(self, dynamo_tables):
        table = dynamo_tables["leads"]
        result = create_lead(
            table, {"name": "Test", "email": "TEST@Example.COM"}
        )
        lead_id = result["leadId"]
        item = table.get_item(Key={"id": lead_id}).get("Item")
        assert item["email"] == "test@example.com"
