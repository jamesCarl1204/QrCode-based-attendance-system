const express = require('express');
const path = require('path');

const corsMiddleware = require('./config/cors');
const sessionMiddleware = require('./config/session');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 2); // Render + Vercel proxy chain (needed for secure cookies / rate limit IPs)

app.use(corsMiddleware);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.json({ success: true, message: 'QR Code Attendance API is running' });
});

app.get('/health', (req, res) => res.json({ ok: true })); // handy for Render health checks

app.use(sessionMiddleware);
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
