import { DefaultSession } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

// Extiende los tipos de NextAuth para incluir id y rol en sesión y token
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      rol: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    rol: string
  }
}
