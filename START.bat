@echo off
cd /d "%~dp0"
echo Odpalam clutcher-mirror na http://localhost:8901 ...
start "" "http://localhost:8901"
node server.js
pause
