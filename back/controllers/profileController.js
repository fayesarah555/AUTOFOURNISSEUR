const { hasValidSession } = require('../utils/session');

const getProfile = (req, res) => {
  if (!hasValidSession(req.session)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  return res.status(200).json({
    user: req.session.user,
  });
};

module.exports = {
  getProfile,
};
