@echo off
REM ============================================================================
REM Script para ejecutar pruebas Cypress y generar video de demostración
REM ============================================================================
REM
REM INSTRUCCIONES:
REM 1. Asegúrate de que el servidor de desarrollo esté corriendo (npm run dev)
REM 2. Ejecuta este script desde la carpeta del proyecto en Windows
REM 3. El video se guardará en cypress/videos/
REM
REM ============================================================================

echo.
echo ========================================
echo  DEMO VIDEO - Modulo de Eventos ERP
echo ========================================
echo.

REM Verificar que node está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js no está instalado o no está en el PATH
    pause
    exit /b 1
)

echo [1/4] Verificando dependencias...
call npm install cypress --save-dev 2>nul

echo.
echo [2/4] Limpiando videos anteriores...
if exist "cypress\videos" rmdir /s /q "cypress\videos"
mkdir "cypress\videos" 2>nul

echo.
echo [3/4] Ejecutando pruebas de demostración...
echo       (Esto puede tomar varios minutos)
echo.

call npx cypress run --spec "cypress/e2e/demo-eventos-video.cy.ts" --browser chrome

echo.
echo [4/4] Proceso completado!
echo.
echo ========================================
echo  Videos generados en: cypress\videos\
echo ========================================
echo.

REM Abrir carpeta de videos
if exist "cypress\videos" (
    explorer "cypress\videos"
)

pause
