import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { extraerSlugDelHost } from "@/lib/tenant"

// Rutas que requieren estar autenticado
const RUTAS_PROTEGIDAS = ["/dashboard", "/mis-reservas", "/perfil"]
// Rutas que requieren estar autenticado Y tener rol ADMIN
const RUTAS_ADMIN = ["/admin"]
// Rutas que requieren estar autenticado Y tener rol INSTRUCTOR
const RUTAS_INSTRUCTOR = ["/instructor"]
// Rutas que requieren estar autenticado Y tener rol SUPERADMIN
const RUTAS_SUPERADMIN = ["/superadmin"]
// Rutas que solo tienen sentido sin sesión activa
const RUTAS_PUBLICAS_AUTH = ["/login", "/registro", "/recuperar-password", "/nueva-password"]
// Login exclusivo para administradores (ruta pública especial)
const RUTA_ADMIN_LOGIN = "/admin/login"
// Rutas de API que son públicas (no requieren autenticación)
// UI-FLOWS.md: la disponibilidad y las instalaciones son públicas (GAP-03)
// /api/verificar es pública: permite escanear QR sin estar autenticado
const RUTAS_API_PUBLICAS = ["/api/auth", "/api/instalaciones", "/api/disponibilidad", "/api/verificar"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── Resolución de tenant ──────────────────────────────────────────────────
  // Extraer el slug del host y buscar el tenantId en la BD.
  // IMPORTANTE: el middleware de Next.js se ejecuta en el Edge Runtime (no Node.js),
  // por lo que NO puede importar Prisma directamente. El tenantId se inyecta en los
  // headers para que las API routes y NextAuth lo lean desde allí.
  //
  // En producción, una mejora futura sería cachear el tenantId por slug en Redis
  // para evitar una consulta a BD en cada petición.
  const host = request.headers.get("host") ?? ""
  const slugTenant = extraerSlugDelHost(host)

  // Clonar la request para añadir headers de tenant
  // El tenantId real se añade en la API route o en NextAuth tras consultar la BD.
  // Aquí solo propagamos el slug; el tenantId completo se resuelve bajo demanda.
  const requestConTenant = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        "x-tenant-slug": slugTenant,
      }),
    },
  })

  // ─── Rutas de API públicas — pasan sin verificar token ────────────────────
  const esApiPublica = RUTAS_API_PUBLICAS.some((ruta) => pathname.startsWith(ruta))
  if (esApiPublica) {
    return requestConTenant
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
    return requestConTenant
  }

  // ─── Rutas SUPERADMIN ──────────────────────────────────────────────────────
  const esRutaSuperadmin = RUTAS_SUPERADMIN.some((ruta) => pathname.startsWith(ruta))
  if (esRutaSuperadmin && !estaAutenticado) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }
  if (esRutaSuperadmin && rol !== "SUPERADMIN") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
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

  // ─── Rutas INSTRUCTOR ──────────────────────────────────────────────────────
  const esRutaInstructor = RUTAS_INSTRUCTOR.some((ruta) => pathname.startsWith(ruta))
  if (esRutaInstructor && !estaAutenticado) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (esRutaInstructor && rol !== "INSTRUCTOR") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // Si intenta acceder a ruta protegida sin sesión → /login
  const esRutaProtegida = RUTAS_PROTEGIDAS.some((ruta) =>
    pathname.startsWith(ruta)
  )
  if (esRutaProtegida && !estaAutenticado) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
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

  return requestConTenant
}

export const config = {
  matcher: [
    "/admin/login",
    "/admin/:path*",
    "/instructor/:path*",
    "/superadmin/:path*",
    "/dashboard/:path*",
    "/pistas/:path*",
    "/mis-reservas/:path*",
    "/perfil",
    "/perfil/:path*",
    "/login",
    "/registro",
    "/recuperar-password",
    "/nueva-password",
    "/api/disponibilidad/:path*",
    "/api/superadmin/:path*",
    // Las rutas de API de admin y reservas pasan por el middleware para inyectar x-tenant-slug
    "/api/admin/:path*",
    "/api/instructor/:path*",
    "/api/reservas/:path*",
    "/api/instalaciones/:path*",
    "/api/avisos/:path*",
    "/api/push/:path*",
  ],
}
