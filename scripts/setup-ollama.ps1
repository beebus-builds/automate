# TeacherFolio Local RAG Setup Script
# Install required Ollama models for the portfolio builder

Write-Host "=== TeacherFolio RAG Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Ollama is installed
$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollama) {
    Write-Host "Ollama not found. Installing..." -ForegroundColor Yellow
    Write-Host "Download from: https://ollama.com/download" -ForegroundColor Yellow
    Write-Host "Then re-run this script." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Ollama found at: $($ollama.Source)" -ForegroundColor Green
Write-Host ""

# Pull the chat model (already configured in .env as OLLAMA_CHAT_MODEL)
$chatModel = "qwen3:8b"
Write-Host "Pulling chat model: $chatModel ..." -ForegroundColor Cyan
ollama pull $chatModel
Write-Host ""

# Verify models
Write-Host "Installed models:" -ForegroundColor Cyan
ollama list
Write-Host ""

# Test the connection
Write-Host "Testing Ollama API..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
    Write-Host "✓ Ollama API is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Could not connect to Ollama API" -ForegroundColor Red
    Write-Host "Make sure Ollama is running in the background" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "Your .env should have:" -ForegroundColor Gray
Write-Host "  OLLAMA_HOST=http://localhost:11434" -ForegroundColor White
Write-Host "  OLLAMA_CHAT_MODEL=qwen3:8b" -ForegroundColor White
Write-Host "  OLLAMA_EMBED_MODEL=qwen3:8b" -ForegroundColor White
Write-Host ""
Write-Host "Start chatting at: http://localhost:3000/build" -ForegroundColor Cyan
