const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findByUsername(username) {
  return prisma.user.findUnique({ where: { username } });
}

async function findById(id) {
  return prisma.user.findUnique({ where: { id } });
}

module.exports = { findByUsername, findById };
