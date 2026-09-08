# TeacherFolio — Start servers
$RootDir = Split-Path $PSScriptRoot -Parent

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " TeacherFolio — Starting Server" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next.js (npm run dev)..." -ForegroundColor White
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -NoNewWindow

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Server:" -ForegroundColor Cyan
Write-Host "  Next.js:         http://localhost:3000" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
