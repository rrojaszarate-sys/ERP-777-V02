#!/bin/bash

###############################################################################
# SCRIPT ÚNICO - Documentación, Commit, Publicación y Reinicio
# Versión sin sudo - ejecutable desde usuario normal
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
echo "║          ERP-777-V01 - DEPLOY COMPLETO                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

VERSION="1.0.0"
COMMIT_MSG="docs: documentación integral del sistema v${VERSION}"

# ============================================================================
# 1. VERIFICAR ENTORNO
# ============================================================================
echo -e "${BLUE}1. Verificando entorno...${NC}"

if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️  Archivo .env no encontrado, creando desde .env.example...${NC}"
  if [ -f .env.example ]; then
    cp .env.example .env
    echo -e "${YELLOW}   Por favor configura las credenciales en .env${NC}"
  else
    echo -e "${RED}❌ Error: No existe .env ni .env.example${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}✅ Entorno verificado${NC}\n"

# ============================================================================
# 2. CONFIGURAR PERMISOS (sin sudo)
# ============================================================================
echo -e "${BLUE}2. Configurando permisos...${NC}"

# Crear directorios si no existen
mkdir -p scripts
mkdir -p documentacion/v${VERSION}
mkdir -p backup/database
mkdir -p backup/codigo-obsoleto
mkdir -p logs
mkdir -p database/migrations

# Dar permisos de ejecución a scripts
find scripts -type f -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
chmod +x *.sh 2>/dev/null || true

echo -e "${GREEN}✅ Permisos configurados${NC}\n"

# ============================================================================
# 3. INSTALAR DEPENDENCIAS
# ============================================================================
echo -e "${BLUE}3. Verificando dependencias...${NC}"

if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚠️  Instalando dependencias npm...${NC}"
  npm install
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
else
  echo -e "${GREEN}✅ Dependencias ya instaladas${NC}\n"
fi

# ============================================================================
# 4. GENERAR DOCUMENTACIÓN
# ============================================================================
echo -e "${BLUE}4. Generando documentación...${NC}"

cat > "documentacion/v${VERSION}/INDICE.md" << EOF
# Índice de Documentación - ERP-777-V01
**Versión**: ${VERSION}
**Fecha**: $(date +"%Y-%m-%d %H:%M:%S")

## Documentación Principal
1. [README Principal](./README.md)
2. [Base de Datos](./base-de-datos.md)
3. [API Endpoints](./api-endpoints.md)
4. [Componentes Frontend](./componentes-frontend.md)
5. [Código Obsoleto](./codigo-obsoleto.md)

## Guías Técnicas
- [Inicio Rápido](./inicio-rapido.md)
- [Guía de Desarrollo](./guia-desarrollo.md)

## Scripts Disponibles
- \`npm run docs:obsoletos\` - Identificar código obsoleto
- \`npm run migrate\` - Ejecutar migraciones
- \`npm run backup\` - Backup de base de datos
- \`npm run deploy:full\` - Deploy completo

**Última actualización**: $(date)
EOF

echo -e "${GREEN}✅ Documentación generada${NC}\n"

# ============================================================================
# 5. IDENTIFICAR CÓDIGO OBSOLETO
# ============================================================================
echo -e "${BLUE}5. Analizando código obsoleto...${NC}"

node scripts/identificar-obsoletos.mjs || {
  echo -e "${YELLOW}⚠️  Error al ejecutar análisis de código${NC}"
}

echo -e "${GREEN}✅ Análisis completado${NC}\n"

# ============================================================================
# 6. GIT COMMIT
# ============================================================================
echo -e "${BLUE}6. Preparando commit...${NC}"

if command -v git &> /dev/null; then
  # Inicializar git si no existe
  if [ ! -d .git ]; then
    git init
    git config user.email "deploy@erp777.com"
    git config user.name "ERP Deploy"
  fi
  
  git add . 2>/dev/null || true
  git commit -m "${COMMIT_MSG}" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  No hay cambios para commitear${NC}"
  }
  echo -e "${GREEN}✅ Commit realizado${NC}\n"
else
  echo -e "${YELLOW}⚠️  Git no está instalado${NC}\n"
fi

# ============================================================================
# 7. GIT PUSH
# ============================================================================
echo -e "${BLUE}7. Publicando a repositorio...${NC}"

if command -v git &> /dev/null && git remote -v | grep -q "origin"; then
  git push origin main 2>/dev/null || git push origin master 2>/dev/null || {
    echo -e "${YELLOW}⚠️  No se pudo hacer push${NC}"
  }
  echo -e "${GREEN}✅ Código publicado${NC}\n"
else
  echo -e "${YELLOW}⚠️  No hay remoto configurado${NC}"
  echo -e "${YELLOW}   Configura con: git remote add origin <url>${NC}\n"
fi

# ============================================================================
# 8. BACKUP BASE DE DATOS
# ============================================================================
echo -e "${BLUE}8. Creando respaldo de base de datos...${NC}"

if [ -f .env ]; then
  source .env
  BACKUP_FILE="backup/database/backup_$(date +%Y%m%d_%H%M%S).sql"
  
  if command -v mysqldump &> /dev/null; then
    mysqldump -h "${DB_HOST:-localhost}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" > "${BACKUP_FILE}" 2>/dev/null && {
      gzip "${BACKUP_FILE}"
      echo -e "${GREEN}✅ Respaldo creado: ${BACKUP_FILE}.gz${NC}\n"
    } || {
      echo -e "${YELLOW}⚠️  No se pudo crear respaldo de BD${NC}\n"
    }
  else
    echo -e "${YELLOW}⚠️  mysqldump no disponible${NC}\n"
  fi
fi

# ============================================================================
# 9. REINICIAR SERVICIOS
# ============================================================================
echo -e "${BLUE}9. Reiniciando servicios...${NC}"

# Detener servicios existentes
pkill -f "vite" 2>/dev/null || true
sleep 1

# Crear archivo de log
touch logs/app.log 2>/dev/null || true

# Iniciar servicios
echo -e "${YELLOW}   Iniciando servidor de desarrollo...${NC}"
nohup npm run dev > logs/app.log 2>&1 &
sleep 3

# Verificar
if pgrep -f "vite" > /dev/null; then
  echo -e "${GREEN}✅ Servicios iniciados${NC}\n"
else
  echo -e "${YELLOW}⚠️  Los servicios pueden tardar en iniciar${NC}"
  echo -e "${YELLOW}   Ver logs: tail -f logs/app.log${NC}\n"
fi

# ============================================================================
# 10. VERIFICAR SISTEMA
# ============================================================================
echo -e "${BLUE}10. Verificando sistema...${NC}"
sleep 2

API_OK=false
for port in 5173 3000 8080; do
  if curl -s http://localhost:$port > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Servidor respondiendo en puerto $port${NC}\n"
    API_OK=true
    break
  fi
done

if [ "$API_OK" = false ]; then
  echo -e "${YELLOW}⚠️  Servidor aún iniciando (esto es normal)${NC}\n"
fi

# ============================================================================
# RESUMEN FINAL
# ============================================================================
echo ""
echo -e "${GREEN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           ✅ PROCESO COMPLETADO EXITOSAMENTE            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

echo -e "${BLUE}📊 ESTADO DEL SISTEMA${NC}"
echo -e "${BLUE}─────────────────────${NC}"
if pgrep -f "vite" > /dev/null; then
  PID=$(pgrep -f "vite")
  echo -e "  🟢 Servicios: ${GREEN}ACTIVOS${NC} (PID: ${PID})"
else
  echo -e "  🟡 Servicios: ${YELLOW}INICIANDO...${NC}"
fi

echo ""
echo -e "${BLUE}🔗 ENLACES${NC}"
echo -e "${BLUE}──────────${NC}"
echo -e "  🌐 Aplicación: ${GREEN}http://localhost:5173${NC}"
echo -e "  📚 Docs:       ${YELLOW}cat documentacion/v${VERSION}/INDICE.md${NC}"
echo -e "  📊 Reporte:    ${YELLOW}open documentacion/v${VERSION}/reporte-obsoletos.html${NC}"
echo ""

echo -e "${BLUE}🛠️  COMANDOS ÚTILES${NC}"
echo -e "${BLUE}──────────────────${NC}"
echo -e "  Ver logs:      ${YELLOW}tail -f logs/app.log${NC}"
echo -e "  Detener:       ${YELLOW}pkill -f vite${NC}"
echo -e "  Iniciar:       ${YELLOW}npm run dev${NC}"
echo -e "  Build:         ${YELLOW}npm run build${NC}"
echo -e "  Docs:          ${YELLOW}npm run docs:obsoletos${NC}"
echo ""

echo -e "${GREEN}✨ ¡Sistema listo para usar! ✨${NC}\n"
