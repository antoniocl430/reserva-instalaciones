"use client"

import Link from "next/link"

// Pie de página con enlaces legales y año actual
export default function Footer() {
  const anio = new Date().getFullYear()
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
        <p>© {anio} Sistema de Reservas Deportivas Municipales</p>
        <nav aria-label="Enlaces legales" className="flex gap-4">
          <Link href="/legal" className="hover:text-gray-700 underline underline-offset-2">
            Aviso legal
          </Link>
          <Link href="/privacidad" className="hover:text-gray-700 underline underline-offset-2">
            Privacidad
          </Link>
          <Link href="/accesibilidad" className="hover:text-gray-700 underline underline-offset-2">
            Accesibilidad
          </Link>
        </nav>
      </div>
    </footer>
  )
}
