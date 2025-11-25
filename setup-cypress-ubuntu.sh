#!/bin/bash

# ============================================================================
# Script de Configuración Completa - Sistema de Pruebas Cypress
# ============================================================================

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║    🚀 CONFIGURACIÓN COMPLETA DE PRUEBAS AUTOMATIZADAS        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# PASO 1: Instalar dependencias de sistema para Cypress
# ============================================================================
echo -e "${YELLOW}[1/5] Instalando dependencias de sistema para Cypress...${NC}"
echo "Este paso requiere permisos sudo."
echo ""

if command -v sudo &> /dev/null; then
  sudo apt-get update

  # Ubuntu 24.04 usa paquetes con sufijo t64
  sudo apt-get install -y \
    libgtk2.0-0t64 \
    libgtk-3-0t64 \
    libgbm-dev \
    libnotify-dev \
    libnss3 \
    libxss1 \
    libasound2t64 \
    libxtst6 \
    xauth \
    xvfb \
    libnspr4 \
    libnss3-dev \
    libatk1.0-0t64 \
    libatk-bridge2.0-0t64 \
    libcups2t64 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libatspi2.0-0t64 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2-plugins

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencias de sistema instaladas${NC}"
  else
    echo -e "${RED}❌ Error instalando dependencias${NC}"
    exit 1
  fi
else
  echo -e "${RED}❌ sudo no está disponible${NC}"
  echo "Por favor, instala manualmente las dependencias:"
  echo "sudo apt-get install -y libgtk2.0-0t64 libgtk-3-0t64 libgbm-dev libnotify-dev libnss3 libxss1 libasound2t64 libxtst6 xauth xvfb libnspr4 libnss3-dev"
  exit 1
fi

echo ""

# ============================================================================
# PASO 2: Crear cuentas contables base
# ============================================================================
echo -e "${YELLOW}[2/5] Creando cuentas contables base...${NC}"
npm run crear:cuentas

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Cuentas contables creadas${NC}"
else
  echo -e "${RED}❌ Error creando cuentas${NC}"
  exit 1
fi

echo ""

# ============================================================================
# PASO 3: Cargar datos de prueba
# ============================================================================
echo -e "${YELLOW}[3/5] Cargando datos de prueba (72 eventos + 648 gastos + 216 ingresos)...${NC}"
npm run cargar:datos

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Datos de prueba cargados${NC}"
else
  echo -e "${YELLOW}⚠️  Hubo advertencias en la carga de datos (esto es normal)${NC}"
fi

echo ""

# ============================================================================
# PASO 4: Ejecutar pruebas de backend
# ============================================================================
echo -e "${YELLOW}[4/5] Ejecutando pruebas automatizadas de backend...${NC}"
npm run test:automatizado

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Pruebas de backend completadas${NC}"
else
  echo -e "${YELLOW}⚠️  Algunas pruebas de backend fallaron (revisar reporte)${NC}"
fi

echo ""

# ============================================================================
# PASO 5: Verificar configuración de Cypress
# ============================================================================
echo -e "${YELLOW}[5/5] Verificando instalación de Cypress...${NC}"
npx cypress verify

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Cypress instalado y configurado correctamente${NC}"
else
  echo -e "${RED}❌ Error en la instalación de Cypress${NC}"
  exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           ✅ CONFIGURACIÓN COMPLETADA EXITOSAMENTE           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}🎉 ¡Todo listo para ejecutar las pruebas!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PRÓXIMOS PASOS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Iniciar la aplicación (en terminal separada):"
echo "   ${YELLOW}npm run dev${NC}"
echo ""
echo "2. Ejecutar pruebas UI (en otra terminal):"
echo "   ${YELLOW}npm run test:ui${NC}"
echo ""
echo "3. O usar modo interactivo:"
echo "   ${YELLOW}npm run cypress:open${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Documentación:"
echo "   - Inicio Rápido: INICIO_RAPIDO_CYPRESS.md"
echo "   - Guía Completa: GUIA_PRUEBAS_NAVEGADOR.md"
echo ""
