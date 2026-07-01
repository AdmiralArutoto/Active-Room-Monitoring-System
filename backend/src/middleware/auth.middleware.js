const authService = require('../services/auth.service');
const userRepo = require('../repositories/user.repository');

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    req.user = authService.verifyToken(token);
    userRepo.updateLastActive(req.user.sub).catch(() => {});
    next();
  } catch {
    res.status(401).json({ error: 'invalid or expired token' });
  }
}

module.exports = { requireAuth };
