const analyticsService = require('../services/analytics.service');

function handleError(res, err) {
  res.status(err.status || 500).json({ error: err.message });
}

async function wastedLighting(req, res) {
  try {
    const { from, to, raw } = req.query;
    res.json(await analyticsService.wastedLighting({ from, to, raw: raw === 'true' }));
  } catch (err) { handleError(res, err); }
}

async function occupancy(req, res) {
  try {
    const { from, to } = req.query;
    res.json(await analyticsService.occupancy({ from, to }));
  } catch (err) { handleError(res, err); }
}

module.exports = { wastedLighting, occupancy };
