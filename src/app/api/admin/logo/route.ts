/**
 * Endpoint para subir el logo del ayuntamiento
 *
 * POST /api/admin/logo
 *   - Acepta multipart/form-data con campo "file" (imagen)
 *   - Convierte el archivo a base64 data URL
 *   - Guarda la data URL en el campo logoUrl del tenant
 *   - Límite: 200 KB de archivo
 *   - Tipos permitidos: image/* (png, jpeg, gif, svg, webp, etc.)
 *
 * Acceso: solo ADMIN
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Tamaño máximo permitido: 200 KB
const TAMANO_MAXIMO_BYTES = 200 * 1024

export async function POST(request: NextRequest) {
  // 1. Validar sesión
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // 2. Validar rol ADMIN
  if (sesion.user.rol !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permiso para realizar esta acción" },
      { status: 403 }
    )
  }

  // 3. Obtener el FormData y el campo "file"
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el formulario enviado" },
      { status: 400 }
    )
  }

  const campo = formData.get("file")

  // 4. Validar que existe el campo "file" y es un File
  if (!campo || !(campo instanceof File)) {
    return NextResponse.json(
      { error: "Falta el archivo. Envía el campo 'file' con la imagen del logo" },
      { status: 400 }
    )
  }

  const archivo = campo

  // 5. Validar que el tipo MIME es image/*
  if (!archivo.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Tipo de imagen no permitido. Solo se aceptan archivos de imagen (PNG, JPEG, GIF, SVG, WebP)" },
      { status: 400 }
    )
  }

  // 6. Validar el tamaño del archivo
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return NextResponse.json(
      {
        error: `El tamaño máximo permitido es 200 KB. El archivo enviado ocupa ${Math.round(archivo.size / 1024)} KB`,
      },
      { status: 400 }
    )
  }

  try {
    // 7. Convertir el archivo a base64 data URL
    const arrayBuffer = await archivo.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const dataUrl = `data:${archivo.type};base64,${base64}`

    // 8. Guardar la data URL en el tenant
    await prisma.tenant.update({
      where: { id: sesion.user.tenantId },
      data: { logoUrl: dataUrl },
    })

    return NextResponse.json({ logoUrl: dataUrl })
  } catch (err) {
    console.error("Error al guardar el logo del tenant:", err)
    return NextResponse.json(
      { error: "Error interno del servidor al guardar el logo" },
      { status: 500 }
    )
  }
}
