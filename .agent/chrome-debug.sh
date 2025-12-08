#!/bin/bash
# Script para lanzar Chrome en modo debug desde WSL
# Esto permite que herramientas como Puppeteer/Playwright/Selenium se conecten

CHROME_PATH="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
DEBUG_PORT="${1:-9222}"

echo "🚀 Iniciando Chrome en modo debug..."
echo "📍 Puerto de debugging: $DEBUG_PORT"
echo "🔗 Conéctate a: http://localhost:$DEBUG_PORT"
echo ""

"$CHROME_PATH" \
    --remote-debugging-port=$DEBUG_PORT \
    --user-data-dir="/mnt/c/Users/$USER/ChromeDebugProfile" \
    --no-first-run \
    --no-default-browser-check \
    "$2" &

echo "✅ Chrome iniciado! PID: $!"
echo ""
echo "Para ver las páginas disponibles, visita:"
echo "   http://localhost:$DEBUG_PORT/json"
