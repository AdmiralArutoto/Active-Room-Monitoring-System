const authService = require('../services/auth.service');
const userRepo = require('../repositories/user.repository');

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const token = await authService.login(username, password);
  if (!token) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  res.json({ token });
}

function logout(_req, res) {
  res.json({ message: 'logged out' });
}

async function me(req, res) {
  const user = await userRepo.findById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'user not found' });

  res.json({ id: user.id, username: user.username, role: user.role });
}

module.exports = { login, logout, me };
