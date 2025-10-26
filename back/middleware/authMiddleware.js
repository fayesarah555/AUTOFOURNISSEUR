const { hasValidSession } = require('../utils/session');

const requireAuth = (req, res, next) => {
  if (!hasValidSession(req.session)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
};

const requireAdmin = (req, res, next) => {
  if (!hasValidSession(req.session)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const roles = Array.isArray(req.session.user?.roles) ? req.session.user.roles : [];

  if (!roles.includes('admin')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
};

module.exports = {
  requireAuth,
  requireAdmin,
};
