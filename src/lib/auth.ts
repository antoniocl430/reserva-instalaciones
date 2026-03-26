import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { verificarRateLimit, resetearRateLimit } from "./rate-limit"

// Hash dummy para evitar timing attack: si el usuario no existe, bcrypt.compare
// tarda lo mismo que si existiera, impidiendo enumerar emails por tiempo de respuesta.
const HASH_DUMMY = "$2a$12$dummy.hash.para.evitar.timing.attack.en.login.form"

/**
 * Extrae la IP del cliente de los headers de la request.
 * Intenta primero x-forwarded-for (proxy), luego x-real-ip, finalmente "unknown".
 */
function extraerIP(req: any): string {
  const forwarded = req.headers?.["x-forwarded-for"]
  if (forwarded) {
    // x-forwarded-for puede tener múltiples IPs separadas por comas
    return forwarded.split(",")[0].trim()
  }
  return req.headers?.["x-real-ip"] ?? "unknown"
}

export const opcionesAuth: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        // Extraer IP para rate limiting
        const ip = extraerIP(req)

        // Verificar rate limiting: máximo 5 intentos fallidos en 15 minutos
        const { bloqueado } = verificarRateLimit(ip, 5, 15 * 60 * 1000)
        if (bloqueado) {
          const err = new Error("RATE_LIMITED")
          throw err
        }

        // Limitar longitud para evitar DoS con contraseñas enormes (bcrypt procesa 72 bytes)
        if (credentials.password.length > 72) return null

        // Extraer el tenantId inyectado por el middleware en los headers
        // En desarrollo (localhost), el middleware inyecta siempre el tenant "desarrollo"
        const tenantId = req.headers?.["x-tenant-id"] as string | undefined

        // Buscar el usuario filtrando por email Y tenantId simultáneamente
        // Un email puede existir en múltiples tenants — solo autenticamos dentro del tenant correcto
        const usuario = await prisma.usuario.findFirst({
          where: {
            email: credentials.email.toLowerCase().trim(),
            ...(tenantId ? { tenantId } : {}),
          },
        })

        // Siempre ejecutar bcrypt.compare para igualar el tiempo de respuesta
        // tanto si el usuario existe como si no (previene enumeración de emails)
        const hashComparar = usuario?.passwordHash ?? HASH_DUMMY
        const passwordValida = await bcrypt.compare(credentials.password, hashComparar)

        if (!usuario || !usuario.activo || !passwordValida) return null

        // Login exitoso: resetear el rate limit para esta IP
        resetearRateLimit(ip)

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nombre,
          rol: usuario.rol,
          tenantId: usuario.tenantId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Primer login: poblar el token con los datos del usuario (incluyendo tenantId)
      if (user) {
        token.id = user.id
        token.rol = (user as unknown as { rol: string }).rol
        token.tenantId = (user as unknown as { tenantId: string }).tenantId
        return token
      }

      // Refresh posterior: verificar que el usuario sigue activo en la BD.
      // Esto invalida sesiones de usuarios desactivados sin esperar la expiración del JWT.
      const usuarioActivo = await prisma.usuario.findUnique({
        where: { id: token.id },
        select: { activo: true },
      })

      if (!usuarioActivo || !usuarioActivo.activo) {
        // Marcar el token como inválido; el callback session lo propagará al cliente
        return { ...token, error: "SessionInvalidada" as const }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.rol = token.rol as string
        session.user.tenantId = token.tenantId as string
      }
      // Propagar el error de sesión invalidada para que el cliente lo detecte
      if (token.error === "SessionInvalidada") {
        session.error = "SessionInvalidada"
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas (en vez de 30 días por defecto)
  },
  secret: process.env.NEXTAUTH_SECRET,
}
