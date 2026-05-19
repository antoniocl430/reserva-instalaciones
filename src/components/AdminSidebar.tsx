"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Lock,
  Users,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  CalendarX2,
  Megaphone,
  Star,
} from "lucide-react"
import { useState } from "react"

const navItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Reservas",
    href: "/admin/reservas",
    icon: Calendar,
  },
  {
    label: "Instalaciones",
    href: "/admin/pistas",
    icon: Building2,
  },
  {
    label: "Bloqueos",
    href: "/admin/bloqueos",
    icon: Lock,
  },
  {
    label: "Festivos",
    href: "/admin/festivos",
    icon: CalendarX2,
  },
  {
    label: "Usuarios",
    href: "/admin/usuarios",
    icon: Users,
  },
  {
    label: "Avisos",
    href: "/admin/avisos",
    icon: Bell,
  },
  {
    label: "Comunicados",
    href: "/admin/comunicados",
    icon: Megaphone,
  },
  {
    label: "Valoraciones",
    href: "/admin/valoraciones",
    icon: Star,
  },
  {
    label: "Configuración",
    href: "/admin/configuracion",
    icon: Settings,
  },
]

interface AdminSidebarProps {
  logoUrl?: string | null
  nombreServicio?: string
}

export function AdminSidebar({ logoUrl, nombreServicio = "Reservas Deportivas" }: AdminSidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const nombreAdmin = session?.user?.name || "Admin"

  return (
    <>
      {/* Botón de menú móvil */}
      <div className="md:hidden bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={nombreServicio} className="h-7 w-auto object-contain max-w-[100px]" />
          ) : (
            <span className="text-xl">🏓</span>
          )}
          <div className="text-white font-semibold text-sm truncate">{nombreServicio}</div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar mobile desplegable */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-700 px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
          <div className="border-t border-slate-700 pt-4 mt-4">
            <div className="px-4 py-2 text-xs text-slate-400 font-medium">{nombreAdmin}</div>
            <button
              onClick={() => signOut({ redirect: true, callbackUrl: "/auth/login" })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-red-400 transition-colors rounded-lg text-sm"
            >
              <LogOut size={18} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-700 min-h-screen fixed left-0 top-0">
        {/* Logo/Título */}
        <div className="px-6 py-6 border-b border-slate-700">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt={nombreServicio} className="h-9 w-auto object-contain max-w-[140px]" />
            ) : (
              <span className="text-2xl">🏓</span>
            )}
            {!logoUrl && (
              <div className="text-white font-semibold leading-tight">{nombreServicio}</div>
            )}
          </div>
          {logoUrl && (
            <div className="text-slate-400 text-xs mt-2 truncate">{nombreServicio}</div>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer con usuario */}
        <div className="px-4 py-6 border-t border-slate-700 space-y-3">
          <div className="px-4 py-2">
            <p className="text-xs text-slate-400 font-medium truncate">{nombreAdmin}</p>
          </div>
          <button
            onClick={() => signOut({ redirect: true, callbackUrl: "/auth/login" })}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-red-400 transition-colors rounded-lg text-sm"
          >
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
