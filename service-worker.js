// Service worker del Cotizador Nova — hace que la app abra y exporte sin internet.
//
// Todo lo que la app necesita se sirve desde el MISMO origen (ver vendor/).
// La unica salida a la red es el endpoint de Supabase, que por definicion
// necesita conexion y nunca se cachea: si falla, el JS de la pagina lo maneja
// con la cola local y lo reintenta al reconectar.

// OJO: esta linea la reescribe scripts/deploy-pwa.ps1 con un hash del conjunto
// index.html + manifest.json + vendor/*. No la edites a mano: si el nombre no
// cambia en cada publicacion, los dispositivos que ya tienen la app instalada
// se quedan con la version vieja en cache para siempre.
const CACHE_NAME = 'nova-cotizador-f3aed7a4f560';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './vendor/supabase.min.js',
  './vendor/html2canvas.min.js',
  './vendor/jspdf.umd.min.js',
  './vendor/xlsx.bundle.js',
];

// cache.addAll() es atomico: si UNA sola entrada falla, no se cachea NADA.
// Antes eso venia con un .catch(()=>{}) que lo ocultaba, asi que una
// instalacion vacia solo se descubria en modo avion, en una finca, sin remedio.
// Aqui cada archivo va por su cuenta y los fallos se reportan.
async function precache() {
  const cache = await caches.open(CACHE_NAME);
  const results = await Promise.allSettled(APP_SHELL.map((u) => cache.add(u)));
  const fallidos = APP_SHELL.filter((_, i) => results[i].status === 'rejected');
  if (fallidos.length) {
    console.error('[SW] No se pudieron cachear:', fallidos);
  } else {
    console.log('[SW] App cacheada completa:', CACHE_NAME);
  }
}

self.addEventListener('install', (event) => {
  // Sin skipWaiting(): el worker nuevo espera en 'waiting' a que la pagina
  // avise. Si activara solo, borraria el cache viejo mientras la pestana
  // abierta sigue corriendo el bundle anterior, y un loadScript() posterior
  // de vendor/ se quedaria sin nada que cargar. Ademas es lo que permite
  // avisar "hay version nueva" en vez de cambiarla por debajo.
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// La pagina dispara esto cuando el usuario toca el aviso de version nueva.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Supabase nunca se cachea, ni lectura ni escritura: los datos tienen que
  // ser los de verdad, no una copia vieja.
  if (url.hostname.endsWith('.supabase.co')) return;

  // Esquemas raros (extensiones del navegador) hacen fallar cache.put().
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Solo se guardan respuestas buenas del mismo origen. Cachear un 404
          // o un error de un tercero deja basura servida como si fuera valida.
          if (res.ok && url.origin === self.location.origin) {
            const copia = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copia)).catch(() => {});
          }
          return res;
        })
        .catch(() => new Response(
          'Sin conexion y este recurso no esta en cache.',
          { status: 504, statusText: 'Offline', headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
        ));
    })
  );
});
