@echo off
SETLOCAL EnableDelayedExpansion

echo ==========================================
echo   Attendance System - One-Click Deploy
echo ==========================================

:: 1. Check for Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not running. 
    echo Please install Docker Desktop and start it first.
    pause
    exit /b
)

:: 2. Check for Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. 
    echo Please install Node.js to run the Frontend.
    pause
    exit /b
)

:: 3. Prepare Folders
if not exist "data\uploads" mkdir data\uploads

:: 4. Start Backend (Docker)
echo [1/3] Starting Backend Services in Docker...
docker-compose up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose failed to start.
    pause
    exit /b
)

:: 5. Install Frontend Dependencies
echo [2/3] Installing Frontend Dependencies (this may take a minute)...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b
)

:: 6. Launch Frontend
echo [3/3] Launching Frontend UI...
start "Attendance System UI" npm start

echo ==========================================
echo   DEPLOYMENT SUCCESSFUL
echo ==========================================
echo Backend running on ports: 9001-9004
echo Frontend will open in your browser shortly.
echo.
echo Press any key to see backend logs or close this window...
pause
docker-compose logs -f
