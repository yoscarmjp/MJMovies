@echo off
chcp 65001 >nul
title MJMovies — Compilador de APK Control Remoto
color 0A

:: Configurar EAS para que no requiera Git
set EAS_NO_VCS=1

:INICIO
cls
echo ===============================================================================
echo                MJMOVIES REMOTE — COMPILADOR DE APK PARA ANDROID                
echo ===============================================================================
echo.
cd /d "%~dp0remote-app"

if not exist "node_modules" (
    echo [*] Instalando dependencias con pnpm...
    call pnpm install
)

echo [*] Verificando sesion de Expo / EAS...
call npx eas-cli whoami >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [OK] Sesion activa en Expo.
    goto BUILD_DIRECTO
) else (
    goto NO_AUTH
)

:NO_AUTH
echo.
echo [!] Para compilar la APK en la nube necesitas una cuenta GRATUITA de Expo.
echo.
echo   [1] Iniciar sesion en Expo (EAS Login)
echo   [2] Crear cuenta nueva GRATIS (Registro rapido en 30 segundos)
echo   [3] Probar la App en tu movil YA MISMO con Expo Go (Sin compilar APK)
echo   [0] Salir
echo.
set /p OPCION_AUTH="Selecciona una opcion (1-3): "

if "%OPCION_AUTH%"=="1" goto LOGIN_EXPO
if "%OPCION_AUTH%"=="2" goto REGISTER_EXPO
if "%OPCION_AUTH%"=="3" goto RUN_EXPO_GO
if "%OPCION_AUTH%"=="0" exit /b 0

echo Opcion invalida.
pause
goto INICIO

:LOGIN_EXPO
cls
echo ===============================================================================
echo   Iniciar Sesion en Expo (EAS)
echo ===============================================================================
echo.
echo Ingresa tu usuario/email y contrasena registrados en https://expo.dev
echo.
call npx eas-cli login
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] !Sesion iniciada correctamente!
    pause
    goto BUILD_DIRECTO
) else (
    echo.
    echo [X] Error de autenticacion. Si no tienes cuenta aun, elige la opcion [2] para crearla.
    pause
    goto NO_AUTH
)

:REGISTER_EXPO
cls
echo ===============================================================================
echo   Crear Cuenta Gratuita en Expo
echo ===============================================================================
echo.
echo Puedes registrarte rapidamente a continuacion o en: https://expo.dev/signup
echo.
call npx eas-cli register
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] !Cuenta creada e iniciada exitosamente!
    pause
    goto BUILD_DIRECTO
) else (
    echo.
    echo [!] Tambien puedes abrir https://expo.dev/signup en tu navegador para registrarte.
    pause
    goto NO_AUTH
)

:RUN_EXPO_GO
cls
echo ===============================================================================
echo   Iniciando Servidor Expo para Probar en el Movil (Expo Go)
echo ===============================================================================
echo.
echo   1. Descarga la app 'Expo Go' desde Google Play Store en tu movil Android.
echo   2. Conecta tu movil a la misma red Wi-Fi que esta PC.
echo   3. Escanea el codigo QR que aparecera a continuacion con la app Expo Go.
echo.
call npx expo start
pause
goto INICIO

:BUILD_DIRECTO
cls
echo ===============================================================================
echo   Compilando APK de MJMovies Remote con EAS Build
echo ===============================================================================
echo.
echo [*] Enviando build a los servidores de Expo para generar el archivo .apk...
echo [i] Modo sin Git activado (EAS_NO_VCS=1).
echo [i] Al finalizar recibiras un enlace directo para descargar e instalar la APK en tu Android.
echo.
set EAS_NO_VCS=1
call npx eas-cli build --platform android --profile preview

echo.
echo ===============================================================================
echo   Proceso finalizado.
echo ===============================================================================
pause
goto INICIO
