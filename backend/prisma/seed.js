import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const genres = [
  { name: 'Acción', slug: 'accion' },
  { name: 'Aventura', slug: 'aventura' },
  { name: 'Animación', slug: 'animacion' },
  { name: 'Comedia', slug: 'comedia' },
  { name: 'Crimen', slug: 'crimen' },
  { name: 'Documental', slug: 'documental' },
  { name: 'Drama', slug: 'drama' },
  { name: 'Fantasía', slug: 'fantasia' },
  { name: 'Terror', slug: 'terror' },
  { name: 'Misterio', slug: 'misterio' },
  { name: 'Romance', slug: 'romance' },
  { name: 'Ciencia Ficción', slug: 'ciencia-ficcion' },
  { name: 'Thriller', slug: 'thriller' },
  { name: 'Western', slug: 'western' },
  { name: 'Familia', slug: 'familia' },
];

async function main() {
  console.log('🌱 Seeding MJMovies database...');

  // Crear géneros
  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: {},
      create: { name: genre.name, slug: genre.slug },
    });
  }
  console.log(`✅ ${genres.length} géneros creados`);

  // Crear admin
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@MJMovies2024!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@mjmovies.local' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@mjmovies.local',
      username: process.env.ADMIN_USERNAME || 'admin',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
    },
  });

  console.log(`✅ Admin creado: ${admin.email}`);
  console.log('🎬 MJMovies seed completado!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
