#!/bin/bash

# ============================================================
# Script de Ejecución de Pruebas Cypress para ERP
# ============================================================
#
# Uso:
#   ./scripts/run-cypress-tests.sh [opción]
#
# Opciones:
#   all       - Ejecutar todas las pruebas
#   module    - Ejecutar pruebas de un módulo específico
#   headed    - Ejecutar con navegador visible
#   report    - Generar solo el reporte
#
# ============================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directorio del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# Función para imprimir mensajes
print_message() {
    echo -e "${BLUE}[ERP-TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que Cypress está instalado
check_cypress() {
    if ! npx cypress --version > /dev/null 2>&1; then
        print_error "Cypress no está instalado. Ejecutando npm install..."
        npm install
    fi
}

# Limpiar reportes anteriores
clean_reports() {
    print_message "Limpiando reportes anteriores..."
    rm -rf cypress/reports/*
    rm -rf cypress/screenshots/*
    rm -rf cypress/videos/*
    mkdir -p cypress/reports
}

# Ejecutar pruebas
run_tests() {
    local spec_pattern=$1
    local headed=$2

    print_message "Iniciando pruebas Cypress..."

    if [ "$headed" = "headed" ]; then
        npx cypress run --headed --spec "$spec_pattern"
    else
        npx cypress run --spec "$spec_pattern"
    fi
}

# Generar reporte consolidado
generate_report() {
    print_message "Generando reporte consolidado..."

    # El reporte se genera automáticamente con mochawesome
    if [ -d "cypress/reports" ]; then
        print_success "Reportes disponibles en: cypress/reports/"

        # Listar archivos de reporte
        echo ""
        echo "Archivos generados:"
        ls -la cypress/reports/*.html 2>/dev/null || echo "No se encontraron reportes HTML"
    fi
}

# Abrir reporte en navegador
open_report() {
    local report_file=$(ls -t cypress/reports/*.html 2>/dev/null | head -1)

    if [ -n "$report_file" ]; then
        print_message "Abriendo reporte: $report_file"

        # Detectar sistema operativo y abrir
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "$report_file"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open "$report_file" 2>/dev/null || print_warning "No se pudo abrir el reporte automáticamente"
        fi
    else
        print_warning "No se encontró reporte para abrir"
    fi
}

# Menú principal
show_menu() {
    echo ""
    echo "============================================================"
    echo "     PRUEBAS AUTOMATIZADAS ERP - CYPRESS"
    echo "============================================================"
    echo ""
    echo "  1) Ejecutar TODAS las pruebas"
    echo "  2) Ejecutar pruebas de Eventos"
    echo "  3) Ejecutar pruebas de Módulos ERP"
    echo "  4) Ejecutar con navegador visible (headed)"
    echo "  5) Abrir Cypress GUI"
    echo "  6) Ver último reporte"
    echo "  7) Limpiar reportes"
    echo "  0) Salir"
    echo ""
    read -p "Seleccione una opción: " option

    case $option in
        1)
            clean_reports
            run_tests "cypress/e2e/**/*.cy.js"
            generate_report
            ;;
        2)
            clean_reports
            run_tests "cypress/e2e/01-eventos*.cy.js,cypress/e2e/02-evento*.cy.js,cypress/e2e/03-evento*.cy.js,cypress/e2e/04-evento*.cy.js"
            generate_report
            ;;
        3)
            clean_reports
            run_tests "cypress/e2e/10-modulos-erp-completo.cy.js"
            generate_report
            ;;
        4)
            clean_reports
            run_tests "cypress/e2e/**/*.cy.js" "headed"
            generate_report
            ;;
        5)
            print_message "Abriendo Cypress GUI..."
            npx cypress open
            ;;
        6)
            open_report
            ;;
        7)
            clean_reports
            print_success "Reportes limpiados"
            ;;
        0)
            print_message "Saliendo..."
            exit 0
            ;;
        *)
            print_error "Opción no válida"
            ;;
    esac
}

# Manejo de argumentos de línea de comandos
case "$1" in
    "all")
        check_cypress
        clean_reports
        run_tests "cypress/e2e/**/*.cy.js"
        generate_report
        ;;
    "eventos")
        check_cypress
        clean_reports
        run_tests "cypress/e2e/0[1-9]-*.cy.js"
        generate_report
        ;;
    "modulos")
        check_cypress
        clean_reports
        run_tests "cypress/e2e/10-modulos-erp-completo.cy.js"
        generate_report
        ;;
    "headed")
        check_cypress
        clean_reports
        run_tests "cypress/e2e/**/*.cy.js" "headed"
        generate_report
        ;;
    "open")
        check_cypress
        npx cypress open
        ;;
    "report")
        open_report
        ;;
    "clean")
        clean_reports
        print_success "Limpieza completada"
        ;;
    "")
        check_cypress
        show_menu
        ;;
    *)
        echo "Uso: $0 [all|eventos|modulos|headed|open|report|clean]"
        exit 1
        ;;
esac

print_success "Proceso completado"
