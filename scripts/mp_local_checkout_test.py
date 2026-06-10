#!/usr/bin/env python3
"""
Create a local Mercado Pago Checkout Pro preference using test credentials.

This script is intentionally isolated from AWS so we can validate whether
Mercado Pago test credentials and test buyer flow work end-to-end on localhost.

Usage:
  export MERCADOPAGO_ACCESS_TOKEN='TEST-...'
  python3 scripts/mp_local_checkout_test.py

Optional env vars:
  MERCADOPAGO_TEST_TITLE='RepuestosCel local test'
  MERCADOPAGO_TEST_PRICE='49900'
  MERCADOPAGO_TEST_EMAIL='test@testuser.com'
  MERCADOPAGO_TEST_PORT='8787'
  MERCADOPAGO_BASE_URL='https://your-public-https-url'
"""

from __future__ import annotations

import json
import os
import sys
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer

import mercadopago


def env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


def required_env(name: str) -> str:
    value = env(name)
    if not value:
        raise SystemExit(
            f"Missing required environment variable: {name}\n"
            f"Set it before running the script."
        )
    return value


class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        parsed = urllib.parse.urlsplit(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        body = {
            "path": parsed.path,
            "params": {key: values[0] if len(values) == 1 else values for key, values in params.items()},
        }
        payload = json.dumps(body, indent=2, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt, *args):  # noqa: A003
        return


def start_callback_server(port: int) -> HTTPServer:
    server = HTTPServer(("127.0.0.1", port), CallbackHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def build_preference(base_url: str) -> dict:
    title = env("MERCADOPAGO_TEST_TITLE", "RepuestosCel local test")
    email = env("MERCADOPAGO_TEST_EMAIL", "test@testuser.com")
    price = int(float(env("MERCADOPAGO_TEST_PRICE", "49900")))
    preference = {
        "items": [
            {
                "title": title,
                "quantity": 1,
                "currency_id": "COP",
                "unit_price": price,
            }
        ],
        "payer": {
            "email": email,
        },
        "external_reference": "repuestoscel-local-checkout-test",
    }
    if base_url.startswith("https://"):
        preference["back_urls"] = {
            "success": f"{base_url}/success",
            "failure": f"{base_url}/failure",
            "pending": f"{base_url}/pending",
        }
        preference["auto_return"] = "approved"
    return preference


def main() -> int:
    access_token = required_env("MERCADOPAGO_ACCESS_TOKEN")
    port = int(env("MERCADOPAGO_TEST_PORT", "8787"))
    base_url = env("MERCADOPAGO_BASE_URL", f"http://127.0.0.1:{port}")

    server = start_callback_server(port)
    sdk = mercadopago.SDK(access_token)
    preference = build_preference(base_url)

    try:
        result = sdk.preference().create(preference)
        status = result.get("status")
        response = result.get("response") or {}
        if status not in (200, 201):
            print("Mercado Pago returned an error while creating the preference.", file=sys.stderr)
            print(json.dumps(result, indent=2, ensure_ascii=False), file=sys.stderr)
            return 1

        print("Local callback server:", f"http://127.0.0.1:{port}")
        print("Configured base URL:", base_url)
        print("Preference ID:", response.get("id", ""))
        print("Init point:", response.get("init_point", ""))
        print("Sandbox init point:", response.get("sandbox_init_point", ""))
        print()
        print("Use this flow:")
        print("1. Open the sandbox/init point in an incognito window.")
        print("2. Log in with your Mercado Pago test buyer user.")
        print("3. Use official test cards only.")
        if base_url.startswith("https://"):
            print("4. When Mercado Pago redirects back, your callback URL should receive the returned query params.")
        else:
            print("4. No automatic return URL was sent because Mercado Pago requires HTTPS back_urls.")
            print("   If you want redirect testing too, expose localhost with a public HTTPS tunnel and set MERCADOPAGO_BASE_URL.")
        print()
        print("Press Ctrl+C to stop the local callback server once you finish the test.")
        threading.Event().wait()
    except KeyboardInterrupt:
        print("\nStopping local callback server...")
        return 0
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    raise SystemExit(main())
