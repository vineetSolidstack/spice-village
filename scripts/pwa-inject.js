/* Post-process the Expo web export into an installable PWA.
 * Adds the manifest link, theme color, apple touch icon, a service-worker
 * registration, and a branded "Install" banner (with a close button) to
 * dist/index.html. Idempotent — safe to run more than once. */
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
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <style>
      #ndInstall {
        position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 99999;
        display: none; justify-content: center; pointer-events: none;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      }
      #ndInstall.show { display: flex; animation: ndUp .28s cubic-bezier(.2,.8,.2,1) both; }
      @keyframes ndUp { from { transform: translateY(20px); opacity: 0 } to { transform: none; opacity: 1 } }
      #ndInstall .nd-card {
        pointer-events: auto; width: 100%; max-width: 460px;
        display: flex; align-items: center; gap: 12px;
        background: #C1440E; color: #FFF8F0;
        border-radius: 18px; padding: 12px 14px;
        box-shadow: 0 10px 30px rgba(43,29,18,.28);
      }
      #ndInstall .nd-ico {
        flex: none; width: 44px; height: 44px; border-radius: 12px;
        background: #D9531A; color: #FFF8F0; font-weight: 800; letter-spacing: .5px;
        display: grid; place-items: center; font-size: 16px;
        border: 2px dashed rgba(232,163,61,.75);
      }
      #ndInstall .nd-txt { flex: 1; min-width: 0; line-height: 1.25; }
      #ndInstall .nd-txt strong { display: block; font-size: 14px; }
      #ndInstall .nd-txt span { display: block; font-size: 12px; opacity: .92; }
      #ndInstall .nd-go {
        flex: none; background: #FFF8F0; color: #C1440E; border: 0;
        font-weight: 800; font-size: 13px; padding: 9px 14px; border-radius: 999px; cursor: pointer;
      }
      #ndInstall .nd-x {
        flex: none; background: rgba(255,255,255,.18); color: #FFF8F0; border: 0;
        width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 15px; line-height: 1;
      }
    </style>`;

const banner = `
    <div id="ndInstall" role="dialog" aria-label="Install Nandhan Delight">
      <div class="nd-card">
        <div class="nd-ico">ND</div>
        <div class="nd-txt">
          <strong>Install Nandhan Delight</strong>
          <span id="ndHint">Add to your home screen for faster ordering.</span>
        </div>
        <button class="nd-go" id="ndGo">Install</button>
        <button class="nd-x" id="ndX" aria-label="Close">&times;</button>
      </div>
    </div>
    <script>
      (function () {
        var el = document.getElementById('ndInstall');
        var go = document.getElementById('ndGo');
        var x = document.getElementById('ndX');
        var hint = document.getElementById('ndHint');
        var deferred = null;
        var KEY = 'nd_pwa_dismissed';
        function standalone() {
          return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
        }
        function snoozed() {
          try { var t = localStorage.getItem(KEY); return t && (Date.now() - Number(t)) < 6048e5; } catch (e) { return false; } // 7 days
        }
        function show() { el.classList.add('show'); }
        function hide() { el.classList.remove('show'); }
        function snooze() { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }

        if (standalone() || snoozed()) return;

        window.addEventListener('beforeinstallprompt', function (e) {
          e.preventDefault();
          deferred = e;
          show();
        });
        go.addEventListener('click', function () {
          if (!deferred) return;
          deferred.prompt();
          (deferred.userChoice || Promise.resolve()).then(function () {}).finally(function () {
            deferred = null; hide();
          });
        });
        x.addEventListener('click', function () { hide(); snooze(); });
        window.addEventListener('appinstalled', function () { hide(); snooze(); });

        // iOS Safari has no beforeinstallprompt — show a Share-sheet hint instead.
        var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
        if (isIOS && !standalone() && !snoozed()) {
          go.style.display = 'none';
          hint.textContent = 'Tap the Share icon, then "Add to Home Screen".';
          setTimeout(show, 2500);
        }
      })();
    </script>`;

if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', head + '\n  </head>');
}
if (!html.includes("serviceWorker.register('/sw.js')")) {
  const swScript = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>`;
  html = html.replace('</body>', swScript + '\n  </body>');
}
if (!html.includes('id="ndInstall"')) {
  html = html.replace('</body>', banner + '\n  </body>');
}

fs.writeFileSync(indexPath, html);
console.log('pwa-inject: manifest + service worker + install banner wired into dist/index.html');
