#!/bin/bash

# Script para hacer push a GitHub con token de acceso personal
# Uso: ./push-to-github.sh

echo "======================================"
echo "  Push a GitHub con Token de Acceso"
echo "======================================"
echo ""

# Obtener el repositorio actual
REPO_URL=$(git remote get-url origin 2>/dev/null)

if [ -z "$REPO_URL" ]; then
    echo "❌ Error: No se encontró un repositorio remoto configurado"
    exit 1
fi

# Extraer el nombre del repositorio (sin el https:// y sin credenciales)
REPO_PATH=$(echo "$REPO_URL" | sed -E 's|https://([^@]*@)?||' | sed 's|.git$||')

echo "📦 Repositorio: $REPO_PATH"
echo ""

# Verificar que hay commits para enviar
COMMITS_PENDING=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l)

if [ "$COMMITS_PENDING" -eq 0 ]; then
    echo "✅ No hay commits pendientes para enviar"
    exit 0
fi

echo "📊 Commits pendientes: $COMMITS_PENDING"
echo ""
git log origin/main..HEAD --oneline --decorate --graph
echo ""

# Verificar si ya hay un token guardado
CURRENT_URL=$(git remote get-url origin)
if [[ "$CURRENT_URL" == *"@"* ]]; then
    echo "🔑 Token encontrado en la configuración"
    echo ""
    read -p "¿Quieres usar el token guardado? (s/n): " USE_SAVED

    if [[ "$USE_SAVED" == "s" ]] || [[ "$USE_SAVED" == "S" ]]; then
        echo "📤 Haciendo push con token guardado..."
        git push origin main

        if [ $? -eq 0 ]; then
            echo ""
            echo "======================================"
            echo "✅ Push completado exitosamente!"
            echo "======================================"
            exit 0
        else
            echo ""
            echo "❌ Error con el token guardado. Ingresa uno nuevo."
            echo ""
        fi
    fi
fi

# Solicitar el token de forma segura (sin mostrar en pantalla)
echo "🔐 Ingresa tu GitHub Personal Access Token:"
echo "   (No se mostrará mientras escribes)"
read -s GITHUB_TOKEN

if [ -z "$GITHUB_TOKEN" ]; then
    echo ""
    echo "❌ Error: No se proporcionó un token"
    exit 1
fi

echo ""
read -p "¿Quieres guardar este token en la configuración? (s/n): " SAVE_TOKEN

echo ""
echo "🔄 Configurando repositorio remoto con token..."

# Configurar la URL remota con el token
git remote set-url origin "https://${GITHUB_TOKEN}@${REPO_PATH}.git"

if [ $? -ne 0 ]; then
    echo "❌ Error al configurar el repositorio remoto"
    exit 1
fi

echo "✅ Repositorio configurado"
echo ""
echo "📤 Haciendo push a origin/main..."

# Hacer push
git push origin main

PUSH_RESULT=$?

# Si NO se quiere guardar el token, limpiarlo
if [[ "$SAVE_TOKEN" != "s" ]] && [[ "$SAVE_TOKEN" != "S" ]]; then
    echo ""
    echo "🔒 Limpiando token de la configuración..."
    git remote set-url origin "https://${REPO_PATH}.git"
else
    echo ""
    echo "💾 Token guardado en la configuración de git"
    echo "   (Puedes eliminarlo con: git remote set-url origin https://${REPO_PATH}.git)"
fi

if [ $PUSH_RESULT -eq 0 ]; then
    echo ""
    echo "======================================"
    echo "✅ Push completado exitosamente!"
    echo "======================================"
    echo ""
    echo "🎉 Los cambios se publicaron en GitHub"
    exit 0
else
    echo ""
    echo "======================================"
    echo "❌ Error al hacer push"
    echo "======================================"
    echo ""
    echo "Posibles causas:"
    echo "  - Token inválido o expirado"
    echo "  - Token sin permisos de 'repo'"
    echo "  - No tienes acceso de escritura al repositorio"
    echo ""
    echo "Crea un nuevo token en: https://github.com/settings/tokens/new"
    echo "Asegúrate de seleccionar el scope 'repo'"

    # Limpiar token inválido
    git remote set-url origin "https://${REPO_PATH}.git"

    exit 1
fi
