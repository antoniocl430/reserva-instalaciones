"use client"

import { useState, useEffect } from "react"

// Tipo para el evento nativo de instalación PWA (Chrome/Android)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

// Clave de localStorage para recordar que el usuario descartó el banner
const CLAVE_DESCARTADA = "pwa-descartada"

// Banner de instalación de la PWA — aparece en móvil cuando la app es instalable
// Soporta Android (beforeinstallprompt) e iOS (instrucciones manuales para Safari)
export default function InstalarPWA() {
  // Evento capturado para instalar en Android/Chrome
  const [eventoInstalacion, setEventoInstalacion] =
    useState<BeforeInstallPromptEvent | null>(null)
  // Si estamos en iOS Safari (sin beforeinstallprompt)
  const [esIOS, setEsIOS] = useState(false)
  // Controla la visibilidad del banner
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // No mostrar si ya está instalada como PWA standalone
    if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
      return
    }

    // No mostrar si el usuario ya descartó el banner anteriormente
    if (localStorage.getItem(CLAVE_DESCARTADA) === "1") {
      return
    }

    // Detectar iOS (iPhone o iPad) — Safari no emite beforeinstallprompt
    const ua = navigator.userAgent
    const esDispositivoIOS =
      ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iPod")

    if (esDispositivoIOS) {
      setEsIOS(true)
      setVisible(true)
      return
    }

    // Android/Chrome: esperar el evento de instalación
    function manejarBeforeInstallPrompt(evento: Event) {
      evento.preventDefault()
      setEventoInstalacion(evento as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener("beforeinstallprompt", manejarBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", manejarBeforeInstallPrompt)
    }
  }, [])

  // Descartar el banner y recordar la decisión en localStorage
  function descartar() {
    localStorage.setItem(CLAVE_DESCARTADA, "1")
    setVisible(false)
  }

  // Llamar al diálogo nativo de instalación (Android/Chrome)
  async function instalar() {
    if (!eventoInstalacion) return
    await eventoInstalacion.prompt()
    setVisible(false)
  }

  // No renderizar nada si no hay nada que mostrar
  if (!visible) return null

  return (
    <div
      role="banner"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4 md:bottom-4 md:left-4 md:right-auto md:max-w-sm md:rounded-xl md:border md:shadow-xl"
    >
      <div className="flex items-center gap-3">
        {/* Icono de la app */}
        <img
          src="/icons/icon.svg"
          alt=""
          aria-hidden="true"
          width={40}
          height={40}
          className="rounded-lg shrink-0"
        />

        {/* Texto del banner */}
        <div className="flex-1 min-w-0">
          {esIOS ? (
            // Instrucciones para iOS Safari
            <>
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                Añadir a pantalla de inicio
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Pulsa{" "}
                <span className="font-medium text-gray-700">Compartir</span>
                {" → "}
                <span className="font-medium text-gray-700">
                  Añadir a pantalla de inicio
                </span>
              </p>
            </>
          ) : (
            // Texto para Android/Chrome
            <>
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                Instalar la app
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Accede rápido sin abrir el navegador
              </p>
            </>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Botón de instalación (solo Android/Chrome) */}
          {!esIOS && eventoInstalacion && (
            <button
              onClick={instalar}
              className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors px-3 py-1.5 rounded-lg"
            >
              Instalar
            </button>
          )}

          {/* Botón de cierre */}
          <button
            onClick={descartar}
            aria-label="cerrar banner de instalación"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
