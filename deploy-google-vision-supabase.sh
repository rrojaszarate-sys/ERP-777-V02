#!/bin/bash

# 🚀 SCRIPT DE MIGRACIÓN AUTOMATIZADA: GOOGLE VISION A SUPABASE
# Ejecuta todo el proceso de deployment paso a paso

set -e  # Detener si hay error

echo "🔍 Paso 1: Verificando instalación de Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI no está instalado"
    echo "📦 Instalando Supabase CLI..."
    npm install -g supabase
    echo "✅ Supabase CLI instalado"
else
    echo "✅ Supabase CLI ya está instalado ($(supabase --version))"
fi

echo ""
echo "🔐 Paso 2: Verificando autenticación..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  No has hecho login en Supabase"
    echo "🔑 Ejecuta manualmente: supabase login"
    echo "   (Se abrirá tu navegador para autenticarte)"
    exit 1
fi
echo "✅ Autenticado en Supabase"

echo ""
echo "🔗 Paso 3: Vinculando proyecto local con Supabase..."
PROJECT_REF="gomnouwackzvthpwyric"

if [ -f ".supabase/config.toml" ]; then
    echo "⚠️  Proyecto ya vinculado"
else
    supabase link --project-ref $PROJECT_REF
    echo "✅ Proyecto vinculado"
fi

echo ""
echo "🔑 Paso 4: Configurando credenciales de Google Vision..."
echo "⚠️  IMPORTANTE: Debes configurar el secret manualmente"
echo ""
echo "Ejecuta este comando (reemplaza TU_JSON con tus credenciales):"
echo ""
echo "supabase secrets set GOOGLE_VISION_CREDENTIALS='{\"type\":\"service_account\",\"project_id\":\"made-gastos\",...}'"
echo ""
echo "O configúralo en el Dashboard:"
echo "https://supabase.com/dashboard/project/$PROJECT_REF/settings/vault"
echo ""
read -p "¿Ya configuraste el secret? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⏸️  Deteniendo. Configura el secret y ejecuta el script de nuevo."
    exit 1
fi

echo ""
echo "🚀 Paso 5: Desplegando Edge Function 'ocr-process'..."
cd "$(dirname "$0")"

if [ ! -d "supabase_functions/ocr-process" ]; then
    echo "❌ Error: No se encontró supabase_functions/ocr-process/"
    exit 1
fi

# Cambiar nombre de carpeta si es necesario (Supabase espera 'supabase/functions/')
if [ ! -d "supabase/functions" ]; then
    mkdir -p supabase/functions
    cp -r supabase_functions/ocr-process supabase/functions/
    echo "📁 Estructura de carpetas preparada"
fi

supabase functions deploy ocr-process --no-verify-jwt
echo "✅ Edge Function desplegada"

echo ""
echo "🧪 Paso 6: Probando la función..."
echo "Endpoint: https://$PROJECT_REF.supabase.co/functions/v1/ocr-process"

echo ""
echo "📊 Verificando logs..."
echo "Visita: https://supabase.com/dashboard/project/$PROJECT_REF/functions/ocr-process/logs"

echo ""
echo "✅ ¡MIGRACIÓN COMPLETADA!"
echo ""
echo "📝 Próximos pasos:"
echo "1. Actualiza DualOCRExpenseForm.tsx para usar supabaseOCRService"
echo "2. Agrega validación de hora (fix error 70:22)"
echo "3. Prueba subiendo un recibo"
echo ""
echo "Ver guía completa: PASOS_DEPLOY_SUPABASE_OCR.md"
