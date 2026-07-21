from pathlib import Path


def test_public_products_include_hero_featured_flag():
    """The storefront carousel depends on heroFeatured from /api/products."""
    source = Path("infra/cdk/lambda_src/api_handler.py.tmpl").read_text()
    assert '"heroFeatured": bool(p.get("heroFeatured", False))' in source
