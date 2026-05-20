"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Menu, X, ShieldCheck, Zap } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { AvatarUsuario } from "@/components/AvatarUsuario"
import InstalarPWA from "@/components/InstalarPWA"

interface HeaderProps {
  /** Nombre del servicio a mostrar en el logo. Si no se pasa, usa el valor por defecto. */
  nombreServicio?: string
  /** URL del logo del ayuntamiento. Si se pasa, se muestra en lugar del emoji. */
  logoUrl?: string | null
}

// Cabecera de navegación principal — adaptativa según rol y estado de sesión
export function Header({ nombreServicio = "Reservas Deportivas", logoUrl }: HeaderProps) {
  const { data: sesion, status } = useSession()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const cargandoSesion = status === "loading"
  const esAdmin = sesion?.user?.rol === "ADMIN"
  const esCiudadano = sesion?.user?.rol === "CIUDADANO"
  const esSuperadmin = sesion?.user?.rol === "SUPERADMIN"
  const esInstructor = sesion?.user?.rol === "INSTRUCTOR"

  async function cerrarSesion() {
    await signOut({ redirect: false })
    window.location.href = "/"
  }

  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border sticky top-0 z-50">
      <div className="w-full px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" aria-label="Ir a la página de inicio" className="flex items-center gap-2 font-bold text-blue-700 shrink-0 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={nombreServicio}
                className="h-8 sm:h-10 w-auto object-contain max-w-[120px] sm:max-w-[180px]"
              />
            ) : (
              <span className="text-xl" aria-hidden="true">🏓</span>
            )}
            {/* Con logo: nombre solo en pantallas grandes para no saturar el header */}
            {logoUrl ? (
              <span className="hidden lg:inline text-base leading-tight truncate max-w-[180px]">{nombreServicio}</span>
            ) : (
              <>
                <span className="hidden sm:inline text-lg leading-tight">{nombreServicio}</span>
                <span className="sm:hidden text-base leading-tight">Reservas</span>
              </>
            )}
          </Link>

          {/* Navegación desktop */}
          <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-4">
              {/* Sin sesión: mostrar login y registro */}
              {!sesion && !cargandoSesion && (
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
                    Instalaciones
                  </Link>
                  <Link
                    href="/mis-reservas"
                    className="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors"
                  >
                    Mis reservas
                  </Link>
                  <Link
                    href="/perfil"
                    className="flex items-center gap-2 border-l border-gray-200 pl-4 hover:opacity-80 transition-opacity"
                    aria-label="Mi perfil"
                  >
                    <AvatarUsuario
                      nombre={sesion.user?.name ?? "U"}
                      avatarUrl={(sesion.user as { avatarUrl?: string | null }).avatarUrl}
                      className="w-8 h-8 text-xs"
                    />
                    <span className="text-sm font-medium hidden sm:block text-gray-700">
                      {sesion.user?.name}
                    </span>
                  </Link>
                  <button
                    onClick={cerrarSesion}
                    className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                  >
                    Cerrar sesión
                  </button>
                </>
              )}

              {/* Instructor logueado */}
              {esInstructor && (
                <>
                  <Link
                    href="/pistas"
                    className="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors"
                  >
                    Instalaciones
                  </Link>
                  <Link
                    href="/instructor"
                    className="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors"
                  >
                    Mis Clases
                  </Link>
                  <Link
                    href="/perfil"
                    className="flex items-center gap-2 border-l border-gray-200 pl-4 hover:opacity-80 transition-opacity"
                    aria-label="Mi perfil"
                  >
                    <AvatarUsuario
                      nombre={sesion.user?.name ?? "U"}
                      avatarUrl={(sesion.user as { avatarUrl?: string | null }).avatarUrl}
                      className="w-8 h-8 text-xs"
                    />
                    <span className="text-sm font-medium hidden sm:block text-gray-700">
                      {sesion.user?.name}
                    </span>
                  </Link>
                  <button
                    onClick={cerrarSesion}
                    className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                  >
                    Cerrar sesión
                  </button>
                </>
              )}

              {/* Superadmin logueado */}
              {esSuperadmin && (
                <>
                  <Link
                    href="/superadmin"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors px-3 py-1.5 rounded-lg"
                  >
                    <Zap className="w-4 h-4 shrink-0" aria-hidden="true" />
                    Superadmin
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

              {/* Admin logueado — ve los mismos links que ciudadano más acceso al panel */}
              {esAdmin && (
                <>
                  <Link
                    href="/pistas"
                    className="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors"
                  >
                    Instalaciones
                  </Link>
                  <Link
                    href="/mis-reservas"
                    className="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors"
                  >
                    Mis reservas
                  </Link>
                  <Link
                    href="/perfil"
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    aria-label="Mi perfil"
                  >
                    <AvatarUsuario
                      nombre={sesion.user?.name ?? "U"}
                      avatarUrl={(sesion.user as { avatarUrl?: string | null }).avatarUrl}
                      className="w-8 h-8 text-xs"
                    />
                    <span className="text-sm font-medium hidden sm:block text-gray-700">
                      {sesion.user?.name}
                    </span>
                  </Link>
                  {/* Separador visual antes del acceso al panel */}
                  <span className="border-l border-gray-200 h-5 self-center" aria-hidden="true" />
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors px-3 py-1.5 rounded-lg"
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                    Panel Admin
                  </Link>
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
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              onClick={() => setMenuAbierto(!menuAbierto)}
              aria-label="Abrir menú"
            >
              {menuAbierto ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Menú móvil desplegable */}
      <AnimatePresence>
        {!cargandoSesion && menuAbierto && (
          <motion.div
            className="md:hidden border-t border-border bg-background shadow-md"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <nav aria-label="Menú de navegación" className="max-w-4xl mx-auto px-4 py-2 flex flex-col gap-0.5">
            {/* Sin sesión: solo login y registro */}
            {!sesion && !cargandoSesion && (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  className="px-3 py-2.5 text-sm font-medium text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Crear cuenta
                </Link>
              </>
            )}

            {/* Ciudadano logueado */}
            {esCiudadano && (
              <>
                <div className="px-3 py-2.5 text-sm text-gray-500 font-medium border-b border-gray-100 mb-1 truncate">
                  {sesion.user?.name}
                </div>
                <Link
                  href="/pistas"
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Instalaciones
                </Link>
                <Link
                  href="/mis-reservas"
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Mis reservas
                </Link>
                <Link
                  href="/perfil"
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Mi perfil
                </Link>
                <button
                  onClick={() => { setMenuAbierto(false); cerrarSesion() }}
                  className="px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors text-left"
                >
                  Cerrar sesión
                </button>
              </>
            )}

            {/* Instructor logueado */}
            {esInstructor && (
              <>
                <div className="px-3 py-2.5 text-sm text-gray-500 font-medium border-b border-gray-100 mb-1 truncate">
                  {sesion.user?.name}
                </div>
                <Link
                  href="/pistas"
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Instalaciones
                </Link>
                <Link
                  href="/instructor"
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Mis Clases
                </Link>
                <Link
                  href="/perfil"
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Mi perfil
                </Link>
                <button
                  onClick={() => { setMenuAbierto(false); cerrarSesion() }}
                  className="px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors text-left"
                >
                  Cerrar sesión
                </button>
              </>
            )}

            {/* Superadmin logueado */}
            {esSuperadmin && (
              <>
                <div className="px-3 py-2.5 text-sm text-gray-500 font-medium border-b border-gray-100 mb-1 truncate">
                  {sesion.user?.name}
                </div>
                <Link
                  href="/superadmin"
                  className="px-3 py-2.5 text-sm font-semibold text-purple-700 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-2"
                  onClick={() => setMenuAbierto(false)}
                >
                  <Zap className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Panel Superadmin
                </Link>
                <button
                  onClick={() => { setMenuAbierto(false); cerrarSesion() }}
                  className="px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors text-left"
                >
                  Cerrar sesión
                </button>
              </>
            )}

            {/* Admin logueado — ve links de ciudadano más acceso al panel */}
            {esAdmin && (
              <>
                <div className="px-3 py-2.5 text-sm text-gray-500 font-medium border-b border-gray-100 mb-1 truncate">
                  {sesion.user?.name}
                </div>
                <Link
                  href="/pistas"
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Instalaciones
                </Link>
                <Link
                  href="/mis-reservas"
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                >
                  Mis reservas
                </Link>
                <Link
                  href="/perfil"
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuAbierto(false)}
                  aria-label="Mi perfil"
                >
                  Mi perfil
                </Link>
                {/* Separador antes del panel de admin */}
                <div className="border-t border-gray-100 my-1" aria-hidden="true" />
                <Link
                  href="/admin"
                  className="px-3 py-2.5 text-sm font-semibold text-blue-700 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                  onClick={() => setMenuAbierto(false)}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Panel Admin
                </Link>
                <button
                  onClick={() => { setMenuAbierto(false); cerrarSesion() }}
                  className="px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors text-left"
                >
                  Cerrar sesión
                </button>
              </>
            )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banner de instalación PWA — fijo en la parte inferior de la pantalla */}
      <InstalarPWA />
    </header>
  )
}
