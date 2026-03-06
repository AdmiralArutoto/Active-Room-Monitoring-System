const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userRepo = require('../repositories/user.repository');

async function login(username, password) {
  const user = await userRepo.findByUsername(username);
  if (!user) return null;

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return null;

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return token;
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { login, verifyToken };
