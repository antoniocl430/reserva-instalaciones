import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { opcionesAuth } from "@/lib/auth"
import { AdminSidebar } from "@/components/AdminSidebar"
import { AdminHeader } from "@/components/AdminHeader"
import { prisma } from "@/lib/prisma"
import { parsearConfiguracion } from "@/lib/tenant"

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

  // Obtener logo y nombre del tenant para el sidebar
  let logoUrl: string | null = null
  let nombreServicio = "Reservas Deportivas"
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: sesion.user.tenantId! },
      select: { logoUrl: true, nombre: true, configuracion: true },
    })
    if (tenant) {
      logoUrl = tenant.logoUrl ?? null
      const config = parsearConfiguracion(tenant.configuracion)
      nombreServicio = config?.nombreServicio ?? tenant.nombre ?? "Reservas Deportivas"
    }
  } catch {
    // Si falla, se usan los valores por defecto
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar logoUrl={logoUrl} nombreServicio={nombreServicio} />

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
