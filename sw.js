/* Vade — service worker. A versão muda a cada novo index.html, o que dispara a atualização. */
const VERSION = 'vade-c918d7fc2e';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
              'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];
const FONTS = 'vade-fonts';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c =>
    c.addAll(CORE.map(u => new Request(u, {cache: 'reload'})))));
  // Na primeira instalação ativa direto; nas seguintes espera o usuário tocar em "Atualizar".
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fontes do Google: usa a cópia guardada e renova em segundo plano.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; })
                            .catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // Abertura do app: sempre a versão guardada (abre na hora, inclusive offline).
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then(r => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(r => r || fetch(req)));
});
