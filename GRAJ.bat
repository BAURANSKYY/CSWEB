@echo off
cd /d "%~dp0"
echo CSWEB - odpalanie gry (dziala bez internetu)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server-ps.ps1"
pause
