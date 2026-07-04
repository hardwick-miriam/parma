// Parma service worker — offline shell cache + push notifications
const CACHE = 'parma-v1'
const SHELL = ['/', '/login', '/manifest.webmanifest', '/logo.png']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Network-first for API and auth routes
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    e.respondWith(fetch(e.request).catch(() => new Response('Offline', { status: 503 })))
    return
  }

  // Cache-first for assets
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request).then((res) => {
        if (res.ok && e.request.method === 'GET') {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, copy))
        }
        return res
      })
      return cached ?? networkFetch
    })
  )
})

// Push notifications
self.addEventListener('push', (e) => {
  if (!e.data) return
  let data
  try { data = e.data.json() } catch { data = { title: 'Parma', body: e.data.text() } }
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'Parma', {
      body: data.body,
      icon: data.icon ?? '/logo.png',
      badge: data.badge ?? '/logo.png',
      tag: data.tag ?? 'parma',
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const win = clients.find((c) => c.url.includes(self.location.origin))
      if (win) return win.focus()
      return self.clients.openWindow('/')
    })
  )
})
