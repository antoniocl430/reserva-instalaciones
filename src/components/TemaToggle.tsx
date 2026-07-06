"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

// Botón compacto para cambiar entre tema claro y oscuro
export function TemaToggle() {
  const { theme, setTheme } = useTheme()
  const [montado, setMontado] = useState(false)

  // Evitar hydration mismatch — solo renderizar en cliente
  useEffect(() => setMontado(true), [])
  if (!montado) return null

  const esDark = theme === "dark"

  return (
    <button
      onClick={() => setTheme(esDark ? "light" : "dark")}
      aria-label={esDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {esDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

// Switch visual con etiqueta — para la página de perfil
export function TemaSwitch() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [montado, setMontado] = useState(false)

  useEffect(() => setMontado(true), [])
  if (!montado) return null

  const esDark = resolvedTheme === "dark"

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">Modo oscuro</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {esDark ? "Interfaz con fondo oscuro" : "Interfaz con fondo claro"}
        </p>
      </div>
      <button
        role="switch"
        aria-checked={esDark}
        onClick={() => setTheme(esDark ? "light" : "dark")}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          esDark ? "bg-blue-600" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform ${
            esDark ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}
