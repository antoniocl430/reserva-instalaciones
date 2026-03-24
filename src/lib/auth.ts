import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

// Hash dummy para evitar timing attack: si el usuario no existe, bcrypt.compare
// tarda lo mismo que si existiera, impidiendo enumerar emails por tiempo de respuesta.
const HASH_DUMMY = "$2a$12$dummy.hash.para.evitar.timing.attack.en.login.form"

export const opcionesAuth: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Limitar longitud para evitar DoS con contraseñas enormes (bcrypt procesa 72 bytes)
        if (credentials.password.length > 72) return null

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        // Siempre ejecutar bcrypt.compare para igualar el tiempo de respuesta
        // tanto si el usuario existe como si no (previene enumeración de emails)
        const hashComparar = usuario?.passwordHash ?? HASH_DUMMY
        const passwordValida = await bcrypt.compare(credentials.password, hashComparar)

        if (!usuario || !usuario.activo || !passwordValida) return null

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nombre,
          rol: usuario.rol,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.rol = (user as unknown as { rol: string }).rol
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.rol = token.rol as string
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
