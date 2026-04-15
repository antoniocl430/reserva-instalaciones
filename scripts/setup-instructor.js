const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

(async () => {
  try {
    // Verificar si ya existe
    const usuario = await prisma.usuario.findFirst({
      where: { email: 'instructor@test.es' }
    });

    if (usuario) {
      console.log('✅ Usuario instructor ya existe:', usuario.id);
      process.exit(0);
    }

    // Obtener el primer tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('❌ No hay tenant en la BD');
      process.exit(1);
    }

    // Crear el usuario
    const passwordHash = await bcrypt.hash('Instructor123', 12);
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        tenantId: tenant.id,
        nombre: 'Instructor Test',
        email: 'instructor@test.es',
        passwordHash,
        rol: 'INSTRUCTOR'
      }
    });

    console.log('✅ Usuario instructor creado:', nuevoUsuario.id);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
