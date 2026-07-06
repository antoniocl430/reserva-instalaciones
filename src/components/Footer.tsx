"use client"

import Link from "next/link"

// Pie de página con enlaces legales y año actual
export default function Footer() {
  const anio = new Date().getFullYear()
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
        <p className="text-center sm:text-left">© {anio} Reservas Deportivas Municipales</p>
        <nav aria-label="Enlaces legales" className="flex gap-4 sm:gap-6">
          <Link href="/legal" className="hover:text-gray-700 underline underline-offset-2 transition-colors">
            Aviso legal
          </Link>
          <Link href="/privacidad" className="hover:text-gray-700 underline underline-offset-2 transition-colors">
            Privacidad
          </Link>
          <Link href="/accesibilidad" className="hover:text-gray-700 underline underline-offset-2 transition-colors">
            Accesibilidad
          </Link>
        </nav>
      </div>
    </footer>
  )
}
