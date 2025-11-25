#!/bin/bash

# Script para generar respaldo de base de datos Supabase
# Fecha: $(date +%Y-%m-%d)

# Información del proyecto Supabase
PROJECT_REF="gomnouwackzvthpwyric"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/supabase_backup_${TIMESTAMP}.sql"

# Crear directorio de respaldos si no existe
mkdir -p "${BACKUP_DIR}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "RESPALDO DE BASE DE DATOS - SUPABASE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Proyecto: ${PROJECT_REF}"
echo "Fecha: $(date)"
echo ""

# Para Supabase necesitamos las credenciales de conexión directa
# Formato: postgresql://[usuario]:[contraseña]@[host]:[puerto]/[database]
# Host de Supabase: db.gomnouwackzvthpwyric.supabase.co

# Nota: Necesitas obtener la contraseña de la base de datos desde:
# Dashboard de Supabase > Project Settings > Database > Connection String (Direct connection)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "INSTRUCCIONES PARA OBTENER CREDENCIALES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Ir a: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
echo "2. En 'Connection string' seleccionar 'URI'"
echo "3. Copiar la cadena de conexión completa"
echo ""
echo "Una vez que tengas la cadena de conexión, ejecuta:"
echo "export SUPABASE_DB_URL='postgresql://postgres:[TU_PASSWORD]@db.${PROJECT_REF}.supabase.co:5432/postgres'"
echo "bash backup-database.sh"
echo ""

# Si ya está configurada la variable de entorno, realizar el respaldo
if [ -n "$SUPABASE_DB_URL" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "GENERANDO RESPALDO..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Generar respaldo completo (estructura + datos)
    pg_dump "$SUPABASE_DB_URL" \
        --file="${BACKUP_FILE}" \
        --format=plain \
        --verbose \
        --no-owner \
        --no-acl \
        --schema=public

    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Respaldo generado exitosamente:"
        echo "  Archivo: ${BACKUP_FILE}"
        echo "  Tamaño: $(du -h "${BACKUP_FILE}" | cut -f1)"
        echo ""

        # Generar también un respaldo comprimido
        gzip -c "${BACKUP_FILE}" > "${BACKUP_FILE}.gz"
        echo "✓ Respaldo comprimido:"
        echo "  Archivo: ${BACKUP_FILE}.gz"
        echo "  Tamaño: $(du -h "${BACKUP_FILE}.gz" | cut -f1)"
        echo ""

        # Mostrar estadísticas
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "ESTADÍSTICAS DEL RESPALDO"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        grep -c "CREATE TABLE" "${BACKUP_FILE}" | xargs -I {} echo "  Tablas: {}"
        grep -c "CREATE VIEW" "${BACKUP_FILE}" | xargs -I {} echo "  Vistas: {}"
        grep -c "CREATE FUNCTION" "${BACKUP_FILE}" | xargs -I {} echo "  Funciones: {}"
        grep -c "COPY.*FROM stdin" "${BACKUP_FILE}" | xargs -I {} echo "  Tablas con datos: {}"
        echo ""
    else
        echo "✗ Error al generar el respaldo"
        exit 1
    fi
else
    echo "⚠ Variable SUPABASE_DB_URL no configurada"
    echo ""
    echo "Por favor, configura la cadena de conexión y vuelve a ejecutar este script."
    exit 1
fi
