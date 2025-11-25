#!/bin/bash

###############################################################################
# Script rápido para commit y publicación
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
echo "║          COMMIT Y PUBLICACIÓN - ERP-777-V01             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Verificar git
if ! command -v git &> /dev/null; then
  echo -e "${RED}❌ Git no está instalado${NC}"
  exit 1
fi

# Inicializar git si no existe
if [ ! -d .git ]; then
  echo -e "${YELLOW}🔧 Inicializando repositorio git...${NC}"
  git init
  git config user.email "deploy@erp777.com"
  git config user.name "ERP Deploy Bot"
  echo -e "${GREEN}✅ Repositorio inicializado${NC}\n"
fi

# Mostrar estado actual
echo -e "${BLUE}📊 Estado actual del repositorio:${NC}"
git status --short
echo ""

# Agregar todos los archivos
echo -e "${BLUE}📦 Agregando archivos...${NC}"
git add .

# Mostrar archivos agregados
ADDED_FILES=$(git diff --cached --name-only | wc -l)
echo -e "${GREEN}✅ ${ADDED_FILES} archivos agregados${NC}\n"

# Commit
COMMIT_MSG="${1:-docs: documentación integral del sistema v1.0.0 - scripts de deploy y análisis de código}"
echo -e "${BLUE}💾 Creando commit:${NC}"
echo -e "${YELLOW}   \"${COMMIT_MSG}\"${NC}\n"

git commit -m "${COMMIT_MSG}" || {
  echo -e "${YELLOW}⚠️  No hay cambios para commitear${NC}"
  exit 0
}

echo -e "${GREEN}✅ Commit creado exitosamente${NC}\n"

# Verificar rama actual
CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
  CURRENT_BRANCH="main"
  git branch -M main
  echo -e "${YELLOW}📌 Rama renombrada a: main${NC}\n"
fi

echo -e "${BLUE}📍 Rama actual: ${BOLD}${CURRENT_BRANCH}${NC}\n"

# Push
echo -e "${BLUE}🚀 Publicando a repositorio remoto...${NC}"

if git remote -v | grep -q "origin"; then
  echo -e "${YELLOW}   Remoto detectado:${NC}"
  git remote -v | head -2
  echo ""
  
  # Intentar push
  if git push origin ${CURRENT_BRANCH} 2>/dev/null; then
    echo -e "${GREEN}✅ Código publicado exitosamente a origin/${CURRENT_BRANCH}${NC}\n"
  else
    # Si falla, intentar con --set-upstream
    echo -e "${YELLOW}   Configurando upstream...${NC}"
    if git push --set-upstream origin ${CURRENT_BRANCH} 2>/dev/null; then
      echo -e "${GREEN}✅ Código publicado y upstream configurado${NC}\n"
    else
      echo -e "${RED}❌ Error al hacer push${NC}"
      echo -e "${YELLOW}\nPosibles soluciones:${NC}"
      echo -e "${YELLOW}1. Verifica tus credenciales de GitHub${NC}"
      echo -e "${YELLOW}2. Verifica la URL del remoto: git remote -v${NC}"
      echo -e "${YELLOW}3. Intenta: git push -f origin ${CURRENT_BRANCH}${NC}"
      exit 1
    fi
  fi
else
  echo -e "${YELLOW}⚠️  No hay remoto configurado${NC}"
  echo -e "\n${YELLOW}Para publicar tu código:${NC}"
  echo -e "${YELLOW}1. Crea un repositorio en GitHub/GitLab/Bitbucket${NC}"
  echo -e "${YELLOW}2. Configura el remoto:${NC}"
  echo -e "${BLUE}   git remote add origin <url-del-repositorio>${NC}"
  echo -e "${YELLOW}3. Ejecuta nuevamente este script${NC}\n"
  
  echo -e "${BLUE}Ejemplo:${NC}"
  echo -e "${BLUE}   git remote add origin https://github.com/tu-usuario/ERP-777-V01.git${NC}"
  echo -e "${BLUE}   ./commit-y-publicar.sh${NC}\n"
  exit 1
fi

# Resumen final
echo ""
echo -e "${GREEN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           ✅ PUBLICACIÓN COMPLETADA                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Mostrar último commit
echo -e "${BLUE}📋 Último commit:${NC}"
git log -1 --pretty=format:"%h - %s (%an, %ar)" --abbrev-commit
echo -e "\n"

# Mostrar información de la rama
echo -e "${BLUE}📍 Información de la rama:${NC}"
echo -e "   Rama: ${GREEN}${CURRENT_BRANCH}${NC}"
echo -e "   Commits totales: ${GREEN}$(git rev-list --count HEAD)${NC}"
echo -e "   Remoto: ${GREEN}$(git remote get-url origin 2>/dev/null || echo 'No configurado')${NC}"

echo ""
echo -e "${GREEN}✨ ¡Cambios publicados exitosamente! ✨${NC}\n"
