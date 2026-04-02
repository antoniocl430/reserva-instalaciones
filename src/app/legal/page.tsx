import { headers } from "next/headers"
import { extraerSlugDelHost, obtenerTenantPorSlug } from "@/lib/tenant"

export const metadata = { title: "Aviso legal" }

// Obtiene el nombre y municipio del tenant actual para personalizar el aviso legal
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

// Página de Aviso Legal — Server Component estático
export default async function PaginaAvisoLegal() {
  const { nombre, municipio } = await obtenerDatosTenant()

  return (
    <main id="contenido-principal" className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        <article className="prose prose-gray max-w-none">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Aviso Legal</h1>
          <p className="text-sm text-gray-500 mb-8">
            En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la
            Información y del Comercio Electrónico (LSSI-CE), se facilita la siguiente información.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Titular del servicio</h2>
            <p className="text-gray-700">
              El titular de este servicio digital es el <strong>Ayuntamiento de {municipio}</strong>{" "}
              ({nombre}), ente de derecho público con personalidad jurídica propia.
            </p>
            <ul className="mt-3 space-y-1 text-gray-700 text-sm">
              <li><strong>CIF/NIF:</strong> El correspondiente al Ayuntamiento contratante del servicio.</li>
              <li>
                <strong>Domicilio:</strong> El domicilio social del Ayuntamiento de {municipio}.
              </li>
              <li>
                <strong>Contacto:</strong> Puede dirigirse al Ayuntamiento de {municipio} a través de los
                canales de atención ciudadana habituales.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Objeto del servicio</h2>
            <p className="text-gray-700">
              Esta plataforma tiene como objeto la prestación del servicio municipal de reserva de
              instalaciones deportivas del Ayuntamiento de {municipio}. El servicio es gratuito para
              los ciudadanos empadronados o con acceso autorizado.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Propiedad intelectual</h2>
            <p className="text-gray-700">
              La plataforma tecnológica que sustenta este servicio es propiedad del proveedor del
              servicio con quien el Ayuntamiento ha suscrito el correspondiente contrato de
              prestación de servicios. Los contenidos publicados por el Ayuntamiento (textos,
              imágenes, logotipos) son propiedad del mismo.
            </p>
            <p className="text-gray-700 mt-2">
              Queda prohibida la reproducción, distribución o comunicación pública de los contenidos
              sin autorización expresa del titular.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Exclusión de responsabilidad</h2>
            <p className="text-gray-700">
              El Ayuntamiento no se hace responsable de los daños derivados del uso incorrecto de
              la plataforma ni de las interrupciones del servicio por causas ajenas a su control.
              La disponibilidad de las instalaciones está sujeta a condiciones climatológicas,
              mantenimiento y decisiones de gestión municipal.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Ley aplicable y jurisdicción</h2>
            <p className="text-gray-700">
              Este aviso legal se rige por la legislación española. Para la resolución de cualquier
              controversia derivada del uso de este servicio, las partes se someten a la jurisdicción
              de los Juzgados y Tribunales de {municipio}, con renuncia expresa a cualquier otro fuero
              que pudiera corresponderles.
            </p>
          </section>
        </article>
      </div>
    </main>
  )
}
