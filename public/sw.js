// Service Worker — gestiona caché offline y notificaciones Web Push

// ─── CACHÉ OFFLINE ────────────────────────────────────────────────────────────

// Nombre de la caché de la app — cambiar versión para invalidar al desplegar
const NOMBRE_CACHE = 'reservas-v1'

// Páginas a pre-cachear al instalar el SW
const PAGINAS_PRECACHE = ['/', '/pistas', '/mis-reservas', '/dashboard', '/login']

// Instalar SW: pre-cachear páginas clave
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(NOMBRE_CACHE).then((cache) => cache.addAll(PAGINAS_PRECACHE))
  )
  // Activar el nuevo SW inmediatamente sin esperar a que los clientes lo soliciten
  self.skipWaiting()
})

// Activar SW: eliminar cachés de versiones anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(
        claves
          .filter((clave) => clave !== NOMBRE_CACHE)
          .map((clave) => caches.delete(clave))
      )
    )
  )
  // Tomar control de las páginas abiertas sin necesidad de recarga
  self.clients.claim()
})

// Fetch: network-first para navegación, fallback a caché
self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return

  // Ignorar rutas de API y recursos internos de Next.js (siempre van a red)
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return

  event.respondWith(
    fetch(event.request)
      .then((respuesta) => {
        // Guardar copia en caché si la respuesta es válida y es del mismo origen
        if (respuesta && respuesta.status === 200 && respuesta.type === 'basic') {
          const copia = respuesta.clone()
          caches.open(NOMBRE_CACHE).then((cache) => cache.put(event.request, copia))
        }
        return respuesta
      })
      .catch(() => {
        // Sin red: intentar servir desde caché
        return caches.match(event.request).then((respuestaCache) => {
          return respuestaCache || new Response('Sin conexión', { status: 503 })
        })
      })
  )
})

// ─── NOTIFICACIONES WEB PUSH ──────────────────────────────────────────────────

// Maneja evento push: muestra notificación del sistema
self.addEventListener('push', (event) => {
  // Datos por defecto si no llega payload
  let titulo = 'Reserva de instalaciones'
  let cuerpo = 'Tienes una nueva notificación'
  let url = '/'

  // Parsear datos JSON del evento si existen
  if (event.data) {
    try {
      const datos = event.data.json()
      titulo = datos.titulo || titulo
      cuerpo = datos.cuerpo || cuerpo
      url = datos.url || url
    } catch {
      // Si falla el parseo, usar valores por defecto
    }
  }

  // Mostrar notificación con icono y datos asociados
  const promesa = self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: '/icon-192x192.png',
    data: { url },
  })

  event.waitUntil(promesa)
})

// Maneja clic en notificación: abre la URL asociada
self.addEventListener('notificationclick', (event) => {
  // Cerrar la notificación
  event.notification.close()

  // Obtener la URL de la notificación, o ir al inicio si no hay
  const urlDestino = event.notification.data?.url || '/'

  // Abrir la URL en una ventana del cliente
  const promesa = clients.openWindow(urlDestino)
  event.waitUntil(promesa)
})

// Re-suscribir cuando la suscripción del usuario expira
self.addEventListener('pushsubscriptionchange', (event) => {
  // Registrar la nueva suscripción en el servidor
  const promesa = event.newSubscription
    ? fetch('/api/push/suscribir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event.newSubscription),
      })
    : Promise.resolve()

  event.waitUntil(promesa)
})
