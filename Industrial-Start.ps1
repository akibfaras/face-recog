# Aayam Face-Recog System - Industrial One-Click Startup
# Run this as Administrator to deploy the entire Dockerized stack.

$ErrorActionPreference = "Stop"

function Write-Host-Color ($Message, $Color) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

Write-Host-Color "--- INITIALIZING INDUSTRIAL STACK ---" Cyan

# 1. Identity Discovery & .env Generation
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -notmatch "^127\." -and $_.IPAddress -notmatch "^169\.254\." -and
    $_.InterfaceAlias -notmatch "vEthernet" -and $_.InterfaceAlias -notmatch "WSL"
}).IPAddress | Select-Object -First 1

"HOST_IP=$ip" | Out-File -FilePath .env -Encoding ascii
"RP_ID=$ip" | Out-File -FilePath .env -Append -Encoding ascii
"ORIGIN=https://$($ip):3000" | Out-File -FilePath .env -Append -Encoding ascii
Write-Host-Color " - Network Identity: $ip" Green

# 2. SSL Infrastructure (mkcert)
if (Get-Command mkcert -ErrorAction SilentlyContinue) {
    Write-Host-Color " - Refreshing SSL Certificates..." White
    mkcert -install
    mkcert -cert-file cert.pem -key-file key.pem $ip localhost 127.0.0.1 ::1
}

# 3. Network & Firewall
if (Test-Path "Setup-Network.ps1") {
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File .\Setup-Network.ps1" -Wait -Verb RunAs
}

# 4. Docker Orchestration (Including Frontend)
Write-Host-Color " - Building and Launching Containers..." White
docker compose down
docker compose up -d --build

# 5. Database Auto-Sync
Write-Host-Color " - Syncing Database Schema..." White
Start-Sleep -Seconds 10
docker exec face-recog-db psql -U user -d face_recog -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id VARCHAR UNIQUE;"
docker exec face-recog-db psql -U user -d face_recog -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS credential_public_key TEXT;"
docker exec face-recog-db psql -U user -d face_recog -c "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS confidence_score FLOAT;"

Write-Host "`n"
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " SYSTEM IS LIVE & SECURE" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " URL: https://$ip:3000" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "All services (Frontend, Backend, DB) are running in Docker."
Write-Host "You can now migrate this folder to your laptop."
Write-Host "`n"
pause
