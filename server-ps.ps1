# CSWEB - serwer bez zaleznosci (czysty Windows, bez Node i Pythona).
# Uruchamiane przez GRAJ.bat z tego samego folderu.
# v2: petla niezatapialna (serwer nigdy nie umiera na zerwanym requescie),
# naglowki cache (przegladarka trzyma assety - zero burstow przy kazdym meczu),
# poprawny MIME dla .wasm (basis_transcoder).
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
  '.wasm' = 'application/wasm';
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
$nf404 = 0
while ($listener.IsListening) {
  $ctx = $null
  try { $ctx = $listener.GetContext() } catch { Start-Sleep -Milliseconds 50; continue }
  if (-not $ctx) { continue }
  try {
    $u = $ctx.Request.Url.AbsolutePath
    $u = [Uri]::UnescapeDataString($u)
    if ($u -eq '/') { $u = '/index.html' }
    $rel = $u.TrimStart('/').Replace('/', '\')
    $f = Join-Path $root $rel
    $full = [IO.Path]::GetFullPath($f)
    if (-not $full.StartsWith([IO.Path]::GetFullPath($root), [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
      $nf404++
      $ctx.Response.StatusCode = 404
      $ctx.Response.ContentType = 'text/plain'
      $buf = [Text.Encoding]::UTF8.GetBytes('brak: ' + $u)
      $ctx.Response.ContentLength64 = $buf.Length
      try { $ctx.Response.OutputStream.Write($buf, 0, $buf.Length) } catch {}
      try { $ctx.Response.Close() } catch {}
      continue
    }
    $ext = [IO.Path]::GetExtension($full).ToLower()
    $ct = $mime[$ext]
    if (-not $ct) { $ct = 'application/octet-stream' }
    $ctx.Response.ContentType = $ct
    $isIndex = ($u -eq '/index.html')
    if ($isIndex) { $ctx.Response.Headers.Add('Cache-Control', 'no-cache') }
    else { $ctx.Response.Headers.Add('Cache-Control', 'public, max-age=31536000, immutable') }
    try {
      $bytes = [IO.File]::ReadAllBytes($full)
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {}
    try { $ctx.Response.Close() } catch {}
  } catch {
    try { $ctx.Response.Abort() } catch {}
  }
}
