/* Post-process the Expo web export into an installable PWA.
 * Adds the manifest link, theme color, apple touch icon, and a service-worker
 * registration to dist/index.html. Idempotent — safe to run more than once. */
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const indexPath = path.join(dist, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('pwa-inject: dist/index.html not found — run `expo export --platform web` first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

const head = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#C1440E" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Nandhan Delight" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />`;

const swScript = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>`;

if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', head + '\n  </head>');
}
if (!html.includes("serviceWorker.register('/sw.js')")) {
  html = html.replace('</body>', swScript + '\n  </body>');
}

fs.writeFileSync(indexPath, html);
console.log('pwa-inject: manifest + service worker wired into dist/index.html');
