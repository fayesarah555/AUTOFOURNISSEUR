const { hasValidSession, startSession } = require('../utils/session');

const findDemoUser = (id, password) => {
  const demoId = process.env.DEMO_USER_ID || 'admin';
  const demoPassword = process.env.DEMO_USER_PASSWORD || 'password';

  if (id === demoId && password === demoPassword) {
    return {
      id: demoId,
      displayName: 'Demo User',
      roles: ['admin'],
    };
  }

  return null;
};

const login = (req, res) => {
  const id = typeof req.body?.id === 'string' ? req.body.id.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!id || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  if (hasValidSession(req.session)) {
    return res.status(200).json({
      message: 'Session still valid',
      user: req.session.user,
    });
  }

  const user = findDemoUser(id, password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  startSession(req.session, user);

  return res.status(200).json({
    message: 'Authenticated',
    user,
  });
};

const checkSession = (req, res) => {
  if (!hasValidSession(req.session)) {
    return res.status(401).json({ loggedIn: false });
  }

  return res.status(200).json({
    loggedIn: true,
    user: req.session.user,
  });
};

const logout = (req, res) => {
  const cookieName = req.sessionOptions?.name;
  req.session = null;

  if (cookieName) {
    res.clearCookie(cookieName);
  }

  return res.status(200).json({ success: true });
};

module.exports = {
  login,
  checkSession,
  logout,
};
