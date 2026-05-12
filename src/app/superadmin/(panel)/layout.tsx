import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { opcionesAuth } from "@/lib/auth"
import { SuperadminSidebar } from "@/components/SuperadminSidebar"

interface SuperadminLayoutProps {
  children: React.ReactNode
}

export default async function SuperadminLayout({ children }: SuperadminLayoutProps) {
  // Verificacion server-side: solo SUPERADMIN puede acceder
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    redirect("/login")
  }

  if (sesion.user.rol !== "SUPERADMIN") {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <SuperadminSidebar />

      {/* Contenido principal */}
      <div className="md:ml-64 flex flex-col min-h-screen">
        {/* Area de contenido */}
        <main className="flex-1 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
