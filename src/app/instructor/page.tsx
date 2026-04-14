import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const metadata = {
  title: "Mis Clases",
}

export default async function DashboardInstructor() {
  const sesion = await getServerSession(opcionesAuth)

  if (!sesion || sesion.user.rol !== "INSTRUCTOR") {
    redirect("/dashboard")
  }

  // Por ahora, simple dashboard
  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Mis Clases</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Bienvenido, instructor</h2>
          <p className="text-gray-600 mb-6">
            Aquí puedes crear y gestionar tus clases recurrentes.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Button asChild>
              <Link href="/pistas">Crear nueva clase</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/instructor/mis-clases">Gestionar mis clases</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
