@echo off
chcp 65001 >nul
title MJMovies — System & Build Manager
color 0C

:MENU
cls
echo ===============================================================================
echo                  MJMOVIES — NETFLIX-STYLE STREAMING PLATFORM                  
echo                    AND DIGITAL REMOTE CONTROL FOR SMART TV                    
echo ===============================================================================
echo.
echo   [1] Start everything with Docker Compose (Backend + Frontend + MySQL + Redis)
echo   [2] Start in Local Development Mode (3 Windows: Backend + Web + Expo)
echo   [3] Build Remote App APK (Android EAS Build)
echo   [4] Start Remote App with Expo (Scan QR with Expo Go on your phone)
echo   [5] Build Web Frontend for Production (Vite Build)
echo   [6] Install/Update Dependencies in all projects
echo   [7] Stop Docker containers (docker compose down)
echo   [0] Exit
echo.
echo ===============================================================================
set /p OPCION="Select an option (0-7): "

if "%OPCION%"=="1" goto DOCKER_UP
if "%OPCION%"=="2" goto LOCAL_DEV
if "%OPCION%"=="3" goto BUILD_APK
if "%OPCION%"=="4" goto START_EXPO
if "%OPCION%"=="5" goto BUILD_FRONTEND
if "%OPCION%"=="6" goto INSTALL_ALL
if "%OPCION%"=="7" goto DOCKER_DOWN
if "%OPCION%"=="0" goto EXIT

echo.
echo [!] Invalid option. Press any key to continue...
pause >nul
goto MENU

:: ==============================================================================
:: OPTION 1: DOCKER COMPOSE
:: ==============================================================================
:DOCKER_UP
cls
echo ===============================================================================
echo   Starting MJMovies with Docker Compose...
echo ===============================================================================
echo.

if not exist ".env" (
    echo [i] Creating root .env file from .env.example...
    copy .env.example .env >nul
)

docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [X] ERROR: Docker Desktop is not running or not installed.
    echo     Please start Docker Desktop and try again.
    echo.
    pause
    goto MENU
)

echo [*] Building and starting containers in the background...
docker compose up -d --build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===============================================================================
    echo   [OK] MJMovies is up and running!
    echo ===============================================================================
    echo.
    echo   - Web App:       http://localhost
    echo   - Backend API:   http://localhost/api
    echo   - Health Check:  http://localhost/api/health
    echo.
) else (
    echo.
    echo [X] An error occurred while starting the containers. Check the logs.
)

pause
goto MENU

:: ==============================================================================
:: OPTION 2: LOCAL DEVELOPMENT (NODE + VITE + EXPO)
:: ==============================================================================
:LOCAL_DEV
cls
echo ===============================================================================
echo   Starting Local Development Mode (3 Simultaneous Windows)...
echo ===============================================================================
echo.

if not exist "backend\.env" (
    echo [i] Creating backend\.env from backend\.env.example...
    copy backend\.env.example backend\.env >nul
)

echo [*] 1. Starting Backend API (Port 5000)...
start "MJMovies - Backend API" cmd /k "cd /d %~dp0backend && pnpm run dev"

echo [*] 2. Starting Frontend Webapp (Vite)...
start "MJMovies - Frontend Web" cmd /k "cd /d %~dp0frontend && pnpm run dev"

echo [*] 3. Starting Remote App Expo Server...
start "MJMovies - Remote App (Expo)" cmd /k "cd /d %~dp0remote-app && pnpm start"

echo.
echo ===============================================================================
echo   [OK] 3 development windows have been opened:
echo   - Backend:      http://localhost:5000
echo   - Frontend Web: http://localhost:3000
echo   - Remote App:   Expo server ready — connect your phone
echo ===============================================================================
echo.
pause
goto MENU

:: ==============================================================================
:: OPTION 3: BUILD REMOTE APP APK
:: ==============================================================================
:BUILD_APK
call "%~dp0compilar_app.cmd"
goto MENU

:: ==============================================================================
:: OPTION 4: START EXPO (TEST APP ON PHONE)
:: ==============================================================================
:START_EXPO
cls
echo ===============================================================================
echo   Starting Remote App with Expo...
echo ===============================================================================
echo.
echo [i] Open the 'Expo Go' app on your Android or iPhone and scan the QR code
echo     that will appear on screen to use the remote control instantly.
echo.
cd /d "%~dp0remote-app"
call pnpm start
cd /d "%~dp0"
pause
goto MENU

:: ==============================================================================
:: OPTION 5: BUILD WEB FRONTEND
:: ==============================================================================
:BUILD_FRONTEND
cls
echo ===============================================================================
echo   Building Web Frontend for Production (Vite)...
echo ===============================================================================
echo.
cd /d "%~dp0frontend"
call pnpm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Frontend built successfully in frontend/dist!
) else (
    echo.
    echo [X] Error during Frontend build.
)

cd /d "%~dp0"
echo.
pause
goto MENU

:: ==============================================================================
:: OPTION 6: INSTALL ALL DEPENDENCIES
:: ==============================================================================
:INSTALL_ALL
cls
echo ===============================================================================
echo   Installing dependencies for Backend, Frontend and Remote-App...
echo ===============================================================================
echo.

echo [*] 1/3 Installing Backend dependencies...
cd /d "%~dp0backend"
call pnpm install
call pnpm run db:generate

echo.
echo [*] 2/3 Installing Frontend dependencies...
cd /d "%~dp0frontend"
call pnpm install

echo.
echo [*] 3/3 Installing Remote App dependencies...
cd /d "%~dp0remote-app"
call pnpm install

cd /d "%~dp0"
echo.
echo ===============================================================================
echo   [OK] All dependencies have been installed and updated!
echo ===============================================================================
echo.
pause
goto MENU

:: ==============================================================================
:: OPTION 7: STOP DOCKER CONTAINERS
:: ==============================================================================
:DOCKER_DOWN
cls
echo ===============================================================================
echo   Stopping Docker containers...
echo ===============================================================================
echo.
docker compose down
echo.
echo [OK] Containers stopped.
pause
goto MENU

:EXIT
exit /b 0
