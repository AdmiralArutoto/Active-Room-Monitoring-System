const eventService = require('../services/event.service');

function handleError(res, err) {
  res.status(err.status || 500).json({ error: err.message });
}

async function list(req, res) {
  try {
    const { sensor_id, from, to, limit, offset } = req.query;
    res.json(await eventService.listEvents({ sensor_id, from, to, limit, offset }));
  } catch (err) { handleError(res, err); }
}

module.exports = { list };
