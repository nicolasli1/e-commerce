#!/usr/bin/env bash
# =============================================================================
# Build Pillow Lambda Layer
# =============================================================================
# Generates a Lambda-compatible layer zip with Pillow for Python 3.12.
#
# Usage:
#   bash scripts/build-pillow-layer.sh
#
# Output:
#   ./lambda_src/layers/pillow/python/lib/python3.12/site-packages/
#   Then zip it or reference via CDK's lambda_.Code.from_asset()
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAYER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/lambda_src/layers/pillow"
SITE_PACKAGES="${LAYER_DIR}/python/lib/python3.12/site-packages"

echo "🔧 Building Pillow Lambda Layer..."
echo "   Target: ${SITE_PACKAGES}"

mkdir -p "${SITE_PACKAGES}"

pip3 install Pillow==10.4.0 \
    --target="${SITE_PACKAGES}" \
    --only-binary=:all: \
    --python-version=3.12 \
    --platform=manylinux2014_x86_64 \
    --implementation=cp \
    -q

# Remove unnecessary files to reduce layer size
find "${SITE_PACKAGES}" -name "*.pyc" -delete
find "${SITE_PACKAGES}" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find "${SITE_PACKAGES}" -name "*.dist-info" -type d -exec rm -rf {} + 2>/dev/null || true
find "${SITE_PACKAGES}" -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true
find "${SITE_PACKAGES}" -name "test" -type d -exec rm -rf {} + 2>/dev/null || true

echo "✅ Pillow layer built at: ${LAYER_DIR}"
echo "   Size: $(du -sh "${LAYER_DIR}" | cut -f1)"
