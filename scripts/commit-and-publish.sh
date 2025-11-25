#!/bin/bash

###############################################################################
# Script para commit, publicación y reinicio de servicios
###############################################################################

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

VERSION="1.0.0"
COMMIT_MSG="docs: documentación integral del sistema v${VERSION}"

echo -e "${BLUE}📝 Preparando commit y publicación${NC}\n"

# 1. Generar documentación final
echo -e "${YELLOW}1. Generando documentación...${NC}"
./scripts/generar-documentacion.sh ${VERSION}
node scripts/identificar-obsoletos.js
echo -e "${GREEN}✅ Documentación generada${NC}\n"

# 2. Git add
echo -e "${YELLOW}2. Agregando archivos al staging...${NC}"
git add .
echo -e "${GREEN}✅ Archivos agregados${NC}\n"

# 3. Git commit
echo -e "${YELLOW}3. Realizando commit...${NC}"
git commit -m "${COMMIT_MSG}" || {
  echo -e "${YELLOW}⚠️  No hay cambios para commitear${NC}"
}
echo -e "${GREEN}✅ Commit realizado${NC}\n"

# 4. Git push
echo -e "${YELLOW}4. Publicando a repositorio remoto...${NC}"
if git remote -v | grep -q "origin"; then
  git push origin main || git push origin master || {
    echo -e "${YELLOW}⚠️  Configurar remoto: git remote add origin <url>${NC}"
  }
  echo -e "${GREEN}✅ Código publicado${NC}\n"
else
  echo -e "${YELLOW}⚠️  No hay remoto configurado. Saltando push...${NC}\n"
fi

# 5. Backup de BD
echo -e "${YELLOW}5. Creando respaldo de base de datos...${NC}"
./scripts/backup-db.sh
echo -e "${GREEN}✅ Respaldo creado${NC}\n"

# 6. Reiniciar servicios
echo -e "${YELLOW}6. Reiniciando servicios...${NC}"

# Verificar .env
if [ ! -f .env ]; then
  echo -e "${RED}❌ Error: Archivo .env no encontrado${NC}"
  exit 1
fi

# Crear directorio de logs si no existe
mkdir -p logs

# Detener servicios
echo -e "  Deteniendo servicios existentes..."
pkill -f "node server.js" || true
sleep 2

# Iniciar servicios
echo -e "  Iniciando servicios..."
nohup npm start > logs/app.log 2>&1 &

sleep 3

# Verificar que los servicios estén corriendo
if pgrep -f "node server.js" > /dev/null; then
  echo -e "${GREEN}✅ Servicios reiniciados correctamente${NC}\n"
else
  echo -e "${RED}❌ Error al iniciar servicios${NC}"
  echo -e "${YELLOW}   Ver logs: tail -f logs/app.log${NC}"
  exit 1
fi

# 7. Verificar salud del sistema
echo -e "${YELLOW}7. Verificando salud del sistema...${NC}"
sleep 2

if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ API respondiendo correctamente${NC}"
else
  echo -e "${YELLOW}⚠️  API aún no responde (puede estar iniciando)${NC}"
fi

# Resumen final
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Proceso completado exitosamente${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}📋 Resumen:${NC}"
echo -e "  ✅ Documentación generada en: ${BLUE}documentacion/v${VERSION}/${NC}"
echo -e "  ✅ Código commiteado y publicado"
echo -e "  ✅ Respaldo de BD creado"
echo -e "  ✅ Servicios reiniciados"
echo ""
echo -e "${BLUE}🌐 URLs:${NC}"
echo -e "  - Backend: ${GREEN}http://localhost:3000${NC}"
echo -e "  - API Docs: ${GREEN}http://localhost:3000/api/docs${NC}"
echo ""
echo -e "${BLUE}📊 Monitoreo:${NC}"
echo -e "  - Logs: ${YELLOW}tail -f logs/app.log${NC}"
echo -e "  - Procesos: ${YELLOW}ps aux | grep node${NC}"
echo ""
echo -e "${BLUE}📚 Documentación:${NC}"
echo -e "  - Índice: ${YELLOW}cat documentacion/v${VERSION}/INDICE.md${NC}"
echo -e "  - Reporte obsoletos: ${YELLOW}open documentacion/v${VERSION}/reporte-obsoletos.html${NC}"
echo ""
