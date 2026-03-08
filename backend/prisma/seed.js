const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const SEED_USERS = [
  { username: 'admin',  password: 'admin123',  role: 'ADMIN'  },
  { username: 'viewer', password: 'viewer123', role: 'VIEWER' },
];

async function main() {
  for (const u of SEED_USERS) {
    const existing = await prisma.user.findUnique({ where: { username: u.username } });
    if (existing) {
      console.log(`Seed: ${u.username} already exists, skipping.`);
      continue;
    }
    const password_hash = await bcrypt.hash(u.password, 10);
    await prisma.user.create({ data: { username: u.username, password_hash, role: u.role } });
    console.log(`Seed: ${u.username} created.`);
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
