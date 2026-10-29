@echo off
chcp 65001 >nul
title MJMovies — Remote App APK Builder
color 0A

set EAS_NO_VCS=1

:START
cls
echo                 MJMOVIES REMOTE — ANDROID APK BUILDER                
echo.
cd /d "%~dp0remote-app"

if not exist "node_modules" (
    echo [*] Installing dependencies with pnpm...
    call pnpm install
)

echo [*] Checking Expo / EAS session...
call npx eas-cli whoami >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [OK] Active Expo session found.
    goto BUILD_DIRECT
) else (
    goto NO_AUTH
)

:NO_AUTH
echo.
echo [!] To build the APK in the cloud you need a FREE Expo account.
echo.
echo   [1] Log in to Expo (EAS Login)
echo   [2] Create a FREE account (Quick registration in 30 seconds)
echo   [3] Test the App on your phone RIGHT NOW with Expo Go (No APK build needed)
echo   [0] Exit
echo.
set /p OPCION_AUTH="Select an option (1-3): "

if "%OPCION_AUTH%"=="1" goto LOGIN_EXPO
if "%OPCION_AUTH%"=="2" goto REGISTER_EXPO
if "%OPCION_AUTH%"=="3" goto RUN_EXPO_GO
if "%OPCION_AUTH%"=="0" exit /b 0

echo Invalid option.
pause
goto START

:LOGIN_EXPO
cls
echo   Log in to Expo (EAS)
echo.
echo Enter your username/email and password registered at https://expo.dev
echo.
call npx eas-cli login
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Logged in successfully!
    pause
    goto BUILD_DIRECT
) else (
    echo.
    echo [X] Authentication error. If you don't have an account yet, choose option [2] to create one.
    pause
    goto NO_AUTH
)

:REGISTER_EXPO
cls
echo   Create a Free Expo Account
echo.
echo You can register quickly below or at: https://expo.dev/signup
echo.
call npx eas-cli register
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Account created and logged in successfully!
    pause
    goto BUILD_DIRECT
) else (
    echo.
    echo [!] You can also open https://expo.dev/signup in your browser to register.
    pause
    goto NO_AUTH
)

:RUN_EXPO_GO
cls
echo   Starting Expo Server to Test on Phone (Expo Go)
echo.
echo   1. Download the 'Expo Go' app from the Google Play Store on your Android phone.
echo   2. Connect your phone to the same Wi-Fi network as this PC.
echo   3. Scan the QR code that will appear below using the Expo Go app.
echo.
call npx expo start
pause
goto START

:BUILD_DIRECT
cls
echo   Building MJMovies Remote APK with EAS Build
echo.
echo [*] Uploading build to Expo servers to generate the .apk file...
echo [i] Git-less mode enabled (EAS_NO_VCS=1).
echo [i] When finished, you will receive a direct link to download and install the APK on your Android device.
echo.
set EAS_NO_VCS=1
call npx eas-cli build --platform android --profile preview

echo.
echo   Process finished.
pause
goto START
