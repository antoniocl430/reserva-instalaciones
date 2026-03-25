import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { opcionesAuth } from "@/lib/auth"

interface AdminLayoutProps {
  children: React.ReactNode
}

// Sidebar con navegación para admin
function AdminSidebar() {
  return (
    <aside className="w-full md:w-64 bg-white border-b md:border-r md:border-b-0 border-gray-200 px-4 md:px-6 py-4 md:py-8 md:min-h-screen">
      <nav className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 hidden md:block">
          Panel de administración
        </h3>
        <Link
          href="/admin"
          className="block px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Dashboard
        </Link>
        <Link
          href="/admin/reservas"
          className="block px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Reservas
        </Link>
        <Link
          href="/admin/pistas"
          className="block px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Pistas
        </Link>
        <Link
          href="/admin/bloqueos"
          className="block px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Bloqueos
        </Link>
        <Link
          href="/admin/usuarios"
          className="block px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Usuarios
        </Link>
      </nav>
    </aside>
  )
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Verificación server-side: solo ADMIN puede acceder
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    redirect("/admin/login")
  }

  if (sesion.user.rol !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row">
        <AdminSidebar />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
