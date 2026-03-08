const areaService = require('../services/area.service');

function handleError(res, err) {
  res.status(err.status || 500).json({ error: err.message });
}

async function getSite(req, res) {
  try {
    const site = await areaService.getSite();
    res.json(site ?? null);
  } catch (err) { handleError(res, err); }
}

async function list(req, res) {
  try {
    const areas = await areaService.getRoots();
    res.json(areas);
  } catch (err) { handleError(res, err); }
}

async function get(req, res) {
  try {
    const area = await areaService.getArea(req.params.id);
    res.json(area);
  } catch (err) { handleError(res, err); }
}

async function children(req, res) {
  try {
    const result = await areaService.getChildren(req.params.id);
    res.json(result);
  } catch (err) { handleError(res, err); }
}

async function tree(req, res) {
  try {
    const result = await areaService.getTree(req.params.id);
    res.json(result);
  } catch (err) { handleError(res, err); }
}

async function create(req, res) {
  try {
    const area = await areaService.createArea(req.body);
    res.status(201).json(area);
  } catch (err) { handleError(res, err); }
}

async function update(req, res) {
  try {
    const area = await areaService.updateArea(req.params.id, req.body);
    res.json(area);
  } catch (err) { handleError(res, err); }
}

async function uploadImage(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const area = await areaService.setImage(req.params.id, req.file.filename);
    res.json(area);
  } catch (err) { handleError(res, err); }
}

async function setPosition(req, res) {
  try {
    const { map_x, map_y } = req.body;
    if (map_x == null || map_y == null) {
      return res.status(400).json({ error: 'map_x and map_y are required' });
    }
    const area = await areaService.setPosition(req.params.id, Number(map_x), Number(map_y));
    res.json(area);
  } catch (err) { handleError(res, err); }
}

async function setActive(req, res) {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }
    const area = await areaService.setActive(req.params.id, is_active);
    res.json(area);
  } catch (err) { handleError(res, err); }
}

async function remove(req, res) {
  try {
    await areaService.deleteArea(req.params.id);
    res.status(204).send();
  } catch (err) { handleError(res, err); }
}

module.exports = { getSite, list, get, children, tree, create, update, uploadImage, setPosition, setActive, remove };
