// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { username: 'director1' },
    update: {},
    create: { id: 'uuid-here', name: 'Director Test', role: 'director', username: 'director1' },
  });
  // Add teacher/guardian similarly
}

main().then(() => prisma.$disconnect()).catch(e => console.error(e));