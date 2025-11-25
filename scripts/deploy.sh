#!/bin/bash

###############################################################################
# Script de despliegue completo
###############################################################################

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Iniciando despliegue ERP-777-V01${NC}\n"

# 1. Verificar credenciales de BD
echo -e "${BLUE}1. Verificando credenciales de base de datos...${NC}"
if [ ! -f .env ]; then
  echo -e "${RED}❌ Error: Archivo .env no encontrado${NC}"
  exit 1
fi

if ! grep -q "DB_USER=" .env || ! grep -q "DB_PASSWORD=" .env; then
  echo -e "${RED}❌ Error: Credenciales de BD incompletas en .env${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Credenciales verificadas${NC}\n"

# 2. Instalar dependencias
echo -e "${BLUE}2. Instalando dependencias...${NC}"
npm install
cd frontend && npm install && cd ..
echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"

# 3. Ejecutar migraciones
echo -e "${BLUE}3. Ejecutando migraciones de BD...${NC}"
node scripts/migrate.js
echo -e "${GREEN}✅ Migraciones completadas${NC}\n"

# 4. Build frontend
echo -e "${BLUE}4. Compilando frontend...${NC}"
cd frontend && npm run build && cd ..
echo -e "${GREEN}✅ Frontend compilado${NC}\n"

# 5. Generar documentación
echo -e "${BLUE}5. Generando documentación...${NC}"
./scripts/generar-documentacion.sh 1.0.0
echo -e "${GREEN}✅ Documentación generada${NC}\n"

# 6. Reiniciar servicios
echo -e "${BLUE}6. Reiniciando servicios...${NC}"

# Detener servicios existentes
pkill -f "node server.js" || true

# Iniciar servicios
nohup npm start > logs/app.log 2>&1 &

sleep 3

if pgrep -f "node server.js" > /dev/null; then
  echo -e "${GREEN}✅ Servicios iniciados correctamente${NC}\n"
else
  echo -e "${RED}❌ Error al iniciar servicios${NC}"
  exit 1
fi

# 7. Verificar estado
echo -e "${BLUE}7. Verificando estado del sistema...${NC}"
sleep 2

if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ API respondiendo correctamente${NC}"
else
  echo -e "${RED}⚠️  API no responde (puede estar iniciando)${NC}"
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Despliegue completado exitosamente${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "📊 Estado:"
echo -e "  - Backend: ${GREEN}http://localhost:3000${NC}"
echo -e "  - Frontend: ${GREEN}http://localhost:3001${NC}"
echo -e "  - API Docs: ${GREEN}http://localhost:3000/api/docs${NC}"
echo -e "  - Logs: ${BLUE}tail -f logs/app.log${NC}"
echo ""
