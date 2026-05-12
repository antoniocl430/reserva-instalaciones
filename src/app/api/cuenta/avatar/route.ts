/**
 * POST /api/cuenta/avatar
 *
 * Sube o actualiza la foto de perfil del usuario autenticado.
 * Almacena la imagen en Cloudflare R2 (en producción) o usa una URL
 * placeholder de dicebear si las credenciales de R2 no están configuradas
 * (desarrollo local).
 *
 * Restricciones:
 *   - Solo formatos: image/jpeg, image/png, image/webp
 *   - Tamaño máximo: 2MB
 *
 * Lógica:
 *   1. Verificar sesión activa. Sin sesión → 401.
 *   2. Leer el archivo del FormData (campo "avatar").
 *   3. Validar tipo MIME y tamaño.
 *   4. Si credenciales de R2 no están configuradas → usar URL placeholder.
 *   5. Subir a Cloudflare R2 con path único por usuario.
 *   6. Actualizar avatarUrl en BD.
 *   7. Devolver { avatarUrl }.
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Tipos de imagen permitidos
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"]
// Tamaño máximo: 2MB en bytes
const TAMANO_MAXIMO = 2 * 1024 * 1024

export async function POST(request: NextRequest) {
  // 1. Verificar sesión activa
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Error al procesar el formulario" }, { status: 400 })
  }

  // 2. Verificar que se ha enviado un archivo
  const archivo = formData.get("avatar") as File | null
  if (!archivo) {
    return NextResponse.json(
      { error: "No se ha proporcionado ninguna imagen" },
      { status: 400 }
    )
  }

  // 3. Validar tipo MIME
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return NextResponse.json(
      { error: "Formato no permitido. Usa JPG, PNG o WebP" },
      { status: 400 }
    )
  }

  // 3b. Validar tamaño
  if (archivo.size > TAMANO_MAXIMO) {
    return NextResponse.json(
      { error: "La imagen no puede superar 2MB" },
      { status: 400 }
    )
  }

  try {
    let avatarUrl: string

    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
      // 4. En desarrollo local sin credenciales de R2:
      // Usar avatar generado con iniciales del usuario como placeholder
      avatarUrl = `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(sesion.user.name ?? "U")}`
    } else {
      // 5. Subir a Cloudflare R2 con path único por usuario
      const extension = archivo.type.split("/")[1]
      const key = `avatars/${sesion.user.id}.${extension}`

      const s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      })

      const arrayBuffer = await archivo.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      await s3Client.send(
        new PutObjectCommand({
          Bucket: "reserva-avatares",
          Key: key,
          Body: buffer,
          ContentType: archivo.type,
        })
      )

      avatarUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
    }

    // 6. Actualizar avatarUrl en BD
    await prisma.usuario.update({
      where: { id: sesion.user.id },
      data: { avatarUrl },
    })

    // 7. Devolver la URL del avatar
    return NextResponse.json({ avatarUrl })
  } catch (error) {
    console.error("Error al subir avatar:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
