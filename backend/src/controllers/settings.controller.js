const userService = require('../services/user.service');

function handleError(res, err) {
  res.status(err.status || 500).json({ error: err.message });
}

async function getProfile(req, res) {
  try { res.json(await userService.getProfile(req.user.sub)); }
  catch (err) { handleError(res, err); }
}

async function updateProfile(req, res) {
  try { res.json(await userService.updateProfile(req.user.sub, req.body)); }
  catch (err) { handleError(res, err); }
}

async function getPreferences(req, res) {
  try {
    const user = await userService.getUser(req.user.sub);
    res.json(user.preferences || {});
  } catch (err) { handleError(res, err); }
}

async function updatePreferences(req, res) {
  try { res.json(await userService.updatePreferences(req.user.sub, req.body)); }
  catch (err) { handleError(res, err); }
}

module.exports = { getProfile, updateProfile, getPreferences, updatePreferences };
