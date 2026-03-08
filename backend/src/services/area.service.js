const areaRepo = require('../repositories/area.repository');

const VALID_PARENT_TYPE = {
  SITE:     null,        // SITE is the root, no parent
  BUILDING: 'SITE',     // BUILDING must be under a SITE
  FLOOR:    'BUILDING',  // FLOOR must be under a BUILDING
  ROOM:     'FLOOR',    // ROOM must be under a FLOOR
};

// Throws 409 if another sibling under parentId already uses the same code (excludeId = self on update).
async function checkCodeUnique(parentId, code, excludeId = null) {
  if (!code || !parentId) return;
  const siblings = await areaRepo.findByParentAndCode(parentId, code);
  const conflicts = excludeId ? siblings.filter(s => s.id !== excludeId) : siblings;
  if (conflicts.length > 0) {
    throw Object.assign(new Error(`Code "${code}" is already used by another area here`), { status: 409 });
  }
}

// Enforces hierarchy rules. Throws 400 if violated, 404 if parent not found.
async function validateParent(type, parentId) {
  const expectedParentType = VALID_PARENT_TYPE[type];

  if (expectedParentType === null && parentId) {
    throw Object.assign(new Error(`${type} areas cannot have a parent`), { status: 400 });
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

// Returns the single SITE area, or null if none exists.
async function getSite() {
  const sites = await areaRepo.findByType('SITE');
  return sites[0] ?? null;
}

// Validates parent hierarchy then persists the new area. Enforces SITE singleton.
async function createArea({ name, type, parent_id, code, description, map_x, map_y }) {
  if (type === 'SITE') {
    const existing = await areaRepo.findByType('SITE');
    if (existing.length > 0) {
      throw Object.assign(new Error('A site already exists'), { status: 409 });
    }
  }
  await validateParent(type, parent_id ?? null);
  await checkCodeUnique(parent_id ?? null, code ?? null);
  return areaRepo.create({
    name,
    type,
    parent_id: parent_id ?? null,
    code: code ?? null,
    description: description ?? null,
    map_x: map_x ?? null,
    map_y: map_y ?? null,
  });
}

// Fetches a single area by ID. Throws 404 if not found.
async function getArea(id) {
  const area = await areaRepo.findById(id);
  if (!area) throw Object.assign(new Error('Area not found'), { status: 404 });
  return area;
}

// Returns all top-level areas (parent_id = null, i.e. the SITE).
async function getRoots() {
  return areaRepo.findRoots();
}

// Returns the direct children of an area. Throws 404 if the parent area doesn't exist.
async function getChildren(id) {
  await getArea(id);
  return areaRepo.findChildren(id);
}

// Returns an area and its full subtree. Throws 404 if not found.
async function getTree(id) {
  const tree = await areaRepo.findSubtree(id);
  if (!tree) throw Object.assign(new Error('Area not found'), { status: 404 });
  return tree;
}

// Updates mutable fields on an existing area. Throws 404 if not found.
async function updateArea(id, { name, code, description }) {
  const area = await getArea(id);
  await checkCodeUnique(area.parent_id, code ?? null, id);
  return areaRepo.update(id, { name, code, description });
}

// Sets the image_path for an area (used by SITE and FLOOR). Throws 404 if not found.
async function setImage(id, imagePath) {
  await getArea(id);
  return areaRepo.update(id, { image_path: imagePath });
}

// Sets the map position (x, y) for an area icon (BUILDING, ROOM). Throws 404 if not found.
async function setPosition(id, map_x, map_y) {
  await getArea(id);
  return areaRepo.update(id, { map_x, map_y });
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

module.exports = { getSite, createArea, getArea, getRoots, getChildren, getTree, updateArea, setImage, setPosition, setActive, deleteArea };
