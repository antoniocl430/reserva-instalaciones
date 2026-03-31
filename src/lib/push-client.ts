/**
 * Librería cliente para gestionar suscripciones Web Push.
 * Solo se usa en el navegador (client components).
 */

// Registra el service worker del sistema de notificaciones push
export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Verificar que el navegador soporta service workers
  if (!('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registro = await navigator.serviceWorker.register('/sw.js')
    return registro
  } catch {
    // Si falla el registro, no lanzar excepción — solo retornar null
    return null
  }
}

// Convierte una clave VAPID pública de base64url a Uint8Array
// Necesario para subscribir al PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Añadir padding si es necesario
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

// Suscribe al usuario a notificaciones push y guarda la suscripción en la BD
export async function suscribirAPush(): Promise<boolean> {
  // Verificar soporte del navegador
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  try {
    // Registrar o recuperar el service worker existente
    const registro = await registrarServiceWorker()
    if (!registro) return false

    // Solicitar permiso de notificaciones al usuario
    const permiso = await Notification.requestPermission()
    if (permiso !== 'granted') return false

    // Clave pública VAPID desde variables de entorno
    const clavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!clavePublica) {
      console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY no está configurada')
      return false
    }

    // Suscribir al PushManager con la clave VAPID
    const suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(clavePublica),
    })

    // Extraer las claves de la suscripción
    const claveP256dh = suscripcion.getKey('p256dh')
    const claveAuth = suscripcion.getKey('auth')

    if (!claveP256dh || !claveAuth) return false

    // Convertir claves a base64 para enviarlas al servidor
    const p256dh = btoa(String.fromCharCode(...new Uint8Array(claveP256dh)))
    const auth = btoa(String.fromCharCode(...new Uint8Array(claveAuth)))

    // Guardar suscripción en la base de datos
    const respuesta = await fetch('/api/push/suscribir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: suscripcion.endpoint,
        keys: { p256dh, auth },
      }),
    })

    if (!respuesta.ok) {
      const error = await respuesta.json().catch(() => ({}))
      console.error("[Push] Error del servidor al suscribir:", respuesta.status, error)
    }

    return respuesta.ok
  } catch (err) {
    console.error("[Push] Error al suscribir:", err)
    return false
  }
}

// Desuscribe al usuario de notificaciones push y elimina la suscripción de la BD
export async function desuscribirDePush(): Promise<boolean> {
  // Verificar soporte del navegador
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  try {
    const registro = await navigator.serviceWorker.ready
    const suscripcion = await registro.pushManager.getSubscription()

    if (!suscripcion) return true // Ya estaba desuscrito

    // Eliminar suscripción del servidor
    const respuesta = await fetch('/api/push/suscribir', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: suscripcion.endpoint }),
    })

    // Desuscribir del PushManager del navegador
    await suscripcion.unsubscribe()

    return respuesta.ok
  } catch (err) {
    console.error("[Push] Error al desuscribir:", err)
    return false
  }
}

// Comprueba si el usuario tiene notificaciones push activas
export async function obtenerEstadoSuscripcion(): Promise<
  'activo' | 'inactivo' | 'no-soportado' | 'denegado'
> {
  // Verificar soporte del navegador
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'no-soportado'
  }

  // Verificar si el permiso está denegado explícitamente
  if (Notification.permission === 'denied') {
    return 'denegado'
  }

  try {
    const registro = await navigator.serviceWorker.ready
    const suscripcion = await registro.pushManager.getSubscription()

    return suscripcion ? 'activo' : 'inactivo'
  } catch {
    return 'inactivo'
  }
}
