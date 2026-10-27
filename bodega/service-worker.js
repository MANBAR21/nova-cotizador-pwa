// Service worker de Bodega Nova: la app abre sin internet.
// Todo lo que necesita se sirve desde el mismo origen (vendor/). La única
// salida a la red es Supabase, que nunca se cachea: si falla, la cola local
// de la página guarda el trabajo y lo envía al volver la señal.
//
// Cambie CACHE_NAME en cada publicación (o use el script de despliegue del
// cotizador, que lo calcula con un hash); si no cambia, los celulares que ya
// tienen la app instalada se quedan con la versión vieja.
const CACHE_NAME = 'nova-bodega-v7';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './vendor/supabase.min.js',
  './vendor/jsQR.js',
  './vendor/qrcode.js',
  './logo-nova.png',
  './vendor/fonts/barlow-condensed-latin-600-normal.woff2',
  './vendor/fonts/barlow-condensed-latin-700-normal.woff2',
  './vendor/fonts/barlow-latin-400-normal.woff2',
  './vendor/fonts/barlow-latin-500-normal.woff2',
  './vendor/fonts/barlow-latin-600-normal.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const r = await Promise.allSettled(APP_SHELL.map((u) => cache.add(u)));
    const fallidos = APP_SHELL.filter((_, i) => r[i].status === 'rejected');
    if (fallidos.length) console.warn('[SW] No se guardaron:', fallidos);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('nova-bodega-') && k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // Supabase va directo a la red
  // Se sirve la copia guardada (abre sin señal) y, si hay red, se refresca
  // por detrás. Esto importa porque la app vive dentro del sitio del
  // cotizador, y el service worker del cotizador borra las cachés ajenas
  // cada vez que se publica: con esto la copia se rehace sola.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const red = fetch(e.request).then((res) => {
      if (res.ok) cache.put(e.request, res.clone()).catch(() => {});
      return res;
    });
    if (hit) { e.waitUntil(red.catch(() => {})); return hit; }
    try { return await red; }
    catch (err) { return (await cache.match('./index.html')) || Response.error(); }
  })());
});
