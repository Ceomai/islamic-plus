@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Islamic - iPhone icin Expo baslatma
echo ========================================
echo.

REM Eski Metro/Expo sureclerini kapat
echo [1/4] Eski sunucu kapatiliyor...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8081" ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
timeout /t 2 /nobreak >nul

REM WiFi IP adresini bul
for /f %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -eq 'WiFi' }).IPAddress"') do set WIFI_IP=%%i

if "%WIFI_IP%"=="" (
  echo HATA: WiFi IP bulunamadi. WiFi acik mi kontrol edin.
  pause
  exit /b 1
)

echo [2/4] WiFi IP: %WIFI_IP%
set REACT_NATIVE_PACKAGER_HOSTNAME=%WIFI_IP%
set EXPO_PACKAGER_PROXY_URL=http://%WIFI_IP%:8081

echo.
echo [3/4] Expo baslatiliyor (LAN modu)...
echo.
echo iPhone Expo Go icinde manuel URL:
echo   exp://%WIFI_IP%:8081
echo.
echo NOT: Tunnel modu Expo hesabi (email/sifre) isteyebilir.
echo      Hesap olmadan calistirmak icin bu dosyayi kullanin.
echo.
echo Tunnel denemek icin (hesap gerekir): baslat-tunnel.bat
echo.
echo [4/4] QR kod asagida gorunecek...
echo ========================================
echo.

call npx expo start --lan --clear --port 8081

pause
