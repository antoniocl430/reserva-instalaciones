"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Loader2, WifiOff } from "lucide-react"

const UMBRAL_MS = 5_000

export function MensajeCargaLenta() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Navegación completada → limpiar temporizador y ocultar mensaje
  useEffect(() => {
    setVisible(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [pathname])

  // Detectar inicio de navegación interceptando clicks en enlaces internos
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest("a")
      if (!link?.href) return
      try {
        const url = new URL(link.href)
        if (
          url.origin !== window.location.origin ||
          url.pathname === window.location.pathname ||
          link.target === "_blank"
        ) return
      } catch {
        return
      }

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(true), UMBRAL_MS)
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 shadow-lg dark:border-amber-800 dark:bg-amber-950">
        <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            La página está tardando más de lo esperado
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Comprueba tu conexión a internet
          </p>
        </div>
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-600 dark:text-amber-400" />
      </div>
    </div>
  )
}
