"use client"

import { SessionProvider } from "next-auth/react"

// Componente cliente que envuelve la app con los proveedores necesarios
export function Proveedores({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
