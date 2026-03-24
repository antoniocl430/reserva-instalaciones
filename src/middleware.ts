import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Rutas que requieren estar autenticado
const RUTAS_PROTEGIDAS = ["/dashboard", "/pistas", "/mis-reservas"]
// Rutas que solo tienen sentido sin sesión activa
const RUTAS_PUBLICAS_AUTH = ["/login", "/registro"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const estaAutenticado = !!token

  // Si intenta acceder a ruta protegida sin sesión → /login
  const esRutaProtegida = RUTAS_PROTEGIDAS.some((ruta) =>
    pathname.startsWith(ruta)
  )
  if (esRutaProtegida && !estaAutenticado) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Si ya tiene sesión e intenta ir a /login o /registro → /dashboard
  const esRutaPublicaAuth = RUTAS_PUBLICAS_AUTH.some((ruta) =>
    pathname.startsWith(ruta)
  )
  if (esRutaPublicaAuth && estaAutenticado) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pistas/:path*",
    "/mis-reservas/:path*",
    "/login",
    "/registro",
  ],
}
