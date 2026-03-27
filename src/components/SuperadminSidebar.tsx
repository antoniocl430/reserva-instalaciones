"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Building2,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"

const navItems = [
  {
    label: "Dashboard",
    href: "/superadmin",
    icon: LayoutDashboard,
  },
  {
    label: "Tenants",
    href: "/superadmin/tenants",
    icon: Building2,
  },
]

export function SuperadminSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const nombreUsuario = session?.user?.name || "Superadmin"

  return (
    <>
      {/* Barra superior mobile */}
      <div className="md:hidden bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xl">&#9889;</span>
          <div className="text-white font-semibold text-sm">Superadmin</div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Menu mobile desplegable */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-950 border-b border-gray-800 px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== "/superadmin" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-purple-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
          <div className="border-t border-gray-800 pt-4 mt-4">
            <div className="px-4 py-2 text-xs text-gray-400 font-medium">{nombreUsuario}</div>
            <button
              onClick={() => signOut({ redirect: true, callbackUrl: "/login" })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg text-sm"
            >
              <LogOut size={18} />
              <span>Cerrar sesion</span>
            </button>
          </div>
        </div>
      )}

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-950 border-r border-gray-800 min-h-screen fixed left-0 top-0">
        {/* Logo/Titulo */}
        <div className="px-6 py-8 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">&#9889;</span>
            <div className="text-white font-semibold">Superadmin</div>
          </div>
        </div>

        {/* Navegacion */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== "/superadmin" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-purple-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer con usuario */}
        <div className="px-4 py-6 border-t border-gray-800 space-y-3">
          <div className="px-4 py-2">
            <p className="text-xs text-gray-400 font-medium truncate">{nombreUsuario}</p>
          </div>
          <button
            onClick={() => signOut({ redirect: true, callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg text-sm"
          >
            <LogOut size={18} />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </aside>
    </>
  )
}
