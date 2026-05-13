import Link from "next/link"

export default function PaginaNoEncontrada() {
  return (
    <main className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-16">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold text-blue-600 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Página no encontrada
        </h1>
        <p className="text-gray-500 mb-8">
          La dirección que has introducido no existe o ha sido eliminada.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          ← Volver al inicio
        </Link>
      </div>
    </main>
  )
}
