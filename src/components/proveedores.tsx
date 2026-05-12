"use client"

import { useEffect } from "react"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "@/components/ui/toast"
import { registrarServiceWorker } from "@/lib/push-client"

// Componente cliente que envuelve la app con los proveedores necesarios
export function Proveedores({ children }: { children: React.ReactNode }) {
  // Registrar el service worker al montar la app (solo registra el SW,
  // no solicita permiso de notificaciones — eso se hace desde el perfil)
  useEffect(() => {
    registrarServiceWorker()
  }, [])

  return (
    <SessionProvider>
      {children}
      <Toaster />
    </SessionProvider>
  )
}
