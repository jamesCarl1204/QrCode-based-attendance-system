require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

const missing = ['DB_HOST', 'DB_USER', 'DB_NAME'].filter((k) => !process.env[k]);
if (missing.length) console.warn(`[env] Missing environment variables: ${missing.join(', ')}`);
if (isProd && !process.env.SESSION_SECRET) {
  console.warn('[env] SESSION_SECRET is not set. Set it on Render before going live!');
}

module.exports = {
  isProd,
  PORT: process.env.PORT || 3000,
  SESSION_SECRET: process.env.SESSION_SECRET || 'change-this-secret-in-production',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true',
  },
};
