const userService = require('../services/user.service');

function handleError(res, err) {
  res.status(err.status || 500).json({ error: err.message });
}

async function list(req, res) {
  try {
    const { search, role, is_active, limit, offset } = req.query;
    res.json(await userService.listUsers({
      search,
      role,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    }));
  } catch (err) { handleError(res, err); }
}

async function get(req, res) {
  try { res.json(await userService.getUser(req.params.id)); }
  catch (err) { handleError(res, err); }
}

async function create(req, res) {
  try { res.status(201).json(await userService.createUser(req.body)); }
  catch (err) { handleError(res, err); }
}

async function update(req, res) {
  try { res.json(await userService.updateUser(req.params.id, req.body)); }
  catch (err) { handleError(res, err); }
}

async function remove(req, res) {
  try {
    await userService.deleteUser(req.params.id, req.user.sub);
    res.status(204).send();
  } catch (err) { handleError(res, err); }
}

module.exports = { list, get, create, update, remove };
