import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Eliminamos ?pgbouncer=true del connection string porque es un flag de Prisma ORM
  // que pg.Pool no entiende y puede rechazar. La desactivación de prepared statements
  // se gestiona automáticamente a través del adapter PrismaPg.
  const rawUrl = process.env.DATABASE_URL ?? ""
  const connectionString = rawUrl
    .replace(/[?&]pgbouncer=true/i, (m) => (m.startsWith("?") ? "" : ""))
    .replace(/\?$/, "") // limpiar ? suelto si era el único parámetro

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
