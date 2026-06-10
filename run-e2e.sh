#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# run-e2e.sh — Comandos para ejecutar tests E2E de RepuestosCel
# ──────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$SCRIPT_DIR/tests/e2e"
REPORT_DIR="$E2E_DIR/report"
SCREENSHOT_DIR="$E2E_DIR/screenshots"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      RepuestosCel E2E Test Runner             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"

# ─── Funciones ──────────────────────────────────────────

setup() {
    echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
    pip install -r "$SCRIPT_DIR/tests/requirements-e2e.txt" -q
    python -m playwright install chromium --quiet
    echo -e "${GREEN}✅ Dependencias listas${NC}"
}

setup_headed() {
    echo -e "${YELLOW}📦 Instalando dependencias (headed)...${NC}"
    pip install -r "$SCRIPT_DIR/tests/requirements-e2e.txt" -q
    python -m playwright install chromium --with-deps --quiet
    echo -e "${GREEN}✅ Dependencias listas${NC}"
}

run_all() {
    setup
    echo -e "${GREEN}🧪 Ejecutando todos los tests E2E...${NC}"
    mkdir -p "$REPORT_DIR" "$SCREENSHOT_DIR"
    python -m pytest "$E2E_DIR" \
        -v \
        --tb=short \
        --durations=10 \
        --html="$REPORT_DIR/e2e-report.html" \
        --self-contained-html \
        -n auto \
        -m "not wip" \
        2>&1 | tee "$REPORT_DIR/e2e-output.log"
    echo -e "${GREEN}✅ Reporte: $REPORT_DIR/e2e-report.html${NC}"
}

run_smoke() {
    setup
    echo -e "${GREEN}🔥 Ejecutando smoke tests...${NC}"
    python -m pytest "$E2E_DIR/test_smoke.py" -v --tb=short -k "not skip"
}

run_tag() {
    setup
    local tag="${1:-smoke}"
    echo -e "${GREEN}🧪 Ejecutando tests con tag: $tag${NC}"
    mkdir -p "$REPORT_DIR" "$SCREENSHOT_DIR"
    python -m pytest "$E2E_DIR" \
        -v --tb=short \
        --html="$REPORT_DIR/e2e-report-$tag.html" \
        --self-contained-html \
        -m "$tag" -n auto
}

run_file() {
    setup
    local file="${1:-test_smoke.py}"
    echo -e "${GREEN}🧪 Ejecutando: $file${NC}"
    mkdir -p "$REPORT_DIR" "$SCREENSHOT_DIR"
    python -m pytest "$E2E_DIR/$file" -v --tb=short -n auto
}

run_headed() {
    setup_headed
    echo -e "${GREEN}🧪 Ejecutando tests con navegador visible...${NC}"
    E2E_HEADLESS=false python -m pytest "$E2E_DIR" \
        -v --tb=short -n 1 --headed --capture=no -m "not wip"
}

run_shard() {
    setup
    local shard="${1:-1}"
    local total="${2:-3}"
    echo -e "${GREEN}🧪 Ejecutando shard $shard/$total...${NC}"
    python -m pytest "$E2E_DIR" \
        -v --tb=short \
        --splits="$total" --group="$shard" \
        --html="$REPORT_DIR/e2e-shard-$shard.html" \
        --self-contained-html
}

run_api() {
    setup
    echo -e "${GREEN}🧪 Ejecutando solo tests de API...${NC}"
    python -m pytest "$E2E_DIR" -v -m api -k "not skip"
}

run_mobile() {
    setup
    echo -e "${GREEN}📱 Ejecutando tests mobile...${NC}"
    mkdir -p "$REPORT_DIR" "$SCREENSHOT_DIR"
    python -m pytest "$E2E_DIR/test_mobile.py" -v --tb=short -n 2
}

watch() {
    setup
    echo -e "${GREEN}👀 Modo watch (re-ejecuta al cambiar archivos)...${NC}"
    echo "   Requiere: pip install pytest-watch"
    ptw "$E2E_DIR" -- -v --tb=short
}

clean() {
    echo -e "${YELLOW}🧹 Limpiando reportes y screenshots...${NC}"
    rm -rf "$REPORT_DIR" "$SCREENSHOT_DIR"
    echo -e "${GREEN}✅ Limpio${NC}"
}

help() {
    echo ""
    echo -e "${BLUE}Uso:${NC} ./run-e2e.sh [comando]"
    echo ""
    echo "  all        Ejecutar todos los tests"
    echo "  smoke      Solo smoke tests (rápidos)"
    echo "  tag TAG    Tests con tag específico (smoke, api, checkout, mobile, auth)"
    echo "  file FILE  Tests de un archivo específico"
    echo "  headed     Tests con navegador visible (debug)"
    echo "  shard N/M  Ejecutar un shard específico"
    echo "  api        Solo tests de API"
    echo "  mobile     Solo tests mobile/responsive"
    echo "  watch      Modo watch (re-ejecuta automáticamente)"
    echo "  clean      Limpiar reportes y screenshots"
    echo "  setup      Solo instalar dependencias"
    echo ""
    echo -e "${YELLOW}Ejemplos:${NC}"
    echo "  ./run-e2e.sh smoke"
    echo "  ./run-e2e.sh tag checkout"
    echo "  ./run-e2e.sh headed"
    echo "  ./run-e2e.sh file test_cart.py"
    echo ""
}

# ─── Main ───────────────────────────────────────────────

case "${1:-help}" in
    all)      run_all ;;
    smoke)    run_smoke ;;
    tag)      run_tag "${2:-smoke}" ;;
    file)     run_file "${2:-test_smoke.py}" ;;
    headed)   run_headed ;;
    shard)    run_shard "${2:-1}" "${3:-3}" ;;
    api)      run_api ;;
    mobile)   run_mobile ;;
    watch)    watch ;;
    clean)    clean ;;
    setup)    setup ;;
    setup-with-deps) setup_headed ;;
    help|*)   help ;;
esac
