// Script de seed — crea el tenant inicial, las 3 pistas de pádel y un admin por defecto
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { config } from "dotenv"
import { resolve } from "path"
import bcrypt from "bcryptjs"

config({ path: resolve(process.cwd(), ".env") })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

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
    const existente = await prisma.instalacion.findFirst({
      where: { nombre: inst.nombre, tenantId: tenant.id },
    })

    if (existente) {
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
        tenantId: tenant.id,
      },
    })
    console.log(`✓ Superadmin creado: ${superadmin.email} (contraseña: ${superadminPassword})`)
  }

  // ─── Instructor de prueba (para tests E2E) ──────────────────────────────────
  const instructorEmail = "instructor@test.es"
  const instructorPassword = "Instructor123"
  const instructorHash = await bcrypt.hash(instructorPassword, 12)

  const instructorExistente = await prisma.usuario.findFirst({
    where: { email: instructorEmail, tenantId: tenant.id },
  })

  if (instructorExistente) {
    console.log(`✓ Instructor ya existe: ${instructorExistente.email}`)
  } else {
    const instructor = await prisma.usuario.create({
      data: {
        email: instructorEmail,
        nombre: "Instructor de prueba",
        passwordHash: instructorHash,
        rol: "INSTRUCTOR",
        tenantId: tenant.id,
      },
    })
    console.log(`✓ Instructor creado: ${instructor.email} (contraseña: ${instructorPassword})`)
  }

  // ─── Ciudadano de prueba (para tests E2E) ──────────────────────────────────
  const ciudadanoEmail = "ciudadano@test.es"
  const ciudadanoPassword = "Test1234!"
  const ciudadanoHash = await bcrypt.hash(ciudadanoPassword, 12)

  const ciudadanoExistente = await prisma.usuario.findFirst({
    where: { email: ciudadanoEmail, tenantId: tenant.id },
  })

  if (ciudadanoExistente) {
    // Garantizar que el email está verificado (importante para tests E2E)
    await prisma.usuario.update({
      where: { id: ciudadanoExistente.id },
      data: { emailVerificado: true, passwordHash: ciudadanoHash },
    })
    console.log(`✓ Ciudadano de prueba actualizado: ${ciudadanoExistente.email}`)
  } else {
    const ciudadano = await prisma.usuario.create({
      data: {
        email: ciudadanoEmail,
        nombre: "Ciudadano de prueba",
        passwordHash: ciudadanoHash,
        rol: "CIUDADANO",
        activo: true,
        emailVerificado: true,
        tenantId: tenant.id,
      },
    })
    console.log(`✓ Ciudadano creado: ${ciudadano.email} (contraseña: ${ciudadanoPassword})`)
  }

  console.log("\nBase de datos lista.")
  console.log("\n── Credenciales ──")
  console.log(`Admin:      admin@ayuntamiento.es / admin123`)
  console.log(`Superadmin: ${superadminEmail} / ${superadminPassword}`)
  console.log(`Instructor: ${instructorEmail} / ${instructorPassword}`)
  console.log(`Ciudadano:  ${ciudadanoEmail} / ${ciudadanoPassword}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
