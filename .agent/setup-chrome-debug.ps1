# ============================================
# SCRIPT: Configurar Chrome para Debug Remoto
# Ejecutar en PowerShell como Administrador
# ============================================

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Configurando Chrome para Debug Remoto (WSL)  " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Cerrar Chrome si está corriendo
Write-Host "[1/4] Cerrando Chrome si está abierto..." -ForegroundColor Yellow
Stop-Process -Name "chrome" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "      Chrome cerrado." -ForegroundColor Green

# 2. Crear regla de Firewall
Write-Host "[2/4] Configurando regla de Firewall..." -ForegroundColor Yellow
$ruleName = "Chrome Remote Debug WSL"

# Eliminar regla existente si hay
Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

# Crear nueva regla
New-NetFirewallRule -DisplayName $ruleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 9222 `
    -Action Allow `
    -Profile Any `
    -Description "Permite conexiones de debug remoto desde WSL a Chrome"

Write-Host "      Regla de Firewall creada." -ForegroundColor Green

# 3. Crear directorio de perfil si no existe
Write-Host "[3/4] Creando directorio de perfil..." -ForegroundColor Yellow
$profileDir = "C:\ChromeDebug"
if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}
Write-Host "      Directorio: $profileDir" -ForegroundColor Green

# 4. Iniciar Chrome con debug remoto
Write-Host "[4/4] Iniciando Chrome con debug remoto..." -ForegroundColor Yellow
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"

Start-Process $chromePath -ArgumentList @(
    "--remote-debugging-port=9222",
    "--remote-debugging-address=0.0.0.0",
    "--user-data-dir=$profileDir",
    "--no-first-run",
    "--no-default-browser-check"
)

Write-Host "      Chrome iniciado en puerto 9222" -ForegroundColor Green

# Mostrar resumen
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACION COMPLETADA                      " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Chrome esta escuchando en: 0.0.0.0:9222" -ForegroundColor White
Write-Host ""
Write-Host "Para verificar desde WSL ejecuta:" -ForegroundColor Yellow
Write-Host "  curl -s http://172.26.224.1:9222/json/version" -ForegroundColor White
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
