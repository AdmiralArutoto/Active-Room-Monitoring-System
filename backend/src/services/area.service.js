const areaRepo = require('../repositories/area.repository');

const VALID_PARENT_TYPE = {
  BUILDING: null,
  FLOOR: 'BUILDING',
  ROOM: 'FLOOR',
};

async function validateParent(type, parentId) {
  const expectedParentType = VALID_PARENT_TYPE[type];

  if (expectedParentType === null && parentId) {
    throw Object.assign(new Error('BUILDING areas cannot have a parent'), { status: 400 });
  }
  if (expectedParentType !== null && !parentId) {
    throw Object.assign(new Error(`${type} areas require a parent`), { status: 400 });
  }
  if (parentId) {
    const parent = await areaRepo.findById(parentId);
    if (!parent) {
      throw Object.assign(new Error('Parent area not found'), { status: 404 });
    }
    if (parent.type !== expectedParentType) {
      throw Object.assign(
        new Error(`${type} must be placed under a ${expectedParentType}`),
        { status: 400 }
      );
    }
  }
}

async function createArea({ name, type, parent_id, code, description }) {
  await validateParent(type, parent_id ?? null);
  return areaRepo.create({ name, type, parent_id: parent_id ?? null, code: code ?? null, description: description ?? null });
}

async function getArea(id) {
  const area = await areaRepo.findById(id);
  if (!area) throw Object.assign(new Error('Area not found'), { status: 404 });
  return area;
}

async function getRoots() {
  return areaRepo.findRoots();
}

async function getChildren(id) {
  await getArea(id);
  return areaRepo.findChildren(id);
}

async function getTree(id) {
  const tree = await areaRepo.findSubtree(id);
  if (!tree) throw Object.assign(new Error('Area not found'), { status: 404 });
  return tree;
}

async function updateArea(id, { name, code, description }) {
  await getArea(id);
  return areaRepo.update(id, { name, code, description });
}

async function setActive(id, is_active) {
  await getArea(id);
  return areaRepo.update(id, { is_active });
}

async function deleteArea(id) {
  await getArea(id);
  const childCount = await areaRepo.countChildren(id);
  if (childCount > 0) {
    throw Object.assign(new Error('Cannot delete area with children'), { status: 409 });
  }
  return areaRepo.remove(id);
}

module.exports = { createArea, getArea, getRoots, getChildren, getTree, updateArea, setActive, deleteArea };
