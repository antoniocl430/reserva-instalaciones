import Link from "next/link"

export default function Inicio() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo / cabecera */}
        <div className="space-y-2">
          <div className="text-5xl">🏊</div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reservas Deportivas
          </h1>
          <p className="text-sm text-gray-500">
            Instalaciones deportivas municipales
          </p>
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-center font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Crear cuenta
          </Link>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-400">
          Servicio gratuito para ciudadanos
        </p>
      </div>
    </main>
  )
}
