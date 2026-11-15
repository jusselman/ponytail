// serveDemo.js
// Serves the production web build (frontend/dist) for demos, on this computer
// only (SECURITY_RISKS.md SR-63). Compared with `expo start`, there are no
// developer endpoints, no source code on offer and nothing reachable from the
// venue Wi-Fi, and the app loads faster.
//
//   npm run demo          build, then serve at http://localhost:8081
//   npm run demo:serve    serve the last build without rebuilding
//
// Port 8081 matches the backend's allowed origin (CORS in backend/src/index.js).
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(process.env.DEMO_DIST || path.join(__dirname, '..', 'dist'));
const HOST = '127.0.0.1';
const PORT = Number(process.env.DEMO_PORT) || 8081;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.map': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
};

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('No build found in frontend/dist. Run "npm run demo" to build and serve.');
  process.exit(1);
}

const send = (res, file) => {
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  fs.createReadStream(file).pipe(res);
};

http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end(); }
  const file = path.normalize(path.join(DIST, pathname));
  if (!file.startsWith(DIST + path.sep) && file !== DIST) { res.writeHead(404); return res.end(); }
  if (path.basename(file).startsWith('.')) { res.writeHead(404); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return send(res, file);
  // A path with no file (an app screen) gets the app itself
  return send(res, path.join(DIST, 'index.html'));
}).listen(PORT, HOST, () => {
  console.log(`Ponytail demo running at http://localhost:${PORT} (this computer only)`);
});
