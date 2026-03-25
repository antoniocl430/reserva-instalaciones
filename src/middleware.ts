import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Rutas que requieren estar autenticado
const RUTAS_PROTEGIDAS = ["/dashboard", "/pistas", "/mis-reservas"]
// Rutas que requieren estar autenticado Y tener rol ADMIN
const RUTAS_ADMIN = ["/admin"]
// Rutas que solo tienen sentido sin sesión activa
const RUTAS_PUBLICAS_AUTH = ["/login", "/registro"]
// Login exclusivo para administradores (ruta pública especial)
const RUTA_ADMIN_LOGIN = "/admin/login"
// Rutas de API que son públicas (no requieren autenticación)
// UI-FLOWS.md: la disponibilidad y las instalaciones son públicas (GAP-03)
const RUTAS_API_PUBLICAS = ["/api/auth", "/api/instalaciones", "/api/disponibilidad"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Las rutas de API públicas pasan siempre sin verificar token
  const esApiPublica = RUTAS_API_PUBLICAS.some((ruta) => pathname.startsWith(ruta))
  if (esApiPublica) {
    return NextResponse.next()
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const estaAutenticado = !!token
  const rol = estaAutenticado ? (token?.rol as string | undefined) : undefined

  // Si un ADMIN autenticado intenta ir a /admin/login → redirigir a /admin
  if (pathname === RUTA_ADMIN_LOGIN && estaAutenticado && rol === "ADMIN") {
    const url = request.nextUrl.clone()
    url.pathname = "/admin"
    return NextResponse.redirect(url)
  }

  // /admin/login es pública: si se llega aquí (sin sesión o CIUDADANO), dejar pasar
  // El formulario mismo rechazará el acceso si el usuario no es ADMIN
  if (pathname === RUTA_ADMIN_LOGIN) {
    return NextResponse.next()
  }

  // Si intenta acceder a ruta admin sin sesión → /admin/login
  const esRutaAdmin = RUTAS_ADMIN.some((ruta) => pathname.startsWith(ruta))
  if (esRutaAdmin && !estaAutenticado) {
    const url = request.nextUrl.clone()
    url.pathname = RUTA_ADMIN_LOGIN
    return NextResponse.redirect(url)
  }

  // Si intenta acceder a ruta admin pero no es ADMIN → /dashboard
  if (esRutaAdmin && rol !== "ADMIN") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

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
    "/admin/login",
    "/admin/:path*",
    "/dashboard/:path*",
    "/pistas/:path*",
    "/mis-reservas/:path*",
    "/login",
    "/registro",
    "/api/disponibilidad/:path*",
  ],
}
