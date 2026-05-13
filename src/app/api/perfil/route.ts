/**
 * GET /api/perfil — devuelve el perfil completo del usuario autenticado
 * PATCH /api/perfil — actualiza nombre y/o contraseña del usuario autenticado
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// =============================================================================
// GET /api/perfil
// =============================================================================

/**
 * Devuelve el perfil del usuario autenticado.
 * Campos devueltos: id, nombre, email, rol, noShows, suspendidoHasta,
 * motivoSuspension, creadoEn.
 * NO se devuelve el passwordHash.
 */
export async function GET(_request: NextRequest) {
  // 1. Verificar sesión activa
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: sesion.user.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        noShows: true,
        suspendidoHasta: true,
        motivoSuspension: true,
        creadoEn: true,
        // passwordHash excluido expresamente
      },
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Devolver los campos directamente en la raíz (no dentro de un objeto `usuario`)
    return NextResponse.json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      noShows: usuario.noShows,
      suspendidoHasta: usuario.suspendidoHasta,
      motivoSuspension: usuario.motivoSuspension,
      creadoEn: usuario.creadoEn,
    })
  } catch (error) {
    console.error("[GET /api/perfil] Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// =============================================================================
// PATCH /api/perfil
// =============================================================================

/**
 * Actualiza el nombre y/o contraseña del usuario autenticado.
 *
 * Body (todos opcionales):
 *   - nombre?: string       — nuevo nombre
 *   - passwordActual?: string — contraseña actual (obligatoria si se cambia la contraseña)
 *   - passwordNueva?: string  — nueva contraseña
 *
 * Reglas:
 *   - Si se envía `nombre`, no puede estar vacío.
 *   - Si se envía `passwordNueva`, es obligatorio que también venga `passwordActual`.
 *   - `passwordActual` se verifica contra el hash almacenado en BD.
 *   - Si no hay ningún campo válido, devuelve 400.
 */
export async function PATCH(request: NextRequest) {
  // 1. Verificar sesión activa
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  let body: { nombre?: string; passwordActual?: string; passwordNueva?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const { nombre, passwordActual, passwordNueva } = body

  // 2. Validar que el nombre no esté vacío si se envía
  if (nombre !== undefined && nombre.trim() === "") {
    return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 })
  }

  // 3. Si viene passwordNueva, exigir passwordActual
  if (passwordNueva !== undefined && (passwordActual === undefined || passwordActual === "")) {
    return NextResponse.json(
      { error: "Se requiere la contraseña actual para cambiar la contraseña" },
      { status: 400 }
    )
  }

  // 4. Verificar que hay al menos un campo para actualizar
  const hayNombre = nombre !== undefined && nombre.trim() !== ""
  const hayCambioContrasena = passwordNueva !== undefined

  if (!hayNombre && !hayCambioContrasena) {
    return NextResponse.json(
      { error: "Se debe proporcionar al menos un campo para actualizar" },
      { status: 400 }
    )
  }

  try {
    // Datos a actualizar en BD
    const datosActualizar: { nombre?: string; passwordHash?: string } = {}

    // 5. Si se actualiza nombre
    if (hayNombre) {
      datosActualizar.nombre = nombre!.trim()
    }

    // 6. Si se cambia contraseña: verificar la actual y hashear la nueva
    if (hayCambioContrasena) {
      // Obtener el hash actual del usuario desde BD
      const usuarioConHash = await prisma.usuario.findUnique({
        where: { id: sesion.user.id },
        select: { passwordHash: true },
      })

      if (!usuarioConHash) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
      }

      // Comparar la contraseña actual con el hash almacenado
      const coincide = await bcrypt.compare(passwordActual!, usuarioConHash.passwordHash)
      if (!coincide) {
        return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 })
      }

      // Hashear la nueva contraseña con coste 12
      datosActualizar.passwordHash = await bcrypt.hash(passwordNueva!, 12)
    }

    // 7. Ejecutar la actualización en BD
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: sesion.user.id },
      data: datosActualizar,
      select: {
        id: true,
        nombre: true,
        email: true,
      },
    })

    return NextResponse.json({ ok: true, usuario: usuarioActualizado })
  } catch (error) {
    console.error("[PATCH /api/perfil] Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
