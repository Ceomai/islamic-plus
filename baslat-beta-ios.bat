@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Islamic+ — iOS beta (TestFlight)
echo  -------------------------------
echo  1) Apple Developer + App Store Connect uygulamasi gerekli
echo  2) Bundle ID: com.islamic.app
echo.
set /p step="Adim [1=build, 2=submit, 3=ikisi]: "
if "%step%"=="2" goto submit
if "%step%"=="3" goto both
goto build

:build
call npx eas build --platform ios --profile preview
if "%step%"=="3" goto submit
goto end

:submit
echo.
echo  App Store Connect'te uygulama olusturulmus olmali.
call npx eas submit --platform ios --latest --profile preview
goto end

:both
call npx eas build --platform ios --profile preview
call npx eas submit --platform ios --latest --profile preview

:end
echo.
echo  TestFlight: https://appstoreconnect.apple.com
echo  External Testing - public linki beta-links.json dosyasina kaydedin.
echo.
pause
