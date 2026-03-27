// Script de seed — crea el tenant inicial, las 3 pistas de pádel y un admin por defecto
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// ID fijo para el tenant de desarrollo — debe coincidir con la migración
const TENANT_DESARROLLO_ID = "tenant-desarrollo-0000-0000-000000000001"

async function main() {
  console.log("Sembrando base de datos...")

  // ─── Tenant de desarrollo ──────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: "desarrollo" },
    update: {},
    create: {
      id: TENANT_DESARROLLO_ID,
      slug: "desarrollo",
      nombre: "Ayuntamiento de Desarrollo",
      municipio: "Desarrollo",
      estado: "ACTIVO",
    },
  })

  console.log(`✓ Tenant creado/encontrado: ${tenant.slug} (${tenant.id})`)

  // ─── Pistas de pádel ──────────────────────────────────────────────────────
  const instalaciones = [
    { nombre: "Pádel 1", tipo: "PADEL", descripcion: "Pista de pádel cubierta", horario: "Lun-Dom: 8:00-13:00 y 16:45-20:30" },
    { nombre: "Pádel 2", tipo: "PADEL", descripcion: "Pista de pádel cubierta", horario: "Lun-Dom: 8:00-13:00 y 16:45-20:30" },
    { nombre: "Pádel 3", tipo: "PADEL", descripcion: "Pista de pádel exterior", horario: "Lun-Dom: 8:00-13:00 y 16:45-20:30" },
  ]

  for (const inst of instalaciones) {
    // Buscar por nombre dentro del tenant de desarrollo
    const existente = await prisma.instalacion.findFirst({
      where: { nombre: inst.nombre, tenantId: tenant.id },
    })

    if (existente) {
      // Ya existe en el tenant correcto — no hacer nada
      console.log(`  ~ Instalación ya existe: ${inst.nombre}`)
    } else {
      await prisma.instalacion.create({
        data: { ...inst, tenantId: tenant.id },
      })
      console.log(`  + Instalación creada: ${inst.nombre}`)
    }
  }

  console.log(`✓ ${instalaciones.length} pistas de pádel verificadas`)

  // ─── Admin por defecto ────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 12)

  const adminExistente = await prisma.usuario.findFirst({
    where: { email: "admin@ayuntamiento.es", tenantId: tenant.id },
  })

  if (adminExistente) {
    console.log(`✓ Admin ya existe: ${adminExistente.email}`)
  } else {
    const admin = await prisma.usuario.create({
      data: {
        email: "admin@ayuntamiento.es",
        nombre: "Administrador",
        passwordHash,
        rol: "ADMIN",
        tenantId: tenant.id,
      },
    })
    console.log(`✓ Admin creado: ${admin.email} (contraseña: admin123)`)
  }

  // ─── Superadmin global ───────────────────────────────────────────────────
  const superadminEmail = "superadmin@reservas.dev"
  const superadminPassword = "SuperAdmin123!"
  const superadminHash = await bcrypt.hash(superadminPassword, 12)

  const superadminExistente = await prisma.usuario.findFirst({
    where: { email: superadminEmail, rol: "SUPERADMIN" },
  })

  if (superadminExistente) {
    console.log(`✓ Superadmin ya existe: ${superadminExistente.email}`)
  } else {
    const superadmin = await prisma.usuario.create({
      data: {
        email: superadminEmail,
        nombre: "Super Administrador",
        passwordHash: superadminHash,
        rol: "SUPERADMIN",
        tenantId: tenant.id, // Asignado al tenant de desarrollo
      },
    })
    console.log(`✓ Superadmin creado: ${superadmin.email} (contraseña: ${superadminPassword})`)
  }

  console.log("\nBase de datos lista.")
  console.log("\n── Credenciales ──")
  console.log(`Admin:      admin@ayuntamiento.es / admin123`)
  console.log(`Superadmin: ${superadminEmail} / ${superadminPassword}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
