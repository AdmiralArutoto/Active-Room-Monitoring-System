const ingestService = require('../services/ingest.service');
const stateStore = require('../store/state.store');

async function push(req, res) {
  const { sensor_key } = req.params;
  const { state, ts } = req.body;

  if (!state) return res.status(400).json({ error: 'state is required' });

  try {
    const result = await ingestService.ingest(sensor_key, state, ts ?? null);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

function getAll(_req, res) {
  res.json(stateStore.getAllStates());
}

function getOne(req, res) {
  const record = stateStore.getState(req.params.sensor_key);
  if (!record) return res.status(404).json({ error: 'No state found for sensor_key' });
  res.json(record);
}

module.exports = { push, getAll, getOne };
