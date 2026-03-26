import { DefaultSession } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

// Extiende los tipos de NextAuth para incluir id, rol y tenantId en sesión y token
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      rol: string
      tenantId: string
    } & DefaultSession["user"]
    // Presente cuando la sesión ha sido invalidada (usuario desactivado)
    error?: "SessionInvalidada"
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    rol: string
    tenantId: string
    // Presente cuando la sesión ha sido invalidada (usuario desactivado)
    error?: "SessionInvalidada"
  }
}
