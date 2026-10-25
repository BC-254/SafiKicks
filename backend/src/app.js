'use strict';
/**
 * app.js — Express application entry point.
 * Wires all middleware, routes, and starts the server.
 */

const path        = require('path');
const fs          = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');

const env            = require('./config/env');
const logger         = require('./utils/logger');
const errorHandler   = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');

// ── Route imports (added incrementally as routes are built) ──
const authRoutes         = require('./routes/auth.routes');
const ownerRoutes        = require('./routes/owner.routes');
const catalogRoutes      = require('./routes/catalog.routes');
const registrationRoutes = require('./routes/registration.routes');
const receiptRoutes      = require('./routes/receipt.routes');
const repairerRoutes     = require('./routes/repairer.routes');
const pricingRoutes      = require('./routes/pricing.routes');
const paymentRoutes      = require('./routes/payment.routes');
const pickupRoutes       = require('./routes/pickup.routes');
// const auditRoutes        = require('./routes/audit.routes');

const app = express();

// ── Security headers ─────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow image serving
  contentSecurityPolicy: false,
}));

// ── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Trust proxy (for rate limiting behind nginx/load balancer) ─
app.set('trust proxy', 1);

// ── HTTPS redirect (in production behind proxy - SEC-06) ──────
if (env.IS_PROD) {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// ── HTTP logging ─────────────────────────────────────────────
if (!env.IS_PROD) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Global rate limit ─────────────────────────────────────────
app.use('/api', globalLimiter);

// ── Health check (no auth, no rate limit) ────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV, ts: new Date().toISOString() });
});

// ── Static file serving for uploaded photos ───────────────────
// Photos served at /uploads/:filename; actual auth check is route-level
app.use('/uploads', express.static(env.UPLOAD_DIR));

// ── API Routes ────────────────────────────────────────────────
// Uncomment each route as the corresponding milestone is completed:
app.use('/api/auth',         authRoutes);
app.use('/api/owner',        ownerRoutes);
app.use('/api/catalog',      catalogRoutes);
app.use('/api/register',     registrationRoutes);
app.use('/api',              registrationRoutes); // provides /api/job/:token
app.use('/api/receipt',      receiptRoutes);
app.use('/api/repairer',     repairerRoutes);
app.use('/api/job',          pricingRoutes);
app.use('/api/counter',      paymentRoutes);
app.use('/api/owner',        paymentRoutes);
app.use('/api/pickup',       pickupRoutes);
// app.use('/api/audit',        auditRoutes);

// ── Serve React SPA in production if built ─────────────────────
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/health')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──────────────────────────────────────
app.use(errorHandler);

// ── Start server (only if executed directly, not when required by tests) ─
if (require.main === module) {
  const server = app.listen(env.PORT, () => {
    logger.info(`Server started`, {
      port: env.PORT,
      env: env.NODE_ENV,
      url: `http://localhost:${env.PORT}`,
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received — shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});

module.exports = app;
