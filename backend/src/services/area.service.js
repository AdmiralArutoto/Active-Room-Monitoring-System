const areaRepo = require('../repositories/area.repository');

const VALID_PARENT_TYPE = {
  BUILDING: null,
  FLOOR: 'BUILDING',
  ROOM: 'FLOOR',
};

// Enforces hierarchy rules: BUILDING has no parent, FLOOR must be under a BUILDING, ROOM must be under a FLOOR.
// Throws 400 if the rule is violated, 404 if the parent doesn't exist.
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

// Validates parent hierarchy then persists the new area. Returns the created record.
async function createArea({ name, type, parent_id, code, description }) {
  await validateParent(type, parent_id ?? null);
  return areaRepo.create({ name, type, parent_id: parent_id ?? null, code: code ?? null, description: description ?? null });
}

// Fetches a single area by ID. Throws 404 if not found.
async function getArea(id) {
  const area = await areaRepo.findById(id);
  if (!area) throw Object.assign(new Error('Area not found'), { status: 404 });
  return area;
}

// Returns all top-level areas (BUILDINGs with no parent).
async function getRoots() {
  return areaRepo.findRoots();
}

// Returns the direct children of an area. Throws 404 if the parent area doesn't exist.
async function getChildren(id) {
  await getArea(id);
  return areaRepo.findChildren(id);
}

// Returns an area and its full subtree (children + grandchildren). Throws 404 if not found.
async function getTree(id) {
  const tree = await areaRepo.findSubtree(id);
  if (!tree) throw Object.assign(new Error('Area not found'), { status: 404 });
  return tree;
}

// Updates mutable fields (name, code, description) on an existing area. Throws 404 if not found.
async function updateArea(id, { name, code, description }) {
  await getArea(id);
  return areaRepo.update(id, { name, code, description });
}

// Enables or disables an area without deleting it. Throws 404 if not found.
async function setActive(id, is_active) {
  await getArea(id);
  return areaRepo.update(id, { is_active });
}

// Deletes an area. Throws 409 if the area still has children, 404 if not found.
async function deleteArea(id) {
  await getArea(id);
  const childCount = await areaRepo.countChildren(id);
  if (childCount > 0) {
    throw Object.assign(new Error('Cannot delete area with children'), { status: 409 });
  }
  return areaRepo.remove(id);
}

module.exports = { createArea, getArea, getRoots, getChildren, getTree, updateArea, setActive, deleteArea };
