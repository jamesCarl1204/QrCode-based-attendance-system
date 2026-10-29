const cors = require('cors');
const { allowedOrigins } = require('./env');

module.exports = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`CORS: blocked request from origin ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
});
