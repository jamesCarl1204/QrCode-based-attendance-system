const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  timezone: '+08:00',
  ssl: env.db.ssl ? { rejectUnauthorized: true } : undefined,
});

pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+08:00'");
});

// Returns the first row or null
async function queryOne(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

// Runs fn(conn) inside a transaction (auto commit / rollback)
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, queryOne, withTransaction };
