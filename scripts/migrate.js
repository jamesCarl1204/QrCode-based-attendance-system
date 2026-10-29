// One-time script: hashes any plain-text passwords still in the DB.
// Run: npm run migrate
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'logdb',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  });

  for (const table of ['students', 'teachers']) {
    const [rows] = await pool.query(`SELECT id, password FROM ${table}`);
    for (const r of rows) {
      if (r.password.startsWith('$2')) continue;
      const hash = await bcrypt.hash(r.password, 10);
      await pool.query(`UPDATE ${table} SET password = ? WHERE id = ?`, [hash, r.id]);
    }
    console.log(`${table}: done`);
  }
  process.exit();
})();
