@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Islamic+ — Ilk Android beta derlemesi (APK)
echo  -----------------------------------------
echo  Ilk calistirmada EAS yeni Android keystore olusturur.
echo  Terminalde "Generate new keystore?" sorusuna Yes deyin.
echo.
call npx eas build --platform android --profile preview
echo.
echo  Derleme bitince: https://expo.dev/accounts/aimelih/projects/islamic/builds
echo  Install linkini arkadaslarinizla paylasin ve beta-links.json dosyasina kaydedin.
echo.
pause
