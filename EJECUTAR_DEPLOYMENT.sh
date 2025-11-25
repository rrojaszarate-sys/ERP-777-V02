#!/bin/bash

# 🚀 COMANDOS PARA DEPLOYMENT DE GOOGLE VISION EN SUPABASE
# Copia y pega estos comandos en tu terminal

echo "=========================================="
echo "MIGRACIÓN GOOGLE VISION → SUPABASE"
echo "=========================================="
echo ""

# PASO 1: Verificar/Instalar Supabase CLI
echo "📦 PASO 1: Verificar Supabase CLI"
echo "Ejecuta:"
echo "  supabase --version"
echo ""
echo "Si no está instalado, ejecuta:"
echo "  npm install -g supabase"
echo ""
read -p "¿Supabase CLI instalado? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Instala Supabase CLI primero: npm install -g supabase"
    exit 1
fi

# PASO 2: Login
echo ""
echo "🔐 PASO 2: Login en Supabase"
echo "Ejecuta:"
echo "  supabase login"
echo ""
echo "Se abrirá tu navegador para autenticarte."
echo ""
read -p "¿Ya hiciste login? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Ejecuta 'supabase login' primero"
    exit 1
fi

# PASO 3: Vincular proyecto
echo ""
echo "🔗 PASO 3: Vincular proyecto"
echo "Ejecuta:"
echo "  cd /home/rodrichrz/proyectos/Made-Erp-777-ok/MADE-ERP-77"
echo "  supabase link --project-ref gomnouwackzvthpwyric"
echo ""
read -p "¿Proyecto vinculado? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Vincula el proyecto primero"
    exit 1
fi

# PASO 4: Configurar Secret
echo ""
echo "🔑 PASO 4: Configurar credenciales de Google Vision"
echo ""
echo "Ve al Dashboard de Supabase:"
echo "  https://supabase.com/dashboard/project/gomnouwackzvthpwyric/settings/vault"
echo ""
echo "1. Click 'Add new secret'"
echo "2. Name: GOOGLE_VISION_CREDENTIALS"
echo "3. Value: Pega el JSON completo de tus credenciales"
echo "4. Click 'Create secret'"
echo ""
echo "Contenido a pegar (REEMPLAZA con tu JSON):"
echo '{"type":"service_account","project_id":"made-gastos",...}'
echo ""
read -p "¿Secret configurado? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Configura el secret primero en el Dashboard"
    exit 1
fi

# PASO 5: Preparar estructura
echo ""
echo "📁 PASO 5: Preparar estructura de carpetas"
cd /home/rodrichrz/proyectos/Made-Erp-777-ok/MADE-ERP-77

if [ ! -d "supabase/functions" ]; then
    echo "Creando supabase/functions..."
    mkdir -p supabase/functions
fi

if [ -d "supabase_functions/ocr-process" ]; then
    echo "Copiando ocr-process..."
    cp -r supabase_functions/ocr-process supabase/functions/
    echo "✅ Estructura lista"
else
    echo "❌ Error: No se encontró supabase_functions/ocr-process/"
    exit 1
fi

# PASO 6: Desplegar
echo ""
echo "🚀 PASO 6: Desplegar Edge Function"
echo "Ejecutando: supabase functions deploy ocr-process --no-verify-jwt"
echo ""

supabase functions deploy ocr-process --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ ¡DEPLOYMENT EXITOSO!"
    echo "=========================================="
    echo ""
    echo "🎯 Próximos pasos:"
    echo ""
    echo "1. Reinicia el frontend:"
    echo "   npm run dev"
    echo ""
    echo "2. Ve a crear un gasto y sube un recibo"
    echo ""
    echo "3. Verifica la consola del navegador:"
    echo "   🤖 Google Vision API (Supabase Edge Function)"
    echo "   ✅ Google Vision OK (Supabase)"
    echo ""
    echo "4. Revisa logs en Dashboard:"
    echo "   https://supabase.com/dashboard/project/gomnouwackzvthpwyric/functions/ocr-process/logs"
    echo ""
    echo "=========================================="
else
    echo ""
    echo "❌ Error en deployment"
    echo ""
    echo "Troubleshooting:"
    echo "- Verifica que el secret GOOGLE_VISION_CREDENTIALS existe"
    echo "- Revisa que supabase/functions/ocr-process/index.ts existe"
    echo "- Ejecuta: supabase functions list"
    echo ""
    exit 1
fi
