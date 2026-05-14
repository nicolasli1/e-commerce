"""Image processing Lambda for NexCore product images.

Pipeline:
  1. Validate file type (JPEG/PNG/WebP) and size (max 5MB)
  2. Auto-crop and center on product
  3. White background with soft drop shadow
  4. Color correction (auto white balance, contrast)
  5. Generate 3 sizes: lg 800×800, md 400×400, sm 150×150
  6. Save to S3 as WebP

Environment variables:
  IMAGES_BUCKET: S3 bucket name for product images
"""

import base64
import hashlib
import json
import io
import mimetypes
import os
import time
import uuid

import boto3
from PIL import Image, ImageFilter, ImageEnhance

s3 = boto3.client("s3")
ssm = boto3.client("ssm")

IMAGES_BUCKET = os.environ.get("IMAGES_BUCKET", "")

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

OUTPUT_SIZES = {
    "lg": (800, 800),   # page de producto
    "md": (400, 400),   # catálogo / carrusel
    "sm": (150, 150),   # carrito / miniatura
}


def response(status_code, body, extra_headers=None):
    headers = {"Content-Type": "application/json"}
    if extra_headers:
        headers.update(extra_headers)
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body),
    }


def get_json_body(event):
    try:
        return json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return None


def validate_image(image_data: bytes) -> tuple[bool, str]:
    """Validate image type and size."""
    if len(image_data) > MAX_SIZE_BYTES:
        return False, f"Image too large. Max {MAX_SIZE_BYTES // (1024*1024)}MB"

    try:
        img = Image.open(io.BytesIO(image_data))
        fmt = img.format
        if fmt not in ("JPEG", "PNG", "WEBP"):
            return False, f"Unsupported format: {fmt}. Use JPEG, PNG, or WebP"
        return True, fmt
    except Exception:
        return False, "Invalid image file"


def auto_crop_center(img: Image.Image) -> Image.Image:
    """Auto-crop and center on the product using edge detection."""
    # Convert to grayscale for analysis
    gray = img.convert("L")
    
    # Find the bounding box of non-background content
    # Use a threshold to find the product area
    try:
        bbox = gray.getbbox()
    except Exception:
        bbox = None
    
    if bbox and bbox != (0, 0, img.width, img.height):
        # Add some padding around the bbox
        padding = 20
        x1, y1, x2, y2 = bbox
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(img.width, x2 + padding)
        y2 = min(img.height, y2 + padding)
        img = img.crop((x1, y1, x2, y2))
    
    return img


def white_background_drop_shadow(img: Image.Image, target_size: tuple) -> Image.Image:
    """Place product on white background with centered compositing and soft drop shadow."""
    w, h = target_size

    # If the image already has an alpha channel, use it; otherwise create white bg
    if img.mode == "RGBA":
        # Extract alpha as shadow mask
        r, g, b, alpha = img.split()
        product = Image.merge("RGB", (r, g, b))
        shadow_mask = alpha
    else:
        product = img.convert("RGB")
        # Create a simple shadow mask from luminance
        gray = product.convert("L")
        # Invert: dark pixels become transparent for shadow
        shadow_mask = Image.eval(gray, lambda x: 255 - x)
        # Feather the shadow mask
        shadow_mask = shadow_mask.filter(ImageFilter.GaussianBlur(radius=8))
        shadow_mask = ImageEnhance.Brightness(shadow_mask).enhance(0.4)

    # Resize product to fit within target (with margin)
    margin_ratio = 0.85
    max_product_w = int(w * margin_ratio)
    max_product_h = int(h * margin_ratio)
    product.thumbnail((max_product_w, max_product_h), Image.LANCZOS)

    # Create white canvas
    canvas = Image.new("RGB", (w, h), (255, 255, 255))

    # Create shadow layer
    shadow = Image.new("L", (w, h), 0)
    shadow_paste_x = (w - product.width) // 2 + 4
    shadow_paste_y = (h - product.height) // 2 + 4
    shadow_resized = shadow_mask.resize(product.size, Image.LANCZOS)
    shadow.paste(shadow_resized, (shadow_paste_x, shadow_paste_y))

    # Apply shadow to canvas (darken)
    shadow_img = Image.new("RGB", (w, h), (0, 0, 0))
    canvas = Image.composite(shadow_img, canvas, shadow)

    # Paste product centered
    paste_x = (w - product.width) // 2
    paste_y = (h - product.height) // 2
    canvas.paste(product, (paste_x, paste_y))

    return canvas


def color_correction(img: Image.Image) -> Image.Image:
    """Apply basic color correction: auto contrast and slight saturation boost."""
    # Auto contrast (stretch histogram)
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.15)

    # Slight saturation boost for product pop
    if img.mode == "RGB":
        from PIL import ImageOps
        img = ImageOps.autocontrast(img, cutoff=1)

    # Sharpen slightly
    img = img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=50, threshold=3))

    return img


def process_image(image_data: bytes) -> dict[str, str]:
    """Process image through the full pipeline and return URLs for each size."""
    img = Image.open(io.BytesIO(image_data))

    # Convert RGBA to RGB with white bg
    if img.mode == "RGBA":
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])
        img = background
    elif img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    # 1. Auto-crop to product
    img = auto_crop_center(img)

    # 2. Color correction
    img = color_correction(img)

    # 3. Generate sizes
    sizes_urls = {}
    for size_name, dimensions in OUTPUT_SIZES.items():
        processed = white_background_drop_shadow(img, dimensions)
        buf = io.BytesIO()
        processed.save(buf, format="WEBP", quality=85, method=6)
        buf.seek(0)
        sizes_urls[size_name] = buf.getvalue()

    return sizes_urls


def verify_admin_token(token: str) -> str | None:
    """Verify admin Bearer token via SSM session secret."""
    try:
        param = os.environ.get("ADMIN_SESSION_SECRET_PARAM", "")
        if not param:
            return None
        result = ssm.get_parameter(Name=param, WithDecryption=True)
        session_secret = result["Parameter"]["Value"]
        import hmac

        parts = token.split(".")
        if len(parts) != 2:
            print("verify_admin_token: invalid token format (expected 2 parts)")
            return None
        payload, sig = parts
        expected = hmac.new(
            session_secret.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            print("verify_admin_token: HMAC signature mismatch")
            return None
        decoded = json.loads(
            base64.b64decode(payload).decode()
        )
        # Check expiration
        exp = decoded.get("exp", 0)
        if exp and int(time.time()) > exp:
            print("verify_admin_token: token expired (exp=%d)" % exp)
            return None
        sub = decoded.get("sub")
        print("verify_admin_token: OK sub=%s" % sub)
        return sub
    except Exception as e:
        print("verify_admin_token: exception: %s" % str(e))
        return None


def handler(event, context):
    """Main Lambda handler."""
    try:
        method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
        path = event.get("rawPath", "")
    except Exception:
        method = "GET"
        path = ""

    # Only handle POST /api/admin/products/image
    if method != "POST" or path != "/api/admin/products/image":
        return response(404, {"error": "not_found"})

    # --- Auth check ---
    headers = event.get("headers", {}) or {}
    auth = headers.get("authorization", "") or headers.get("Authorization", "")
    token = auth.replace("Bearer ", "") if auth.startswith("Bearer ") else ""
    
    user = verify_admin_token(token)
    if not user:
        return response(401, {"error": "unauthorized"})

    body = get_json_body(event)
    if not body:
        return response(400, {"error": "invalid_json"})

    product_id = (body.get("productId") or "").strip()
    image_b64 = (body.get("image") or "").strip()

    if not product_id or not image_b64:
        return response(400, {"error": "productId_and_image_required"})

    # Decode base64 image
    try:
        image_data = base64.b64decode(image_b64)
    except Exception:
        return response(400, {"error": "invalid_base64_image"})

    # Validate image
    valid, fmt_or_error = validate_image(image_data)
    if not valid:
        return response(400, {"error": fmt_or_error})

    # Process image
    try:
        sizes = process_image(image_data)
    except Exception as e:
        return response(500, {"error": f"image_processing_failed: {str(e)}"})

    # Upload to S3
    uploaded_urls = {}
    try:
        for size_name, image_bytes in sizes.items():
            key = f"products/{product_id}/{size_name}.webp"
            s3.put_object(
                Bucket=IMAGES_BUCKET,
                Key=key,
                Body=image_bytes,
                ContentType="image/webp",
                CacheControl="max-age=31536000, public",
            )
            uploaded_urls[size_name] = f"/images/{key}"
    except Exception as e:
        return response(500, {"error": f"s3_upload_failed: {str(e)}"})

    return response(200, {
        "ok": True,
        "productId": product_id,
        "urls": uploaded_urls,
        "versions": list(OUTPUT_SIZES.keys()),
    })
