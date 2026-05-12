import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { opcionesAuth } from "@/lib/auth"
import { AdminSidebar } from "@/components/AdminSidebar"
import { AdminHeader } from "@/components/AdminHeader"

interface AdminLayoutProps {
  children: React.ReactNode
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
      {/* Sidebar */}
      <AdminSidebar />

      {/* Contenido principal */}
      <div className="md:ml-64 flex flex-col min-h-screen">
        {/* Header top bar */}
        <AdminHeader />

        {/* Área de contenido */}
        <main className="flex-1 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
