#!/bin/bash

###############################################################################
# Script de respaldo de base de datos
###############################################################################

source .env

BACKUP_DIR="backup/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

echo "🔄 Iniciando respaldo de base de datos..."

mysqldump -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
  gzip "${BACKUP_FILE}"
  echo "✅ Respaldo completado: ${BACKUP_FILE}.gz"
  
  # Limpiar respaldos antiguos (mantener últimos 30 días)
  find "${BACKUP_DIR}" -name "backup_*.sql.gz" -mtime +30 -delete
else
  echo "❌ Error en respaldo"
  exit 1
fi
