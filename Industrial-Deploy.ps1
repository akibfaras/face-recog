# Aayam Face-Recog System - Industrial Unified Deployment Script
# This script handles Network Setup, Docker Lifecycle, and DB Schema Versioning.

$ErrorActionPreference = "Stop"

function Write-Host-Color ($Message, $Color) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

Write-Host-Color "--- STARTING SYSTEM DEPLOYMENT ---" Cyan

# 0. Detect LAN IP and generate .env
Write-Host-Color "Step 0: Detecting Network Identity..." White
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -notmatch "^127\." -and 
    $_.IPAddress -notmatch "^169\.254\." -and
    $_.InterfaceAlias -notmatch "vEthernet" -and
    $_.InterfaceAlias -notmatch "WSL" -and
    $_.InterfaceAlias -notmatch "vEther"
}).IPAddress | Select-Object -First 1

if (-not $ip) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch "^127\." }).IPAddress | Select-Object -First 1
}

"HOST_IP=$ip" | Out-File -FilePath .env -Encoding ascii
Write-Host-Color " - Identified Host LAN IP: $ip" Green

# 0.1 Generate SSL Certificates using mkcert
Write-Host-Color "Step 0.1: Securing Infrastructure (mkcert)..." White
if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    Write-Host-Color " ! mkcert not found. Please install it (choco install mkcert)." Yellow
} else {
    mkcert -install
    mkcert -cert-file cert.pem -key-file key.pem $ip localhost 127.0.0.1 ::1
    Write-Host-Color " - SSL Certificates generated (cert.pem, key.pem)" Green
}

# 1. Run Network Setup (Elevated)
if (Test-Path "Setup-Network.ps1") {
    Write-Host-Color "Step 1: Running Network Configuration..." White
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File .\Setup-Network.ps1" -Wait -Verb RunAs
}

# 2. Docker Lifecycle
Write-Host-Color "Step 2: Rebuilding & Starting Backend Containers..." White
docker compose down
docker compose up -d --build

# Wait for DB to be healthy
Write-Host-Color "Step 3: Waiting for Database Health Check..." White
$timeout = 60
$start = Get-Date
while ((docker inspect -f '{{.State.Health.Status}}' face-recog-db) -ne "healthy") {
    if (((Get-Date) - $start).TotalSeconds -gt $timeout) {
        Write-Host-Color "CRITICAL: Database failed to start in time." Red
        exit
    }
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 2
}
Write-Host " DONE!" -ForegroundColor Green

# 4. Database Schema Versioning (Automated Migration Sync)
Write-Host-Color "Step 4: Syncing Database Schema (Biometric Upgrades)..." White
docker exec face-recog-db psql -U user -d face_recog -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id VARCHAR UNIQUE;"
docker exec face-recog-db psql -U user -d face_recog -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS credential_public_key TEXT;"
docker exec face-recog-db psql -U user -d face_recog -c "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS confidence_score FLOAT;"
Write-Host-Color " - Industrial Schema is up to date." Green

# 5. Frontend Dependency Sync
Write-Host-Color "Step 5: Synchronizing Frontend Dependencies..." White
cd frontend
npm install --silent
cd ..
Write-Host-Color " - Frontend is ready." Green

# 6. Final Status Check
Write-Host "`n"
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " BACKEND IS LIVE" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "You can now start the frontend by running:" -ForegroundColor Gray
Write-Host "  cd frontend; npm start" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "`n"

$choice = Read-Host "Would you like me to start the frontend for you? (Y/N)"
if ($choice -eq "Y" -or $choice -eq "y") {
    Write-Host-Color "Starting Frontend in separate window..." Cyan
    Start-Process powershell.exe -ArgumentList "-NoProfile -NoExit -Command 'cd frontend; npm start'"
}

Write-Host-Color "Deployment sequence complete." Green
pause
