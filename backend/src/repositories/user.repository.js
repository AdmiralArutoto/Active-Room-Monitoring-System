const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const USER_SELECT = {
  id: true,
  username: true,
  role: true,
  email: true,
  full_name: true,
  is_active: true,
  last_active_at: true,
  preferences: true,
  created_at: true,
};

async function findByUsername(username) {
  return prisma.user.findUnique({ where: { username } });
}

async function findById(id) {
  return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
}

async function findByIdWithHash(id) {
  return prisma.user.findUnique({ where: { id } });
}

async function findAll({ search, role, is_active, limit = 50, offset = 0 } = {}) {
  const where = {};
  if (role) where.role = role;
  if (typeof is_active === 'boolean') where.is_active = is_active;
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { full_name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
}

async function create(data) {
  return prisma.user.create({ data, select: USER_SELECT });
}

async function update(id, data) {
  return prisma.user.update({ where: { id }, data, select: USER_SELECT });
}

async function remove(id) {
  return prisma.user.delete({ where: { id } });
}

async function updateLastActive(id) {
  return prisma.user.update({
    where: { id },
    data: { last_active_at: new Date() },
  });
}

module.exports = { findByUsername, findById, findByIdWithHash, findAll, create, update, remove, updateLastActive };
