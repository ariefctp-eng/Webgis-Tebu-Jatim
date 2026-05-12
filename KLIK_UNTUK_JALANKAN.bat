@echo off
echo ========================================
echo JALANKAN WEBGIS TEBU JATIM
echo ========================================
echo.
echo 1. Membuka browser ke http://localhost:8000...
start "" "http://localhost:8000"
echo 2. Mengaktifkan server lokal...
echo.
echo JANGAN TUTUP JENDELA INI SELAMA MENGGUNAKAN WEBGIS.
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0jalankan_webgis.ps1"
pause
