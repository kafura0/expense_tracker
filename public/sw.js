const CACHE_NAME = 'ledgerly-v1'
const STATIC_CACHE = 'ledgerly-static-v1'
const DYNAMIC_CACHE = 'ledgerly-dynamic-v1'

const STATIC_ASSETS = [
  '/',
  '/expenses',
  '/settings',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip Supabase and API requests
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api/')) {
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response
          }

          const responseToCache = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache)
          })

          return response
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/')
          }
          return new Response('Offline', { status: 503 })
        })
    })
  )
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-expenses') {
    event.waitUntil(syncExpenses())
  }
})

async function syncExpenses() {
  // Queue-based sync would be implemented here
  // For now, just notify the client
  const clients = await self.clients.matchAll()
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_COMPLETE' })
  })
}