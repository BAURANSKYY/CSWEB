const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.otf':'font/otf','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.glb':'model/gltf-binary','.bin':'application/octet-stream','.mp3':'audio/mpeg','.m4a':'audio/mp4','.ogg':'audio/ogg','.wav':'audio/wav'};
const logFile = path.join(root, 'missing.txt');
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  const f = path.join(root, u);
  if (!f.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (e, d) => {
    if (e) {
      try { fs.appendFileSync(logFile, new Date().toISOString() + ' 404 ' + u + '\n'); } catch {}
      res.writeHead(404); res.end('brak: ' + u);
    }
    else { res.writeHead(200, {'Content-Type': types[path.extname(f).toLowerCase()] || 'application/octet-stream'}); res.end(d); }
  });
});
server.listen(8901, () => console.log('Clutcher mirror: http://localhost:8901'));
