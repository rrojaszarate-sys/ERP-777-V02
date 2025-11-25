#!/bin/bash

# ============================================
# SCRIPT DE DEPLOY: GOOGLE VISION → SUPABASE
# ============================================

set -e  # Exit on error

echo "🚀 Iniciando migración de Google Vision a Supabase Edge Functions..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Verificar Supabase CLI
echo "📦 Verificando Supabase CLI..."
if ! command -v ./supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI no encontrado${NC}"
    echo "Descarga desde: https://github.com/supabase/cli/releases"
    exit 1
fi
echo -e "${GREEN}✅ Supabase CLI encontrado${NC}"
echo ""

# Step 2: Verificar login
echo "🔐 Verificando autenticación..."
if ! ./supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  No estás autenticado. Ejecutando login...${NC}"
    ./supabase login
fi
echo -e "${GREEN}✅ Autenticación exitosa${NC}"
echo ""

# Step 3: Preguntar por Project Ref
echo "🔗 Ingresa tu Project Ref de Supabase:"
echo "   (Lo encuentras en: Dashboard > Settings > API > Project URL)"
read -p "Project Ref: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}❌ Project Ref es requerido${NC}"
    exit 1
fi
echo ""

# Step 4: Verificar Google Vision Credentials
echo "🔑 Verificando Google Vision Credentials..."
if [ -z "$GOOGLE_VISION_CREDENTIALS" ]; then
    echo -e "${YELLOW}⚠️  Variable GOOGLE_VISION_CREDENTIALS no encontrada${NC}"
    echo ""
    echo "Opciones:"
    echo "  1. Configurar desde archivo .env"
    echo "  2. Ingresar manualmente (JSON)"
    echo "  3. Configurar más tarde en Supabase Dashboard"
    read -p "Selecciona opción (1-3): " CRED_OPTION
    
    case $CRED_OPTION in
        1)
            if [ -f ".env" ]; then
                source .env
                if [ -n "$VITE_GOOGLE_VISION_CREDENTIALS" ]; then
                    GOOGLE_VISION_CREDENTIALS="$VITE_GOOGLE_VISION_CREDENTIALS"
                    echo -e "${GREEN}✅ Credenciales cargadas desde .env${NC}"
                else
                    echo -e "${RED}❌ VITE_GOOGLE_VISION_CREDENTIALS no encontrado en .env${NC}"
                    exit 1
                fi
            else
                echo -e "${RED}❌ Archivo .env no encontrado${NC}"
                exit 1
            fi
            ;;
        2)
            echo "Pega el JSON completo de Google Service Account:"
            read -r GOOGLE_VISION_CREDENTIALS
            ;;
        3)
            echo -e "${YELLOW}⚠️  Deberás configurar el secret manualmente después del deploy${NC}"
            GOOGLE_VISION_CREDENTIALS=""
            ;;
        *)
            echo -e "${RED}❌ Opción inválida${NC}"
            exit 1
            ;;
    esac
fi
echo ""

# Step 5: Deploy Edge Function
echo "🚀 Deployando Edge Function..."
if ./supabase functions deploy ocr-process --project-ref "$PROJECT_REF"; then
    echo -e "${GREEN}✅ Edge Function deployada exitosamente${NC}"
else
    echo -e "${RED}❌ Error deployando Edge Function${NC}"
    exit 1
fi
echo ""

# Step 6: Configurar Secret (si está disponible)
if [ -n "$GOOGLE_VISION_CREDENTIALS" ]; then
    echo "🔐 Configurando secret GOOGLE_VISION_CREDENTIALS..."
    if ./supabase secrets set GOOGLE_VISION_CREDENTIALS="$GOOGLE_VISION_CREDENTIALS" --project-ref "$PROJECT_REF"; then
        echo -e "${GREEN}✅ Secret configurado${NC}"
    else
        echo -e "${RED}❌ Error configurando secret${NC}"
        echo -e "${YELLOW}   Configúralo manualmente en: Dashboard > Settings > Edge Functions > Secrets${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Secret no configurado. Hazlo manualmente:${NC}"
    echo "   1. Ve a Supabase Dashboard"
    echo "   2. Settings > Edge Functions > Secrets"
    echo "   3. Agrega: GOOGLE_VISION_CREDENTIALS"
fi
echo ""

# Step 7: Verificar deployment
echo "🔍 Verificando deployment..."
echo ""
./supabase functions list --project-ref "$PROJECT_REF"
echo ""

# Step 8: Test básico
echo "🧪 Test básico de la función..."
FUNCTION_URL="https://$PROJECT_REF.supabase.co/functions/v1/ocr-process"
echo "URL: $FUNCTION_URL"

# Imagen de test en base64 (1x1 pixel PNG)
TEST_BASE64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

echo "Enviando request de test..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"fileBase64\":\"$TEST_BASE64\",\"fileName\":\"test.png\"}")

if echo "$RESPONSE" | grep -q "texto_completo"; then
    echo -e "${GREEN}✅ Test exitoso${NC}"
    echo "Respuesta: $RESPONSE"
else
    echo -e "${YELLOW}⚠️  Test falló o función aún no lista${NC}"
    echo "Respuesta: $RESPONSE"
fi
echo ""

# Step 9: Mostrar próximos pasos
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}🎉 MIGRACIÓN COMPLETADA${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo "📝 Próximos pasos:"
echo ""
echo "1. Actualizar frontend para usar Supabase OCR:"
echo "   import { useSupabaseOCR } from '@/modules/ocr/services/supabaseOCRService';"
echo ""
echo "2. Verificar logs:"
echo "   ./supabase functions logs ocr-process --project-ref $PROJECT_REF"
echo ""
echo "3. (OPCIONAL) Eliminar servidor Node.js:"
echo "   rm -rf server/"
echo "   npm uninstall express cors multer @google-cloud/vision"
echo ""
echo "4. Ver documentación completa:"
echo "   cat MIGRACION_GOOGLE_VISION_A_SUPABASE.md"
echo ""
echo -e "${GREEN}✅ Todo listo para usar OCR con Supabase!${NC}"
