const sensorService = require('../services/sensor.service');

function handleError(res, err) {
  res.status(err.status || 500).json({ error: err.message });
}

async function list(req, res) {
  try { res.json(await sensorService.listSensors()); }
  catch (err) { handleError(res, err); }
}

async function get(req, res) {
  try { res.json(await sensorService.getSensor(req.params.id)); }
  catch (err) { handleError(res, err); }
}

async function create(req, res) {
  try { res.status(201).json(await sensorService.createSensor(req.body)); }
  catch (err) { handleError(res, err); }
}

async function update(req, res) {
  try { res.json(await sensorService.updateSensor(req.params.id, req.body)); }
  catch (err) { handleError(res, err); }
}

async function setActive(req, res) {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'is_active must be a boolean' });
    res.json(await sensorService.setActive(req.params.id, is_active));
  } catch (err) { handleError(res, err); }
}

async function remove(req, res) {
  try {
    await sensorService.deleteSensor(req.params.id);
    res.status(204).send();
  } catch (err) { handleError(res, err); }
}

module.exports = { list, get, create, update, setActive, remove };
