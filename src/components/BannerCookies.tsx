"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"

// Banner informativo de cookies técnicas — se muestra hasta que el usuario lo acepta
export default function BannerCookies() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const aceptado = localStorage.getItem("cookies-aceptadas")
    if (!aceptado) setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <motion.div
      role="dialog"
      aria-label="Aviso de cookies"
      aria-modal="false"
      className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-4 shadow-lg"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-gray-200">
          Esta plataforma usa exclusivamente cookies técnicas necesarias para el funcionamiento
          del servicio (gestión de sesión). No se usan cookies de seguimiento ni publicidad.{" "}
          <Link href="/privacidad" className="underline hover:text-white">
            Más información
          </Link>
        </p>
        <button
          onClick={() => {
            localStorage.setItem("cookies-aceptadas", "1")
            setVisible(false)
          }}
          className="flex-shrink-0 bg-white text-gray-900 text-sm font-medium px-4 py-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          Entendido
        </button>
      </div>
    </motion.div>
  )
}
