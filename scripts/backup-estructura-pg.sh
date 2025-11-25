#!/bin/bash

# Script para respaldar la ESTRUCTURA de la base de datos usando pg_dump
# Este script usa pg_dump que es más confiable que scripts custom

# Cargar variables de entorno
source ../.env 2>/dev/null || true

# Variables
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="../backups"
FILENAME="estructura_completa_${TIMESTAMP}.sql"

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  📦 RESPALDO DE ESTRUCTURA DE BASE DE DATOS               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "📋 Configuración:"
echo "   Host: $DB_POOLER_TX_HOST"
echo "   Puerto: $DB_POOLER_TX_PORT"
echo "   Base de datos: $DB_NAME"
echo "   Usuario: $DB_POOLER_TX_USER"
echo ""

echo "🔄 Ejecutando pg_dump (solo schema)..."

# Ejecutar pg_dump solo con estructura (--schema-only)
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_POOLER_TX_HOST" \
  -p "$DB_POOLER_TX_PORT" \
  -U "$DB_POOLER_TX_USER" \
  -d "$DB_NAME" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  -f "$BACKUP_DIR/$FILENAME"

if [ $? -eq 0 ]; then
  SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)

  echo ""
  echo "╔═══════════════════════════════════════════════════════════╗"
  echo "║  ✅ RESPALDO DE ESTRUCTURA COMPLETADO                     ║"
  echo "╚═══════════════════════════════════════════════════════════╝"
  echo ""
  echo "📄 Archivo generado: $FILENAME"
  echo "📁 Ubicación: $BACKUP_DIR/$FILENAME"
  echo "💾 Tamaño: $SIZE"
  echo ""
else
  echo ""
  echo "❌ Error al generar el respaldo"
  exit 1
fi
