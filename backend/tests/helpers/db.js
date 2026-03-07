const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } },
});

async function setupDb() {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}

async function resetDb() {
  // Delete in dependency order (children before parents)
  await prisma.sensorEvent.deleteMany();
  await prisma.sensorState.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.area.deleteMany();
  await prisma.user.deleteMany();
}

module.exports = { prisma, setupDb, resetDb };
