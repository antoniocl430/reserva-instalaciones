"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

// Botones RGPD del dashboard — redirige al perfil donde están las opciones completas
export default function BotonesRGPD() {
  return (
    <Button variant="outline" asChild className="text-sm">
      <Link href="/perfil">Gestionar mis datos</Link>
    </Button>
  )
}
