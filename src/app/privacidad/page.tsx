import { headers } from "next/headers"
import { extraerSlugDelHost, obtenerTenantPorSlug } from "@/lib/tenant"

export const metadata = { title: "Política de privacidad" }

// Obtiene el nombre y municipio del tenant actual para personalizar la política de privacidad
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

// Política de Privacidad conforme al RGPD Art. 13 — Server Component
export default async function PaginaPrivacidad() {
  const { nombre, municipio } = await obtenerDatosTenant()

  return (
    <main id="contenido-principal" className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        <article className="prose prose-gray max-w-none">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Política de Privacidad
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Información al interesado conforme al artículo 13 del Reglamento (UE) 2016/679
            (RGPD) y la Ley Orgánica 3/2018 de Protección de Datos Personales (LOPDGDD).
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. Responsable del tratamiento
            </h2>
            <p className="text-gray-700">
              <strong>Identidad:</strong> Ayuntamiento de {municipio} ({nombre})
            </p>
            <p className="text-gray-700 mt-1">
              <strong>Contacto:</strong> A través de los canales de atención ciudadana del
              Ayuntamiento de {municipio}.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. Delegado de Protección de Datos (DPD)
            </h2>
            <p className="text-gray-700">
              El Delegado de Protección de Datos es el designado por el Ayuntamiento de {municipio}.
              Puede contactar con él a través de los canales de comunicación del Ayuntamiento.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. Finalidades del tratamiento
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li>
                <strong>Gestión de reservas:</strong> Gestionar el alta de usuario y la realización,
                modificación y cancelación de reservas de instalaciones deportivas municipales.
              </li>
              <li>
                <strong>Comunicaciones de servicio:</strong> Envío de confirmaciones de reserva,
                recordatorios y notificaciones de cancelación por correo electrónico.
              </li>
              <li>
                <strong>Recuperación de acceso:</strong> Procesamiento de solicitudes de
                restablecimiento de contraseña.
              </li>
              <li>
                <strong>Notificaciones push:</strong> Envío de recordatorios de reserva,
                avisos de cancelación y alertas de turno en lista de espera a través de
                notificaciones web push, únicamente si el ciudadano activa expresamente
                esta funcionalidad desde su perfil.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Base jurídica del tratamiento
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li>
                <strong>Gestión de reservas y acceso:</strong> Ejecución de un servicio público
                de competencia municipal (Art. 6.1.e RGPD).
              </li>
              <li>
                <strong>Comunicaciones de servicio:</strong> Consentimiento del interesado
                expresado en el momento del registro (Art. 6.1.a RGPD).
              </li>
              <li>
                <strong>Notificaciones push:</strong> Consentimiento explícito del
                interesado, otorgado al activar las notificaciones desde el perfil
                de usuario (Art. 6.1.a RGPD). Revocable en cualquier momento.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. Datos tratados
            </h2>
            <ul className="space-y-1 text-gray-700">
              <li>Nombre y apellidos</li>
              <li>Dirección de correo electrónico</li>
              <li>Historial de reservas (instalación, fecha y hora)</li>
              <li>
                Tokens de dispositivo para notificaciones push (solo si el ciudadano
                activa las notificaciones; se eliminan al revocar el permiso)
              </li>
              <li>
                Registro de incidencias de no presentación y, en su caso, periodo de
                suspensión temporal del servicio
              </li>
              <li>Fecha y hora de aceptación de la presente política de privacidad</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              6. Plazos de conservación
            </h2>
            <p className="text-gray-700">
              Los datos de cuenta se conservan mientras el usuario mantenga la cuenta activa. Los
              datos de historial de reservas se conservan durante <strong>5 años</strong> tras la
              realización de la reserva, en cumplimiento de las obligaciones contables y de control
              de la actividad pública.
            </p>
            <p className="text-gray-700 mt-2">
              Una vez finalizado el plazo, los datos serán eliminados de forma segura o anonimizados.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              7. Destinatarios
            </h2>
            <p className="text-gray-700">
              Los datos no se ceden a terceros. El proveedor técnico de la plataforma actúa como
              encargado del tratamiento, habiendo suscrito el correspondiente contrato de encargo
              conforme al Art. 28 RGPD.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              8. Transferencias internacionales
            </h2>
            <p className="text-gray-700">
              Los datos se almacenan en servidores ubicados dentro de la Unión Europea. No se
              realizan transferencias internacionales de datos a países terceros.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              9. Derechos del interesado
            </h2>
            <p className="text-gray-700 mb-2">
              Puede ejercer los siguientes derechos respecto a sus datos personales:
            </p>
            <ul className="space-y-1 text-gray-700">
              <li><strong>Acceso:</strong> Conocer qué datos tratamos sobre usted.</li>
              <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos.</li>
              <li>
                <strong>Supresión:</strong> Solicitar la eliminación de sus datos cuando ya no
                sean necesarios.
              </li>
              <li>
                <strong>Portabilidad:</strong> Recibir sus datos en formato estructurado y legible
                por máquina.
              </li>
              <li><strong>Oposición:</strong> Oponerse a determinados tratamientos.</li>
              <li>
                <strong>Limitación:</strong> Restringir el tratamiento en determinadas circunstancias.
              </li>
            </ul>
            <p className="text-gray-700 mt-3">
              Para ejercer estos derechos, puede contactar con el Ayuntamiento de {municipio} a través
              de sus canales oficiales, o directamente desde su{" "}
              <a href="/perfil" className="text-blue-600 underline hover:text-blue-800">
                perfil de usuario
              </a>{" "}
              en esta plataforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              10. Reclamaciones
            </h2>
            <p className="text-gray-700">
              Si considera que el tratamiento de sus datos no se ajusta a la normativa, puede
              presentar una reclamación ante la{" "}
              <strong>Agencia Española de Protección de Datos (AEPD)</strong>{" "}
              en{" "}
              <a
                href="https://www.aepd.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                www.aepd.es
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              11. Encargado del tratamiento
            </h2>
            <p className="text-gray-700">
              La plataforma tecnológica que da soporte a este servicio es operada por el proveedor
              tecnológico con domicilio en España, con quien el Ayuntamiento de {municipio} ha
              suscrito un contrato de encargo del tratamiento conforme al Art. 28 RGPD.
            </p>
          </section>
        </article>
      </div>
    </main>
  )
}
