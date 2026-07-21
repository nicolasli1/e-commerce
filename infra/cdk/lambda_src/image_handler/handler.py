"""Image processing Lambda for RepuestosCel product images.

Pipeline:
  1. Validate file type (JPEG/PNG/WebP) and size (max 30MB)
  2. Strip EXIF metadata for security
  3. Smart background removal (dominant edge color detection)
  4. Auto-crop and center on product (using alpha mask)
  5. Color correction (auto white balance, contrast)
  6. Generate responsive product sizes for cards, detail and inspection zoom
     - Professional multi-layer drop shadow with diagonal offset
     - Adaptive WebP compression per size
     - Semi-transparent watermark
  7. Upload to S3 in parallel as WebP

Environment variables:
  IMAGES_BUCKET: S3 bucket name for product images
"""

import base64
import concurrent.futures
import hashlib
import hmac
import io
import json
import mimetypes
import os
import time
import uuid
import urllib.error
import urllib.request

import boto3
from PIL import Image, ImageFilter, ImageEnhance, ImageOps, ImageDraw, ImageFont

s3 = boto3.client("s3")
ssm = boto3.client("ssm")

IMAGES_BUCKET = os.environ.get("IMAGES_BUCKET", "")
REMOVEBG_API_KEY_PARAM = os.environ.get("REMOVEBG_API_KEY_PARAM", "")
REMOVEBG_API_KEY_REGION = os.environ.get("REMOVEBG_API_KEY_REGION") or os.environ.get("AWS_REGION", "us-east-1")

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES = 30 * 1024 * 1024  # 30 MB direct-to-S3 upload budget

OUTPUT_SIZES = {
    "xl": (4000, 4000),  # lupa / inspección técnica en desktop
    "lg": (2400, 2400),  # detalle / fullscreen
    "md": (1200, 1200),  # catálogo / carrusel
    "sm": (320, 320),    # carrito / miniatura
}

# Adaptive compression quality per size (higher res = more quality budget)
COMPRESSION_QUALITY = {
    "xl": 94,
    "lg": 92,
    "md": 86,
    "sm": 78,
}

# Color distance threshold for background detection
BG_COLOR_THRESHOLD = 60

_removebg_api_key_cache = None

SAFE_PRODUCT_ID_PATTERN = r"^[a-zA-Z0-9_\-]{1,128}$"
SAFE_ORIGINAL_KEY_PATTERN = r"^private/originals/[a-zA-Z0-9_\-]{1,128}/[a-zA-Z0-9_\-]{8,80}\.(jpg|jpeg|png|webp)$"
PRESIGN_MAX_AGE_SECONDS = 300


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


def image_has_transparency(img: Image.Image) -> bool:
    """Return True when the image already has a meaningful alpha mask."""
    if img.mode != "RGBA":
        return False
    alpha = img.getchannel("A")
    extrema = alpha.getextrema()
    return bool(extrema and extrema[0] < 250)


def get_removebg_api_key() -> str | None:
    """Load remove.bg API key from SSM once per warm Lambda container."""
    global _removebg_api_key_cache
    if _removebg_api_key_cache:
        return _removebg_api_key_cache
    if not REMOVEBG_API_KEY_PARAM:
        return None

    try:
        client = ssm
        if REMOVEBG_API_KEY_REGION and REMOVEBG_API_KEY_REGION != os.environ.get("AWS_REGION"):
            client = boto3.client("ssm", region_name=REMOVEBG_API_KEY_REGION)
        result = client.get_parameter(Name=REMOVEBG_API_KEY_PARAM, WithDecryption=True)
        _removebg_api_key_cache = result["Parameter"]["Value"]
        print("get_removebg_api_key: loaded key from SSM")
        return _removebg_api_key_cache
    except Exception as exc:
        print(f"get_removebg_api_key: unavailable ({exc})")
        return None


def remove_background_with_removebg(image_data: bytes) -> bytes | None:
    """Use remove.bg for high-quality background removal.

    Returns transparent PNG bytes on success, or None so the local pipeline can
    continue as a fallback.
    """
    api_key = get_removebg_api_key()
    if not api_key:
        return None

    boundary = "----RepuestosCelRemoveBgBoundary"
    fields = [
        (
            "size",
            None,
            b"50MP",
            None,
        ),
        (
            "type",
            None,
            b"product",
            None,
        ),
        (
            "format",
            None,
            b"webp",
            None,
        ),
        (
            "image_file",
            "product.jpg",
            image_data,
            "application/octet-stream",
        ),
    ]

    body = bytearray()
    for name, filename, value, content_type in fields:
        body.extend(f"--{boundary}\r\n".encode())
        disposition = f'Content-Disposition: form-data; name="{name}"'
        if filename:
            disposition += f'; filename="{filename}"'
        body.extend(f"{disposition}\r\n".encode())
        if content_type:
            body.extend(f"Content-Type: {content_type}\r\n".encode())
        body.extend(b"\r\n")
        body.extend(value)
        body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode())

    request = urllib.request.Request(
        "https://api.remove.bg/v1.0/removebg",
        data=bytes(body),
        method="POST",
        headers={
            "X-Api-Key": api_key,
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "image/webp,image/png",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=18) as resp:
            if resp.status != 200:
                print(f"remove_background_with_removebg: non-200 status {resp.status}")
                return None
            cleaned = resp.read()
        if not cleaned:
            return None
        print(f"remove_background_with_removebg: success bytes={len(cleaned)}")
        return cleaned
    except urllib.error.HTTPError as exc:
        detail = exc.read(300).decode("utf-8", "replace")
        print(f"remove_background_with_removebg: HTTP {exc.code} {detail}")
        return None
    except Exception as exc:
        print(f"remove_background_with_removebg: failed ({exc})")
        return None


# ──────────────────────────────────────────────
#  Helper: color utilities
# ──────────────────────────────────────────────

def _color_distance(c1, c2):
    """Euclidean distance between two RGB colors."""
    return sum((a - b) ** 2 for a, b in zip(c1[:3], c2[:3])) ** 0.5


def _detect_background_color(img: Image.Image) -> tuple:
    """Detect the dominant background color from image borders.
    
    Uses the most common color (mode) on the edges, which is more
    robust than average when the product touches the edges.
    """
    w, h = img.size
    from collections import Counter

    # Sample all four edges with higher density
    pixels = []
    num_samples = min(100, w, h)

    for x in range(0, w, max(1, w // num_samples)):
        pixels.append(img.getpixel((x, 0))[:3])
        pixels.append(img.getpixel((x, h - 1))[:3])

    for y in range(0, h, max(1, h // num_samples)):
        pixels.append(img.getpixel((0, y))[:3])
        pixels.append(img.getpixel((w - 1, y))[:3])

    if not pixels:
        return (255, 255, 255)

    # Quantize colors to 32 levels per channel to find dominant
    quantized = [(r // 32 * 32, g // 32 * 32, b // 32 * 32) for r, g, b in pixels]
    most_common = Counter(quantized).most_common(1)[0][0]

    # Refine: average all pixels in the dominant quantized bucket
    refined = [
        p for p in pixels
        if (p[0] // 32 * 32, p[1] // 32 * 32, p[2] // 32 * 32) == most_common
    ]
    bg_r = sum(p[0] for p in refined) // len(refined)
    bg_g = sum(p[1] for p in refined) // len(refined)
    bg_b = sum(p[2] for p in refined) // len(refined)

    print(f"_detect_background_color: detected bg ({bg_r},{bg_g},{bg_b}) from {len(refined)}/{len(pixels)} edge pixels")
    return (bg_r, bg_g, bg_b)


# ──────────────────────────────────────────────
#  Improvement 1: Smart Background Removal
# ──────────────────────────────────────────────

def smart_background_removal(img: Image.Image, threshold: int = BG_COLOR_THRESHOLD) -> Image.Image:
    """Remove solid-color background by detecting dominant edge color.
    
    Creates an alpha mask based on color distance from the detected
    background color, with smooth transitions at edges.
    Returns RGBA image with transparent background.
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    bg_color = _detect_background_color(img)
    w, h = img.size

    # Build alpha mask based on color distance from background
    alpha_mask = Image.new("L", (w, h), 0)
    mask_pixels = alpha_mask.load()

    # Process in blocks for decent performance on Lambda
    block_size = 4
    for y in range(0, h, block_size):
        for x in range(0, w, block_size):
            pixel = img.getpixel((x, y))
            dist = _color_distance(pixel, bg_color)

            if dist > threshold:
                alpha_value = 255  # Definitely product
            elif dist > threshold * 0.6:
                # Transition zone: smooth falloff
                t = (dist - threshold * 0.6) / (threshold * 0.4)
                alpha_value = int(t * 255)
            else:
                alpha_value = 0  # Background

            # Fill the block
            for dy in range(min(block_size, h - y)):
                for dx in range(min(block_size, w - x)):
                    mask_pixels[x + dx, y + dy] = alpha_value

    # Smooth mask edges for natural-looking transparency
    alpha_mask = alpha_mask.filter(ImageFilter.SMOOTH_MORE)
    alpha_mask = alpha_mask.filter(ImageFilter.SMOOTH_MORE)

    r, g, b, _ = img.split()
    result = Image.merge("RGBA", (r, g, b, alpha_mask))

    print(f"smart_background_removal: applied alpha mask ({w}x{h})")
    return result


# ──────────────────────────────────────────────
#  Auto-crop (now alpha-aware)
# ──────────────────────────────────────────────

def auto_crop_center(img: Image.Image) -> Image.Image:
    """Auto-crop and center on the product.
    
    If the image has an alpha channel, uses it for precise product
    detection. Otherwise falls back to grayscale edge detection.
    """
    w, h = img.size

    if img.mode == "RGBA":
        # Alpha channel gives exact product bounds
        alpha = img.split()[3]
        bbox = alpha.getbbox()
    else:
        # Fallback: grayscale bounding box
        gray = img.convert("L")
        try:
            bbox = gray.getbbox()
        except Exception:
            bbox = None

    if bbox and bbox != (0, 0, w, h):
        # Add padding around the product
        padding = 20
        x1, y1, x2, y2 = bbox
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(w, x2 + padding)
        y2 = min(h, y2 + padding)
        img = img.crop((x1, y1, x2, y2))

    return img


# ──────────────────────────────────────────────
#  Improvement 5: EXIF Stripping (security)
# ──────────────────────────────────────────────

def strip_exif(img: Image.Image) -> Image.Image:
    """Strip all EXIF/metadata from image for security and privacy.
    
    Even though WebP output strips EXIF naturally, this is an explicit
    defense-in-depth step at the earliest point in the pipeline.
    """
    data = io.BytesIO()
    # PNG format discards JPEG EXIF data
    img.save(data, format="PNG")
    data.seek(0)
    clean = Image.open(data)
    # Preserve original mode (RGBA stays RGBA)
    if clean.mode != img.mode:
        clean = clean.convert(img.mode)
    print("strip_exif: removed all metadata")
    return clean


# ──────────────────────────────────────────────
#  Improvement 2: Professional Multi-Layer Shadow
# ──────────────────────────────────────────────

def transparent_product_canvas(img: Image.Image, target_size: tuple) -> Image.Image:
    """Place product on a transparent canvas with a soft product shadow.
    
    Features:
    - Transparent WebP output that blends with the dark storefront
    - Multi-layer shadow: tight dark layer + wide soft layer
    - Diagonal offset (bottom-right) for natural lighting
    - Gradient opacity (denser near product edge)
    
    When the image has an alpha channel (from background removal),
    it uses the actual product silhouette for perfect shadows.
    """
    w, h = target_size

    # Extract product RGBA and shadow mask from alpha / luminance
    if img.mode == "RGBA":
        product = img.copy()
        alpha = product.split()[3]
        shadow_mask = alpha
    else:
        product = img.convert("RGBA")
        gray = product.convert("L")
        # Invert luminance so bright → transparent for shadow
        shadow_mask = Image.eval(gray, lambda x: 255 - x)

    # Resize product to fit within target (with margin)
    margin_ratio = 0.92
    max_product_w = int(w * margin_ratio)
    max_product_h = int(h * margin_ratio)
    product.thumbnail((max_product_w, max_product_h), Image.LANCZOS)
    shadow_mask = shadow_mask.resize(product.size, Image.LANCZOS)

    # Transparent canvas so the storefront controls the visual surface.
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    # Centered positions with diagonal shadow offset
    center_x = (w - product.width) // 2
    center_y = (h - product.height) // 2
    offset_x, offset_y = 6, 6  # bottom-right diagonal

    # ── Layer 1: Dark inner shadow (tight, higher opacity) ──
    shadow_dark = shadow_mask.filter(ImageFilter.GaussianBlur(radius=6))
    shadow_dark = ImageEnhance.Brightness(shadow_dark).enhance(0.5)

    shadow1 = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    shadow1_layer = Image.new("RGBA", product.size, (0, 0, 0, 120))
    shadow1_layer.putalpha(shadow_dark)
    canvas.alpha_composite(shadow1_layer, (center_x + offset_x, center_y + offset_y))

    # ── Layer 2: Soft outer shadow (wider, lower opacity) ──
    shadow_soft = shadow_mask.filter(ImageFilter.GaussianBlur(radius=16))
    shadow_soft = ImageEnhance.Brightness(shadow_soft).enhance(0.2)

    shadow2_layer = Image.new("RGBA", product.size, (0, 0, 0, 80))
    shadow2_layer.putalpha(shadow_soft)
    canvas.alpha_composite(shadow2_layer, (center_x + offset_x, center_y + offset_y))

    # ── Paste product centered (no offset) ──
    canvas.alpha_composite(product, (center_x, center_y))

    return canvas


# ──────────────────────────────────────────────
#  Improvement 3: Watermark
# ──────────────────────────────────────────────

def add_watermark(img: Image.Image) -> Image.Image:
    """Add semi-transparent 'RepuestosCel' watermark to bottom-right corner.
    
    Only applied to sizes >= md (skipped for sm thumbnails).
    """
    # Skip very small images (cart thumbnails)
    if img.width < 300:
        return img

    watermark = img.copy()
    draw = ImageDraw.Draw(watermark, "RGBA")

    # Font size proportional to image
    font_size = max(12, int(img.width * 0.035))
    try:
        # Try DejaVu Sans Bold (common on Lambda)
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            font_size,
        )
    except (IOError, OSError):
        # Fall back to default PIL font
        font = ImageFont.load_default()

    text = "RepuestosCel"

    # Measure text
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
    except Exception:
        tw, th = font_size * len(text) * 0.6, font_size

    # Position: bottom-right with margin
    margin = max(8, int(img.width * 0.03))
    x = img.width - tw - margin
    y = img.height - th - margin

    # Subtle shadow for readability against light backgrounds
    draw.text((x + 1, y + 1), text, font=font, fill=(0, 0, 0, 38))   # 15% black
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 64))      # 25% white

    print(f"add_watermark: '{text}' at ({x},{y}) font_size={font_size}")
    return watermark


# ──────────────────────────────────────────────
#  Color correction (preserves alpha)
# ──────────────────────────────────────────────

def color_correction(img: Image.Image) -> Image.Image:
    """Apply basic color correction: auto contrast and slight saturation boost."""
    # Work on RGB, preserve alpha
    if img.mode == "RGBA":
        r, g, b, a = img.split()
        rgb = Image.merge("RGB", (r, g, b))
    else:
        rgb = img.convert("RGB")
        a = None

    # Slight contrast boost
    enhancer = ImageEnhance.Contrast(rgb)
    rgb = enhancer.enhance(1.15)

    # Auto contrast (stretch histogram)
    rgb = ImageOps.autocontrast(rgb, cutoff=1)

    # Light sharpen
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.0, percent=50, threshold=3))

    # Re-attach alpha
    if a is not None:
        img = Image.merge("RGBA", (*rgb.split(), a))
    else:
        img = rgb

    return img


# ──────────────────────────────────────────────
#  Improvement 4 & 6: Parallel sizing + adaptive compression
# ──────────────────────────────────────────────

def process_size(img: Image.Image, size_name: str, dimensions: tuple) -> bytes:
    """Process a single image size: shadow + watermark + adaptive WebP compression."""
    # Transparent canvas with product shadow, designed for the dark storefront.
    processed = transparent_product_canvas(img, dimensions)

    # Adaptive compression
    quality = COMPRESSION_QUALITY.get(size_name, 80)
    buf = io.BytesIO()
    processed.save(buf, format="WEBP", quality=quality, method=4)
    buf.seek(0)
    bytes_out = buf.getvalue()

    print(
        f"process_size: {size_name} ({dimensions[0]}×{dimensions[1]}) "
        f"quality={quality} bytes={len(bytes_out)}"
    )
    return bytes_out


def upload_size(s3_client, bucket: str, product_id: str, size_name: str, image_bytes: bytes) -> tuple:
    """Upload a single image size to S3. Returns (size_name, url_path)."""
    key = f"images/products/{product_id}/{size_name}.webp"
    s3_client.put_object(
        Bucket=bucket,
        Key=key,
        Body=image_bytes,
        ContentType="image/webp",
        CacheControl="max-age=31536000, public",
    )
    print(f"upload_size: uploaded {key}")
    return (size_name, f"/{key}")


def upload_original(s3_client, bucket: str, product_id: str, upload_id: str, extension: str, image_bytes: bytes, content_type: str) -> str:
    """Persist the source image so future pipelines can reprocess it."""
    key = f"private/originals/{product_id}/{upload_id}.{extension}"
    s3_client.put_object(
        Bucket=bucket,
        Key=key,
        Body=image_bytes,
        ContentType=content_type,
        CacheControl="private, max-age=31536000",
        Metadata={
            "product-id": product_id,
            "upload-id": upload_id,
            "source": "legacy-base64-fallback",
        },
    )
    print(f"upload_original: uploaded {key}")
    return key


def _file_extension_from_content_type(content_type: str) -> str | None:
    normalized = (content_type or "").split(";")[0].strip().lower()
    if normalized == "image/jpeg":
        return "jpg"
    if normalized == "image/png":
        return "png"
    if normalized == "image/webp":
        return "webp"
    return None


def _content_type_from_extension(extension: str) -> str:
    ext = (extension or "").lower().lstrip(".")
    if ext in ("jpg", "jpeg"):
        return "image/jpeg"
    if ext == "png":
        return "image/png"
    if ext == "webp":
        return "image/webp"
    return "application/octet-stream"


def _sanitize_product_id(product_id: str) -> bool:
    import re as _re
    return bool(_re.match(SAFE_PRODUCT_ID_PATTERN, product_id or ""))


def _sanitize_original_key(key: str) -> bool:
    import re as _re
    return bool(_re.match(SAFE_ORIGINAL_KEY_PATTERN, key or ""))


def _upload_processed_sizes(product_id: str, sizes: dict[str, bytes]) -> dict:
    uploaded_urls = {}
    # Large 4000px canvases are memory-heavy. Keep limited concurrency for Lambda stability.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future_to_size = {
            executor.submit(
                upload_size, s3, IMAGES_BUCKET, product_id, name, data
            ): name
            for name, data in sizes.items()
        }

        for future in concurrent.futures.as_completed(future_to_size):
            name, url = future.result()
            uploaded_urls[name] = url
    return uploaded_urls


def process_image(image_data: bytes) -> dict[str, bytes]:
    """Process image through the full pipeline.

    Steps:
      1. Strip EXIF
      2. Smart background removal (RGBA with transparency)
      3. Auto-crop to product
      4. Color correction
      5. Generate all 3 sizes in parallel (shadow + watermark + compression)
    """
    removebg_image_data = remove_background_with_removebg(image_data)
    if removebg_image_data:
        image_data = removebg_image_data

    img = Image.open(io.BytesIO(image_data))

    # Step 0 — Strip EXIF (security, defense-in-depth)
    # ──────────────────────────────────────────────
    img = strip_exif(img)

    # Step 1 — Smart background removal → RGBA with transparent bg.
    # If remove.bg already returned a transparent PNG, keep its alpha mask.
    # ──────────────────────────────────────────────
    if image_has_transparency(img.convert("RGBA")):
        img = img.convert("RGBA")
        print("process_image: using existing transparent alpha mask")
    else:
        img = smart_background_removal(img)

    # Step 2 — Auto-crop using alpha channel
    # ──────────────────────────────────────────────
    img = auto_crop_center(img)

    # Step 3 — Color correction (preserves alpha)
    # ──────────────────────────────────────────────
    img = color_correction(img)

    # Step 4 — Generate all sizes in parallel
    # ──────────────────────────────────────────────
    size_bytes: dict[str, bytes] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future_to_size = {
            executor.submit(process_size, img, name, dim): name
            for name, dim in OUTPUT_SIZES.items()
        }

        for future in concurrent.futures.as_completed(future_to_size):
            name = future_to_size[future]
            try:
                size_bytes[name] = future.result()
            except Exception as exc:
                print(f"process_image: error in size '{name}': {exc}")
                raise

    return size_bytes


# ──────────────────────────────────────────────
#  Auth
# ──────────────────────────────────────────────

def verify_admin_token(token: str) -> str | None:
    """Verify admin Bearer token via SSM session secret."""
    try:
        param = os.environ.get("ADMIN_SESSION_SECRET_PARAM", "")
        if not param:
            return None
        result = ssm.get_parameter(Name=param, WithDecryption=True)
        session_secret = result["Parameter"]["Value"]

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


# ──────────────────────────────────────────────
#  Lambda Handler
# ──────────────────────────────────────────────

def handler(event, context):
    """Main Lambda handler."""
    try:
        method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
        path = event.get("rawPath", "")
    except Exception:
        method = "GET"
        path = ""

    allowed_paths = {
        "/api/admin/products/image",
        "/api/admin/products/image/upload-url",
        "/api/admin/products/image/process",
    }
    if method != "POST" or path not in allowed_paths:
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
    if not product_id:
        return response(400, {"error": "product_id_required"})
    if not _sanitize_product_id(product_id):
        return response(400, {"error": "invalid_product_id"})

    if path == "/api/admin/products/image/upload-url":
        content_type = (body.get("contentType") or "").split(";")[0].strip().lower()
        extension = _file_extension_from_content_type(content_type)
        if not extension:
            return response(400, {"error": "unsupported_content_type"})
        try:
            size_bytes = int(body.get("size") or 0)
        except Exception:
            size_bytes = 0
        if size_bytes <= 0 or size_bytes > MAX_SIZE_BYTES:
            return response(400, {"error": f"Image too large. Max {MAX_SIZE_BYTES // (1024*1024)}MB"})

        upload_id = uuid.uuid4().hex
        object_key = f"private/originals/{product_id}/{upload_id}.{extension}"
        upload_metadata = {
            "product-id": product_id,
            "upload-id": upload_id,
            "uploaded-by": user,
        }
        upload_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": IMAGES_BUCKET,
                "Key": object_key,
                "ContentType": content_type,
                "Metadata": upload_metadata,
            },
            ExpiresIn=PRESIGN_MAX_AGE_SECONDS,
            HttpMethod="PUT",
        )
        upload_headers = {"Content-Type": content_type}
        upload_headers.update({f"x-amz-meta-{k}": v for k, v in upload_metadata.items()})
        return response(200, {
            "ok": True,
            "uploadUrl": upload_url,
            "uploadHeaders": upload_headers,
            "objectKey": object_key,
            "uploadId": upload_id,
            "maxSizeBytes": MAX_SIZE_BYTES,
            "expiresIn": PRESIGN_MAX_AGE_SECONDS,
        })

    if path == "/api/admin/products/image/process":
        object_key = (body.get("objectKey") or "").strip()
        if not _sanitize_original_key(object_key):
            return response(400, {"error": "invalid_original_key"})

        try:
            head = s3.head_object(Bucket=IMAGES_BUCKET, Key=object_key)
            content_length = int(head.get("ContentLength") or 0)
            content_type = (head.get("ContentType") or _content_type_from_extension(object_key.rsplit(".", 1)[-1])).split(";")[0].lower()
            if content_length <= 0 or content_length > MAX_SIZE_BYTES:
                return response(400, {"error": f"Image too large. Max {MAX_SIZE_BYTES // (1024*1024)}MB"})
            if content_type not in ALLOWED_TYPES:
                return response(400, {"error": "unsupported_content_type"})
            obj = s3.get_object(Bucket=IMAGES_BUCKET, Key=object_key)
            image_data = obj["Body"].read()
        except Exception as e:
            return response(400, {"error": f"original_image_unavailable: {str(e)}"})

        valid, fmt_or_error = validate_image(image_data)
        if not valid:
            return response(400, {"error": fmt_or_error})

        try:
            sizes = process_image(image_data)
            uploaded_urls = _upload_processed_sizes(product_id, sizes)
        except Exception as e:
            return response(500, {"error": f"image_processing_failed: {str(e)}"})

        return response(200, {
            "ok": True,
            "productId": product_id,
            "originalKey": object_key,
            "urls": uploaded_urls,
            "versions": list(OUTPUT_SIZES.keys()),
        })

    image_b64 = (body.get("image") or "").strip()
    if not image_b64:
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

    # Process image (full pipeline with parallel sub-processing)
    try:
        sizes = process_image(image_data)
    except Exception as e:
        return response(500, {"error": f"image_processing_failed: {str(e)}"})

    try:
        upload_id = uuid.uuid4().hex
        fmt = (fmt_or_error or "").lower()
        extension = "jpg" if fmt in ("jpeg", "jpg") else fmt
        original_key = upload_original(
            s3,
            IMAGES_BUCKET,
            product_id,
            upload_id,
            extension,
            image_data,
            _content_type_from_extension(extension),
        )
        uploaded_urls = _upload_processed_sizes(product_id, sizes)
    except Exception as e:
        return response(500, {"error": f"s3_upload_failed: {str(e)}"})

    return response(200, {
        "ok": True,
        "productId": product_id,
        "originalKey": original_key,
        "urls": uploaded_urls,
        "versions": list(OUTPUT_SIZES.keys()),
    })
