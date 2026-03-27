import { headers } from "next/headers"
import { extraerSlugDelHost, obtenerTenantPorSlug } from "@/lib/tenant"

// Obtiene el nombre y municipio del tenant actual
async function obtenerDatosTenant(): Promise<{ nombre: string; municipio: string }> {
  try {
    const headersList = await headers()
    const host = headersList.get("host") ?? ""
    const slug = extraerSlugDelHost(host)
    const tenant = await obtenerTenantPorSlug(slug)
    if (!tenant) return { nombre: "el Ayuntamiento", municipio: "el municipio" }
    return { nombre: tenant.nombre, municipio: tenant.municipio }
  } catch {
    return { nombre: "el Ayuntamiento", municipio: "el municipio" }
  }
}

// Declaración de accesibilidad conforme al RD 1112/2018 — Server Component
export default async function PaginaAccesibilidad() {
  const { nombre, municipio } = await obtenerDatosTenant()
  // La fecha de declaración se genera en el servidor en el momento del render
  const fechaDeclaracion = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <main id="contenido-principal" className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        <article className="prose prose-gray max-w-none">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Declaración de Accesibilidad
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Conforme al Real Decreto 1112/2018, de 7 de septiembre, sobre accesibilidad de los
            sitios web y aplicaciones para dispositivos móviles del sector público.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. Situación de cumplimiento
            </h2>
            <p className="text-gray-700">
              El <strong>Ayuntamiento de {municipio}</strong> ({nombre}) trabaja activamente para
              que esta plataforma de reservas deportivas sea accesible, de conformidad con el RD
              1112/2018.
            </p>
            <p className="text-gray-700 mt-2">
              <strong>Estado:</strong> Parcialmente conforme con las{" "}
              <abbr title="Web Content Accessibility Guidelines">WCAG</abbr> 2.1 nivel AA.
              Existen partes del contenido que todavía no cumplen completamente con el estándar,
              tal como se detalla a continuación.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. Tecnologías utilizadas
            </h2>
            <p className="text-gray-700">
              Esta plataforma hace uso de las siguientes tecnologías para su funcionamiento:
            </p>
            <ul className="space-y-1 text-gray-700">
              <li>HTML5 semántico</li>
              <li>CSS3 y diseño adaptable (responsive)</li>
              <li>JavaScript</li>
              <li>
                ARIA (<abbr title="Accessible Rich Internet Applications">WAI-ARIA</abbr>) para
                mejorar la accesibilidad de los componentes dinámicos
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. Ámbito de aplicación
            </h2>
            <p className="text-gray-700">
              Esta declaración se aplica a todos los contenidos y funcionalidades de la plataforma
              de reservas deportivas del Ayuntamiento de {municipio}, accesible en el presente dominio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Contenido no accesible conocido
            </h2>
            <p className="text-gray-700">
              Se han identificado elementos que pueden no cumplir plenamente con el nivel AA de las
              WCAG 2.1 y que están siendo corregidos progresivamente:
            </p>
            <ul className="space-y-2 text-gray-700 mt-2">
              <li>
                Algunos componentes dinámicos de selección de fecha y hora pueden presentar
                limitaciones con tecnologías de asistencia.
              </li>
              <li>
                Ciertos mensajes de estado y notificaciones están siendo revisados para mejorar
                su anuncio mediante lectores de pantalla.
              </li>
            </ul>
            <p className="text-gray-700 mt-3">
              El equipo técnico trabaja de forma continua en la mejora de la accesibilidad de la
              plataforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. Contacto para reportar problemas de accesibilidad
            </h2>
            <p className="text-gray-700">
              Si encuentra algún problema de accesibilidad o necesita información en formato
              alternativo, puede ponerse en contacto con el Ayuntamiento de {municipio} a través
              de sus canales oficiales de atención ciudadana.
            </p>
            <p className="text-gray-700 mt-2">
              Nos comprometemos a responder en el plazo máximo de <strong>20 días hábiles</strong>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              6. Procedimiento de reclamación
            </h2>
            <p className="text-gray-700">
              Si no obtiene una respuesta satisfactoria a su solicitud de información accesible,
              puede presentar una queja o reclamación a través de los siguientes organismos:
            </p>
            <ul className="space-y-2 text-gray-700 mt-2">
              <li>
                <strong>Agencia Española de Protección de Datos (AEPD):</strong>{" "}
                <a
                  href="https://www.aepd.es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  www.aepd.es
                </a>
              </li>
              <li>
                <strong>Defensor del Pueblo:</strong>{" "}
                <a
                  href="https://www.defensordelpueblo.es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  www.defensordelpueblo.es
                </a>
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              7. Información de la declaración
            </h2>
            <ul className="space-y-1 text-gray-700 text-sm">
              <li><strong>Fecha de elaboración de la declaración:</strong> {fechaDeclaracion}</li>
              <li><strong>Fecha de última revisión:</strong> {fechaDeclaracion}</li>
              <li>
                <strong>Método de evaluación:</strong> Autoevaluación realizada por el equipo
                técnico.
              </li>
            </ul>
          </section>
        </article>
      </div>
    </main>
  )
}
