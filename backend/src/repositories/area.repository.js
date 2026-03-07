const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findById(id) {
  return prisma.area.findUnique({ where: { id } });
}

async function findRoots() {
  return prisma.area.findMany({ where: { parent_id: null }, orderBy: { name: 'asc' } });
}

async function findChildren(parentId) {
  return prisma.area.findMany({ where: { parent_id: parentId }, orderBy: { name: 'asc' } });
}

async function findSubtree(id) {
  return prisma.area.findUnique({
    where: { id },
    include: {
      children: {
        include: {
          children: {
            include: { children: true },
          },
        },
      },
    },
  });
}

async function create(data) {
  return prisma.area.create({ data });
}

async function update(id, data) {
  return prisma.area.update({ where: { id }, data });
}

async function remove(id) {
  return prisma.area.delete({ where: { id } });
}

async function countChildren(parentId) {
  return prisma.area.count({ where: { parent_id: parentId } });
}

// Returns [building, floor, room] for a given room id by walking up parent chain.
async function findWithAncestors(id) {
  const room = await prisma.area.findUnique({
    where: { id },
    include: {
      parent: {
        include: { parent: true },
      },
    },
  });
  if (!room) return null;
  const floor = room.parent ?? null;
  const building = floor?.parent ?? null;
  return { building, floor, room };
}

module.exports = { findById, findRoots, findChildren, findSubtree, create, update, remove, countChildren, findWithAncestors };
