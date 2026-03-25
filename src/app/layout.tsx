import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Proveedores } from "@/components/proveedores"
import { Header } from "@/components/header"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Reservas Deportivas — Ayuntamiento",
  description: "Sistema de reservas de instalaciones deportivas municipales",
}

export default function LayoutRaiz({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Proveedores>
          <Header />
          {children}
        </Proveedores>
      </body>
    </html>
  )
}
