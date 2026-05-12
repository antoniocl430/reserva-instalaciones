/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Impide que el navegador interprete archivos con un MIME type incorrecto
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Bloquea la carga de la página en iframes (previene clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // Fuerza HTTPS durante 1 año (solo activo en producción)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Limita la información del Referer enviada a otros sitios
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Desactiva funcionalidades del navegador que no se usan
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Política de seguridad de contenido básica
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // unsafe-eval solo en desarrollo; en producción se elimina para prevenir XSS
              process.env.NODE_ENV === "development"
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
                : "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
