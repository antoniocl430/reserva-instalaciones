import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'
import { resolve } from 'path'

// Cargamos .env manualmente porque prisma.config.ts se evalúa antes de que
// el CLI de Prisma inyecte las variables de entorno
config({ path: resolve(process.cwd(), '.env') })

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    // DIRECT_URL para migraciones (sin pgbouncer); DATABASE_URL como fallback
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
  migrations: {
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
})
