// Service worker mínimo: solo habilita la instalación como PWA y cachea el
// shell estático. Los datos (API) siempre van a la red — nunca a caché,
// porque la info de seguridad de un cliente no puede mostrarse desatualizada
// sin avisar.
const CACHE = 'dstac-shell-v1'
const SHELL_ASSETS = ['/', '/manifest.webmanifest', '/logo-dstac.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Nunca cachear llamadas a la API: siempre red.
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).catch(() => cached)
    })
  )
})
