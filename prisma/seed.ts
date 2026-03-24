// Script de seed — crea las 3 pistas de pádel y un admin por defecto
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Sembrando base de datos...")

  // ─── Pistas de pádel ──────────────────────────────────────────────────────
  const instalaciones = [
    { nombre: "Pádel 1", tipo: "PADEL", descripcion: "Pista de pádel cubierta" },
    { nombre: "Pádel 2", tipo: "PADEL", descripcion: "Pista de pádel cubierta" },
    { nombre: "Pádel 3", tipo: "PADEL", descripcion: "Pista de pádel exterior" },
  ]

  for (const inst of instalaciones) {
    await prisma.instalacion.upsert({
      where: { nombre: inst.nombre },
      update: {},
      create: inst,
    })
  }

  console.log(`✓ ${instalaciones.length} pistas de pádel creadas`)

  // ─── Admin por defecto ────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 12)

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@ayuntamiento.es" },
    update: {},
    create: {
      email: "admin@ayuntamiento.es",
      nombre: "Administrador",
      passwordHash,
      rol: "ADMIN",
    },
  })

  console.log(`✓ Admin creado: ${admin.email} (contraseña: admin123)`)
  console.log("\nBase de datos lista.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
