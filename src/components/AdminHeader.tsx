"use client"

import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"

const pageLabels: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/reservas": "Gestionar Reservas",
  "/admin/pistas": "Gestionar Instalaciones",
  "/admin/bloqueos": "Gestionar Bloqueos",
  "/admin/usuarios": "Gestionar Usuarios",
  "/admin/avisos": "Avisos y Notificaciones",
}

export function AdminHeader() {
  const pathname = usePathname()
  const { data: session } = useSession()

  // Encontrar el label de la página actual
  let pageLabel = "Panel de Administración"
  for (const [path, label] of Object.entries(pageLabels)) {
    if (pathname === path || (path !== "/admin" && pathname.startsWith(path))) {
      pageLabel = label
      break
    }
  }

  const nombreAdmin = session?.user?.name || "Admin"

  return (
    <header className="hidden md:block bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">{pageLabel}</h1>
        <div className="text-sm text-gray-600">{nombreAdmin}</div>
      </div>
    </header>
  )
}
