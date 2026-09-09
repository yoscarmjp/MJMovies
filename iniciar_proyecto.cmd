@echo off
chcp 65001 >nul
title MJMovies — Gestor de Sistema y Compilacion
color 0C

:MENU
cls
echo ===============================================================================
echo                MJMOVIES — PLATAFORMA DE STREAMING TIPO NETFLIX                
echo                      Y CONTROL REMOTO DIGITAL PARA SMART TV                    
echo ===============================================================================
echo.
echo   [1] Levantar TODO con Docker Compose (Backend + Frontend + MySQL + Redis)
echo   [2] Levantar en Modo Desarrollo Local (3 Ventanas: Backend + Web + Expo)
echo   [3] Compilar APK de la App Remota (Android EAS Build)
echo   [4] Iniciar App Remota con Expo (Escanear con Expo Go en el movil)
echo   [5] Compilar Frontend Web para Produccion (Vite Build)
echo   [6] Instalar/Actualizar Dependencias en todos los proyectos
echo   [7] Detener contenedores Docker (docker compose down)
echo   [0] Salir
echo.
echo ===============================================================================
set /p OPCION="Selecciona una opcion (0-7): "

if "%OPCION%"=="1" goto DOCKER_UP
if "%OPCION%"=="2" goto LOCAL_DEV
if "%OPCION%"=="3" goto BUILD_APK
if "%OPCION%"=="4" goto START_EXPO
if "%OPCION%"=="5" goto BUILD_FRONTEND
if "%OPCION%"=="6" goto INSTALL_ALL
if "%OPCION%"=="7" goto DOCKER_DOWN
if "%OPCION%"=="0" goto SALIR

echo.
echo [!] Opcion invalida. Presiona cualquier tecla para continuar...
pause >nul
goto MENU

:: ==============================================================================
:: OPCION 1: DOCKER COMPOSE
:: ==============================================================================
:DOCKER_UP
cls
echo ===============================================================================
echo   Levantando MJMovies con Docker Compose...
echo ===============================================================================
echo.

if not exist ".env" (
    echo [i] Creando archivo .env raiz a partir de .env.example...
    copy .env.example .env >nul
)

docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [X] ERROR: Docker Desktop no esta ejecutandose o no esta instalado.
    echo     Por favor inicia Docker Desktop y vuelve a intentarlo.
    echo.
    pause
    goto MENU
)

echo [*] Construyendo y levantando contenedores en segundo plano...
docker compose up -d --build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===============================================================================
    echo   [OK] !MJMovies esta activo y funcionando!
    echo ===============================================================================
    echo.
    echo   - Aplicacion Web:  http://localhost
    echo   - API Backend:     http://localhost/api
    echo   - Health Check:    http://localhost/api/health
    echo.
) else (
    echo.
    echo [X] Ocurrio un error al levantar los contenedores. Revisa los logs.
)

pause
goto MENU

:: ==============================================================================
:: OPCION 2: DESARROLLO LOCAL (NODE + VITE + EXPO)
:: ==============================================================================
:LOCAL_DEV
cls
echo ===============================================================================
echo   Levantando Modo Desarrollo Local (3 Ventanas Simultaneas)...
echo ===============================================================================
echo.

if not exist "backend\.env" (
    echo [i] Creando backend\.env desde backend\.env.example...
    copy backend\.env.example backend\.env >nul
)

echo [*] 1. Iniciando Backend API (Puerto 5000)...
start "MJMovies - Backend API" cmd /k "cd /d %~dp0backend && pnpm run dev"

echo [*] 2. Iniciando Frontend Webapp (Vite)...
start "MJMovies - Frontend Web" cmd /k "cd /d %~dp0frontend && pnpm run dev"

echo [*] 3. Iniciando Servidor Expo de la App Remota...
start "MJMovies - Remote App (Expo)" cmd /k "cd /d %~dp0remote-app && pnpm start"

echo.
echo ===============================================================================
echo   [OK] Se abrieron las 3 ventanas de desarrollo:
echo   - Backend:      http://localhost:5000
echo   - Frontend Web: http://localhost:3000
echo   - Remote App:   Servidor Expo listo para conectar tu movil
echo ===============================================================================
echo.
pause
goto MENU

:: ==============================================================================
:: OPCION 3: COMPILAR APK DE LA APP REMOTA
:: ==============================================================================
:BUILD_APK
call "%~dp0compilar_app.cmd"
goto MENU

:: ==============================================================================
:: OPCION 4: INICIAR EXPO (PROBAR APP EN EL MOVIL)
:: ==============================================================================
:START_EXPO
cls
echo ===============================================================================
echo   Iniciando App Remota con Expo...
echo ===============================================================================
echo.
echo [i] Abre la app 'Expo Go' en tu telefono Android o iPhone y escanea el QR
echo     que aparecera en pantalla para usar el control remoto al instante.
echo.
cd /d "%~dp0remote-app"
call pnpm start
cd /d "%~dp0"
pause
goto MENU

:: ==============================================================================
:: OPCION 5: COMPILAR FRONTEND WEB
:: ==============================================================================
:BUILD_FRONTEND
cls
echo ===============================================================================
echo   Compilando Frontend Web para Produccion (Vite)...
echo ===============================================================================
echo.
cd /d "%~dp0frontend"
call pnpm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] !Frontend compilado exitosamente en frontend/dist!
) else (
    echo.
    echo [X] Error durante la compilacion del Frontend.
)

cd /d "%~dp0"
echo.
pause
goto MENU

:: ==============================================================================
:: OPCION 6: INSTALAR TODAS LAS DEPENDENCIAS
:: ==============================================================================
:INSTALL_ALL
cls
echo ===============================================================================
echo   Instalando dependencias en Backend, Frontend y Remote-App...
echo ===============================================================================
echo.

echo [*] 1/3 Instalando dependencias del Backend...
cd /d "%~dp0backend"
call pnpm install
call pnpm run db:generate

echo.
echo [*] 2/3 Instalando dependencias del Frontend...
cd /d "%~dp0frontend"
call pnpm install

echo.
echo [*] 3/3 Instalando dependencias de la App Remota...
cd /d "%~dp0remote-app"
call pnpm install

cd /d "%~dp0"
echo.
echo ===============================================================================
echo   [OK] !Todas las dependencias fueron instaladas y actualizadas!
echo ===============================================================================
echo.
pause
goto MENU

:: ==============================================================================
:: OPCION 7: DETENER CONTENEDORES DOCKER
:: ==============================================================================
:DOCKER_DOWN
cls
echo ===============================================================================
echo   Deteniendo contenedores Docker...
echo ===============================================================================
echo.
docker compose down
echo.
echo [OK] Contenedores detenidos.
pause
goto MENU

:SALIR
exit /b 0
