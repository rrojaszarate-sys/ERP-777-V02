#!/bin/bash

###############################################################################
# SCRIPT MAESTRO - Ejecuta todo el proceso completo
# 
# Este script:
# 1. Genera documentación completa
# 2. Identifica código obsoleto
# 3. Hace commit de cambios
# 4. Publica al repositorio
# 5. Reinicia servicios
###############################################################################

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${BOLD}${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║        ERP-777-V01 - PROCESO COMPLETO DE DEPLOY         ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: Ejecutar desde el directorio raíz del proyecto${NC}"
  exit 1
fi

# Dar permisos de ejecución a todos los scripts
echo -e "${YELLOW}🔧 Configurando permisos de scripts...${NC}"
chmod +x scripts/*.sh
chmod +x *.sh
echo -e "${GREEN}✅ Permisos configurados${NC}\n"

# Confirmar ejecución
echo -e "${YELLOW}Este script realizará las siguientes acciones:${NC}"
echo "  1. Generar documentación completa"
echo "  2. Identificar y reportar código obsoleto"
echo "  3. Hacer commit de todos los cambios"
echo "  4. Publicar al repositorio remoto"
echo "  5. Crear respaldo de base de datos"
echo "  6. Reiniciar servicios del sistema"
echo ""
read -p "¿Deseas continuar? (s/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
  echo -e "${YELLOW}❌ Proceso cancelado${NC}"
  exit 0
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Iniciando proceso completo...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# Ejecutar script de commit y publicación
./scripts/commit-and-publish.sh

echo ""
echo -e "${GREEN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║           ✅ PROCESO COMPLETADO EXITOSAMENTE            ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

echo -e "${BLUE}📊 ESTADO DEL SISTEMA${NC}"
echo -e "${BLUE}─────────────────────${NC}"
echo ""

# Verificar estado de servicios
if pgrep -f "node server.js" > /dev/null; then
  echo -e "  🟢 Servicios: ${GREEN}ACTIVOS${NC}"
  PID=$(pgrep -f "node server.js")
  echo -e "  📍 PID: ${BLUE}${PID}${NC}"
else
  echo -e "  🔴 Servicios: ${RED}INACTIVOS${NC}"
fi

echo ""

# Verificar API
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "  🟢 API: ${GREEN}RESPONDIENDO${NC}"
else
  echo -e "  🟡 API: ${YELLOW}NO DISPONIBLE${NC}"
fi

echo ""
echo -e "${BLUE}🔗 ENLACES ÚTILES${NC}"
echo -e "${BLUE}───────────────${NC}"
echo -e "  📱 Backend:  ${GREEN}http://localhost:3000${NC}"
echo -e "  🌐 Frontend: ${GREEN}http://localhost:3001${NC}"
echo -e "  📚 API Docs: ${GREEN}http://localhost:3000/api/docs${NC}"
echo ""

echo -e "${BLUE}📁 DOCUMENTACIÓN${NC}"
echo -e "${BLUE}────────────────${NC}"
echo -e "  📖 Índice:    ${YELLOW}cat documentacion/v1.0.0/INDICE.md${NC}"
echo -e "  📊 Reportes:  ${YELLOW}open documentacion/v1.0.0/reporte-obsoletos.html${NC}"
echo -e "  🗄️  Base Datos: ${YELLOW}cat documentacion/v1.0.0/base-de-datos.md${NC}"
echo ""

echo -e "${BLUE}🛠️  COMANDOS ÚTILES${NC}"
echo -e "${BLUE}──────────────────${NC}"
echo -e "  Ver logs:     ${YELLOW}tail -f logs/app.log${NC}"
echo -e "  Detener:      ${YELLOW}pkill -f 'node server.js'${NC}"
echo -e "  Reiniciar:    ${YELLOW}npm start${NC}"
echo -e "  Estado:       ${YELLOW}ps aux | grep node${NC}"
echo ""

echo -e "${GREEN}✨ ¡Sistema listo para usar! ✨${NC}\n"
