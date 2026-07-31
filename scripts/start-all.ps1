# TeacherFolio — Start all servers
param([switch]$NoSignaling)

$RootDir = Split-Path $PSScriptRoot -Parent

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " TeacherFolio — Starting All Servers" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Next.js (npm run dev)..." -ForegroundColor White
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -NoNewWindow

if (-not $NoSignaling) {
  Write-Host "[2] Signaling Server..." -ForegroundColor White
  $venvPython = Join-Path $RootDir "python-server\.venv\Scripts\python.exe"
  if (Test-Path $venvPython) {
    $pyServer = Join-Path $RootDir "python-server\server.py"
    Start-Process -FilePath $venvPython -ArgumentList "-m uvicorn server:app --host 127.0.0.1 --port 8765" -NoNewWindow
    Write-Host "  ✓ Signaling server starting on ws://127.0.0.1:8765" -ForegroundColor Green
  } else {
    Write-Host "  ⚠ Python venv not found. Run scripts/setup-python-server.ps1 first" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Servers:" -ForegroundColor Cyan
Write-Host "  Next.js:         http://localhost:3000" -ForegroundColor Green
Write-Host "  Signaling:       ws://127.0.0.1:8765/ws/signal" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
