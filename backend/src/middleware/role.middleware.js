const ROLE_HIERARCHY = { VIEWER: 0, ADMIN: 1 };

function requireRole(minRole) {
  return (req, res, next) => {
    const userLevel = ROLE_HIERARCHY[req.user?.role] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 99;
    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: 'insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireRole };
