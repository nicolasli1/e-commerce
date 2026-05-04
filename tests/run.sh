#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║        NexCore — Test Suite                     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ─── Instalar dependencias ────────────────────────────────
echo "📦 Instalando dependencias de testing..."
pip install -q -r "$ROOT_DIR/tests/requirements-test.txt"

# ─── Unit tests ────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "  🧪 UNIT TESTS"
echo "═══════════════════════════════════════════════"
cd "$ROOT_DIR" && python -m pytest tests/unit/ -v --tb=short "$@"
UNIT_EXIT=$?

# ─── E2E tests (si se piden explícitamente) ────────────────
if [ "${RUN_E2E:-}" = "true" ]; then
    echo ""
    echo "═══════════════════════════════════════════════"
    echo "  🌐 E2E TESTS (live site)"
    echo "═══════════════════════════════════════════════"
    echo "  URL: ${NEXCORE_BASE_URL:-https://d1ag0uf6e1dp20.cloudfront.net}"
    echo ""
    cd "$ROOT_DIR" && python -m pytest tests/e2e/ -v --tb=long "$@"
    E2E_EXIT=$?
else
    echo ""
    echo "⏭️  E2E tests saltados. Ejecuta: RUN_E2E=true ./tests/run.sh"
    E2E_EXIT=0
fi

# ─── Resumen ───────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "  📊 RESULTADOS"
echo "═══════════════════════════════════════════════"
echo "  Unit: $([ $UNIT_EXIT -eq 0 ] && echo '✅ PASÓ' || echo '❌ FALLÓ')"
echo "  E2E:  $([ $E2E_EXIT -eq 0 ] && echo '✅ PASÓ' || echo '❌ FALLÓ')"
echo ""

if [ $UNIT_EXIT -ne 0 ] || [ $E2E_EXIT -ne 0 ]; then
    echo "❌ Algunas pruebas fallaron."
    exit 1
fi

echo "✅ Todas las pruebas pasaron."
exit 0
