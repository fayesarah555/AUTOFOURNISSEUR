require('dotenv').config();
const express = require('express');
const session = require('cookie-session');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();

const PORT = Number(process.env.PORT) || 8080;
const SESSION_NAME = process.env.SESSION_NAME || 'session';
const SESSION_COOKIE_SECURE =
  typeof process.env.SESSION_COOKIE_SECURE === 'string'
    ? process.env.SESSION_COOKIE_SECURE.toLowerCase() === 'true'
    : process.env.NODE_ENV === 'production';
const SESSION_SAME_SITE = process.env.SESSION_SAME_SITE || 'lax';
const SESSION_MAX_AGE_MS = Number(process.env.SESSION_MAX_AGE_MS || 4 * 60 * 60 * 1000);
const SECRET_KEY = process.env.SECRET_KEY || 'change-me';

const DEFAULT_ORIGINS = ['http://localhost:3002'];
const parseOrigins = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? parseOrigins(process.env.CLIENT_ORIGIN)
  : DEFAULT_ORIGINS;

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: SESSION_NAME,
    secret: SECRET_KEY,
    httpOnly: true,
    secure: SESSION_COOKIE_SECURE,
    sameSite: SESSION_SAME_SITE,
    maxAge: SESSION_MAX_AGE_MS,
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.listen(PORT, () => {
  console.log(`Boilerplate API listening on http://localhost:${PORT}`);
});
