const hasValidSession = (session) => Boolean(session?.user);

const startSession = (session, user) => {
  session.user = user;
  session.createdAt = Date.now();
};

module.exports = {
  hasValidSession,
  startSession,
};
