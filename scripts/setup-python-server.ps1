# TeacherFolio Signaling Server Setup
# Installs minimal dependencies for the WebRTC signaling server (no AI models)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path $PSScriptRoot -Parent
$PyDir = Join-Path $RootDir "python-server"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " TeacherFolio Signaling Server Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

try {
    $python = if (Get-Command python3 -ErrorAction SilentlyContinue) { "python3" } else { "python" }
    & $python --version | Out-Null
    Write-Host "  ✓ Python found" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Python 3.10+ required" -ForegroundColor Red
    exit 1
}

$venvDir = Join-Path $PyDir ".venv"
if (-not (Test-Path $venvDir)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    & $python -m venv $venvDir
}

$pip = Join-Path $venvDir "Scripts\pip.exe"
Write-Host "Installing dependencies..." -ForegroundColor Yellow
& $pip install --upgrade pip -q
& $pip install -r (Join-Path $PyDir "requirements.txt")

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Setup Complete!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the signaling server:" -ForegroundColor White
Write-Host "  cd python-server" -ForegroundColor Yellow
Write-Host "  .venv\Scripts\activate" -ForegroundColor Yellow
Write-Host "  python server.py" -ForegroundColor Yellow
Write-Host ""
Write-Host "This server handles WebRTC peer-to-peer call signaling." -ForegroundColor White
Write-Host "No AI models are used — pure WebSocket relay only." -ForegroundColor White
