"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface HeaderProps {
  /** Nombre del servicio a mostrar en el logo. Si no se pasa, usa el valor por defecto. */
  nombreServicio?: string
}

// Cabecera de navegación principal — adaptativa según rol y estado de sesión
export function Header({ nombreServicio = "Reservas Deportivas" }: HeaderProps) {
  const { data: sesion, status } = useSession()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const cargandoSesion = status === "loading"
  const esAdmin = sesion?.user?.rol === "ADMIN"
  const esCiudadano = sesion?.user?.rol === "CIUDADANO"

  function cerrarSesion() {
    signOut({ callbackUrl: "/login" })
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="w-full px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-blue-700 text-lg shrink-0">
            <span className="text-xl">🏓</span>
            <span className="hidden sm:inline">{nombreServicio}</span>
            <span className="sm:hidden">Reservas</span>
          </Link>

          {/* Navegación desktop */}
          <nav className="hidden md:flex items-center gap-4">
              {/* Sin sesión o cargando: mostrar login y registro */}
              {!sesion && (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/registro"
                    className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Crear cuenta
                  </Link>
                </>
              )}

              {/* Ciudadano logueado */}
              {esCiudadano && (
                <>
                  <Link
                    href="/pistas"
                    className="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors"
                  >
                    Pistas
                  </Link>
                  <Link
                    href="/mis-reservas"
                    className="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors"
                  >
                    Mis reservas
                  </Link>
                  <span className="text-sm text-gray-500 border-l border-gray-200 pl-4">
                    {sesion.user?.name}
                  </span>
                  <button
                    onClick={cerrarSesion}
                    className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                  >
                    Cerrar sesión
                  </button>
                </>
              )}

              {/* Admin logueado */}
              {esAdmin && (
                <>
                  <Link
                    href="/admin"
                    className="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors"
                  >
                    Panel Admin
                  </Link>
                  <span className="text-sm text-gray-500 border-l border-gray-200 pl-4">
                    {sesion.user?.name}
                  </span>
                  <button
                    onClick={cerrarSesion}
                    className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                  >
                    Cerrar sesión
                  </button>
                </>
              )}
            </nav>

          {/* Botón hamburger — solo móvil */}
          {!cargandoSesion && (
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setMenuAbierto(!menuAbierto)}
              aria-label="Abrir menú"
            >
              {menuAbierto ? (
                // Icono X
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                // Icono hamburger
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {!cargandoSesion && menuAbierto && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="max-w-4xl mx-auto px-4 py-3 flex flex-col gap-1">
            {/* Sin sesión: solo login y registro */}
            {!sesion && (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  className="px-3 py-2 text-sm font-medium text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Crear cuenta
                </Link>
              </>
            )}

            {/* Ciudadano logueado */}
            {esCiudadano && (
              <>
                <div className="px-3 py-2 text-sm text-gray-500 font-medium border-b border-gray-100 mb-1">
                  {sesion.user?.name}
                </div>
                <Link
                  href="/pistas"
                  className="px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Pistas
                </Link>
                <Link
                  href="/mis-reservas"
                  className="px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Mis reservas
                </Link>
                <button
                  onClick={() => { setMenuAbierto(false); cerrarSesion() }}
                  className="px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors text-left"
                >
                  Cerrar sesión
                </button>
              </>
            )}

            {/* Admin logueado */}
            {esAdmin && (
              <>
                <div className="px-3 py-2 text-sm text-gray-500 font-medium border-b border-gray-100 mb-1">
                  {sesion.user?.name}
                </div>
                <Link
                  href="/admin"
                  className="px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Panel Admin
                </Link>
                <button
                  onClick={() => { setMenuAbierto(false); cerrarSesion() }}
                  className="px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors text-left"
                >
                  Cerrar sesión
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
