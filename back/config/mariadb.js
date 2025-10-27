// MariaDB connection pool shared across the backend services.
const mariadb = require('mariadb');

const {
  DB_HOST = 'localhost',
  DB_PORT = '3307',
  DB_USER = 'root',
  DB_PASSWORD = 'root',
  DB_NAME = 'autofournisseur',
  DB_CONNECTION_LIMIT = '5',
  DB_IDLE_TIMEOUT_MS = '60000',
  DB_CONNECT_TIMEOUT_MS = '10000',
  DB_ALLOW_PUBLIC_KEY_RETRIEVAL = 'false',
  DB_SSL = 'false',
} = process.env;

const pool = mariadb.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  connectionLimit: Number(DB_CONNECTION_LIMIT) || 5,
  idleTimeout: Number(DB_IDLE_TIMEOUT_MS) || 60000,
  connectTimeout: Number(DB_CONNECT_TIMEOUT_MS) || 10000,
  rowsAsArray: false,
  namedPlaceholders: true,
  allowPublicKeyRetrieval:
    typeof DB_ALLOW_PUBLIC_KEY_RETRIEVAL === 'string'
      ? DB_ALLOW_PUBLIC_KEY_RETRIEVAL.toLowerCase() === 'true'
      : false,
  ssl:
    typeof DB_SSL === 'string' && DB_SSL.toLowerCase() === 'true'
      ? { rejectUnauthorized: false }
      : undefined,
});

const getConnection = async () => {
  return pool.getConnection();
};

const query = async (sql, params = {}) => {
  let connection;

  try {
    connection = await getConnection();
    return await connection.query(sql, params);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const testConnection = async () => {
  const conn = await getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
};

const closePool = async () => {
  await pool.end();
};

process.on('SIGINT', async () => {
  try {
    await closePool();
  } finally {
    process.exit(0);
  }
});

module.exports = {
  pool,
  getConnection,
  query,
  closePool,
  testConnection,
};
