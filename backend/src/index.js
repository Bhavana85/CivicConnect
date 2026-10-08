const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Catch startup errors
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
});

let helmet;
try { helmet = require('helmet'); } catch (e) { console.warn('helmet not loaded'); }

const reportsRouter = require('./routes/reports');
const budgetRouter  = require('./routes/budget');
const authRouter    = require('./routes/auth');
const forumRouter   = require('./routes/forum');
const alertsRouter  = require('./routes/alerts');
const analyticsRouter = require('./routes/analytics');
const notificationsRouter = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & Middleware ────────────────────────────────────────────────────
if (helmet) app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const db = require('./models/db');
  res.json({
    status: 'ok',
    mode: db.isInMemory ? 'in-memory' : 'postgresql',
    service: 'CivicConnect API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/reports', reportsRouter);
app.use('/api/budget',  budgetRouter);
app.use('/api/auth',    authRouter);
app.use('/api/forum',   forumRouter);
app.use('/api/alerts',  alertsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/notifications', notificationsRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Express error:', err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏛️  CivicConnect API running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health\n`);
});

module.exports = app;

