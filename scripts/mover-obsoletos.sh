#!/bin/bash

###############################################################################
# Script para mover archivos obsoletos a carpeta de respaldo
# 
# Funcionalidad:
# 1. Lee el reporte de archivos obsoletos
# 2. Crea estructura de respaldo con fecha
# 3. Mueve archivos manteniendo estructura original
# 4. Genera script de restauración
#
# Uso: ./scripts/mover-obsoletos.sh
###############################################################################

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
FECHA=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup/codigo-obsoleto/$FECHA"
REPORTE_JSON="documentacion/v1.0.0/reporte-obsoletos.json"
RESTORE_SCRIPT="$BACKUP_DIR/restaurar.sh"
LOG_FILE="$BACKUP_DIR/movimientos.log"

echo -e "${GREEN}🗂️  Iniciando proceso de respaldo de archivos obsoletos${NC}\n"

# Verificar que existe el reporte
if [ ! -f "$REPORTE_JSON" ]; then
  echo -e "${RED}❌ Error: No se encontró el reporte $REPORTE_JSON${NC}"
  echo -e "${YELLOW}   Ejecuta primero: node scripts/identificar-obsoletos.js${NC}"
  exit 1
fi

# Crear directorio de respaldo
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✅ Directorio de respaldo creado: $BACKUP_DIR${NC}"

# Inicializar archivo de log
echo "=== Log de movimientos ===" > "$LOG_FILE"
echo "Fecha: $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Inicializar script de restauración
cat > "$RESTORE_SCRIPT" << 'EOF'
#!/bin/bash

###############################################################################
# Script de restauración de archivos respaldados
# Generado automáticamente
###############################################################################

BACKUP_DIR=$(dirname "$0")
ROOT_DIR="../../.."

echo "🔄 Iniciando restauración de archivos..."
echo ""

EOF

chmod +x "$RESTORE_SCRIPT"

# Contador de archivos movidos
CONTADOR=0

# Función para mover archivo
mover_archivo() {
  local archivo=$1
  local ruta_completa="$archivo"
  
  if [ ! -f "$ruta_completa" ]; then
    echo -e "${YELLOW}⚠️  Archivo no encontrado: $archivo${NC}"
    echo "SKIP: $archivo (no existe)" >> "$LOG_FILE"
    return
  fi
  
  # Crear estructura de directorios en backup
  local dir_backup="$BACKUP_DIR/$(dirname "$archivo")"
  mkdir -p "$dir_backup"
  
  # Mover archivo
  mv "$ruta_completa" "$dir_backup/"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Movido: $archivo${NC}"
    echo "MOVED: $archivo -> $dir_backup/" >> "$LOG_FILE"
    
    # Agregar al script de restauración
    echo "echo '  Restaurando: $archivo'" >> "$RESTORE_SCRIPT"
    echo "mkdir -p \"\$ROOT_DIR/$(dirname "$archivo")\"" >> "$RESTORE_SCRIPT"
    echo "cp \"\$BACKUP_DIR/$archivo\" \"\$ROOT_DIR/$archivo\"" >> "$RESTORE_SCRIPT"
    echo "" >> "$RESTORE_SCRIPT"
    
    ((CONTADOR++))
  else
    echo -e "${RED}❌ Error al mover: $archivo${NC}"
    echo "ERROR: $archivo" >> "$LOG_FILE"
  fi
}

# Leer archivos obsoletos del JSON y moverlos
echo -e "\n${YELLOW}📦 Moviendo archivos obsoletos...${NC}\n"

# Extraer rutas de archivos obsoletos del JSON
ARCHIVOS=$(grep -oP '(?<="archivo": ")[^"]*' "$REPORTE_JSON")

while IFS= read -r archivo; do
  mover_archivo "$archivo"
done <<< "$ARCHIVOS"

# Finalizar script de restauración
cat >> "$RESTORE_SCRIPT" << 'EOF'

echo ""
echo "✅ Restauración completada"
EOF

# Crear archivo de índice
cat > "$BACKUP_DIR/README.md" << EOF
# Respaldo de Código Obsoleto

**Fecha de respaldo**: $(date)
**Archivos respaldados**: $CONTADOR

## Archivos incluidos

Este respaldo contiene archivos identificados como obsoletos por el análisis automático.

## Restauración

Para restaurar todos los archivos:

\`\`\`bash
./restaurar.sh
\`\`\`

Para restaurar archivos específicos, cópialos manualmente desde este directorio.

## Log de movimientos

Ver archivo: \`movimientos.log\`

EOF

# Resumen final
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Proceso completado${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "📊 Archivos movidos: ${GREEN}$CONTADOR${NC}"
echo -e "📁 Ubicación respaldo: ${GREEN}$BACKUP_DIR${NC}"
echo -e "📝 Log: ${GREEN}$LOG_FILE${NC}"
echo -e "🔄 Script restauración: ${GREEN}$RESTORE_SCRIPT${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Ejecuta las pruebas del sistema antes de eliminar el respaldo${NC}"
echo ""
