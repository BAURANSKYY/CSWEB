@echo off
title csweb - http://localhost:8901
cd /d "%~dp0"
echo Odpalam csweb na http://localhost:8901 ...
start "" "http://localhost:8901"
node server.js
pause
