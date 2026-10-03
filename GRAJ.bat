@echo off
cd /d "%~dp0"
echo CSWEB - odpalanie gry (dziala bez internetu)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c = New-Object Net.Sockets.TcpClient; try { $a = $c.BeginConnect('localhost', 8901, $null, $null); if ($a.AsyncWaitHandle.WaitOne(1200)) { $c.EndConnect($a); Write-Output 'Serwer juz dziala - otwieram gre...'; Start-Process 'http://localhost:8901/'; exit } } catch {}; & '%~dp0server-ps.ps1'"
pause
