# CSWEB - serwer bez zaleznosci (czysty Windows, bez Node i Pythona).
# Uruchamiane przez GRAJ.bat z tego samego folderu.
$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8901
$mime = @{
  '.html' = 'text/html'; '.js' = 'text/javascript'; '.mjs' = 'text/javascript';
  '.css' = 'text/css'; '.json' = 'application/json';
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg';
  '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon';
  '.webp' = 'image/webp'; '.otf' = 'font/otf'; '.woff' = 'font/woff'; '.woff2' = 'font/woff2';
  '.glb' = 'model/gltf-binary'; '.bin' = 'application/octet-stream';
  '.mp3' = 'audio/mpeg'; '.m4a' = 'audio/mp4'; '.ogg' = 'audio/ogg'; '.wav' = 'audio/wav'
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:' + $port + '/')
$lan = $null
try { $lan = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254\.' } | Select-Object -First 1 -ExpandProperty IPAddress } catch {}
if ($lan) { try { $listener.Prefixes.Add('http://' + $lan + ':' + $port + '/') } catch {} }
try { $listener.Start() } catch {
  try { $listener.Close() } catch {}
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add('http://localhost:' + $port + '/')
  $lan = $null
  try { $listener.Start() } catch {}
  if (-not $listener.IsListening) { Write-Output 'Nie moge zajac portu 8901. Zamknij inne okno gry.'; pause; exit }
}
Write-Output ('CSWEB dziala na http://localhost:' + $port + '  (zamknij to okno, aby wylaczyc)')
if ($lan) { Write-Output ('Drugi komp w tej samej sieci wpisuje: http://' + $lan + ':' + $port) }
Start-Process ('http://localhost:' + $port + '/')
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $u = $ctx.Request.Url.AbsolutePath
  $u = [Uri]::UnescapeDataString($u)
  if ($u -eq '/') { $u = '/index.html' }
  $rel = $u.TrimStart('/').Replace('/', '\')
  $f = Join-Path $root $rel
  $full = [IO.Path]::GetFullPath($f)
  if (-not $full.StartsWith([IO.Path]::GetFullPath($root), [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
    $ctx.Response.StatusCode = 404
    try { Add-Content -LiteralPath (Join-Path $root 'missing.log') -Value ((Get-Date -Format 'HH:mm:ss') + ' 404 ' + $u) } catch {}
    $buf = [Text.Encoding]::UTF8.GetBytes('brak: ' + $u)
    $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
    $ctx.Response.Close()
    continue
  }
  $ext = [IO.Path]::GetExtension($full).ToLower()
  $ctx.Response.ContentType = $mime[$ext]
  if (-not $ctx.Response.ContentType) { $ctx.Response.ContentType = 'application/octet-stream' }
  try {
    $bytes = [IO.File]::ReadAllBytes($full)
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {}
  $ctx.Response.Close()
}
