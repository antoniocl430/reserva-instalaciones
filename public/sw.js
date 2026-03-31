// Service Worker para notificaciones Web Push
// Gestiona eventos push, clics en notificaciones y renovación de suscripciones

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
