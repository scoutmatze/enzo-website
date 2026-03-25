require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { initDatabase } = require('./db/init');
const { initMail } = require('./utils/email');
const authRoutes = require('./routes/auth');
const dishRoutes = require('./routes/dishes');
const ingredientRoutes = require('./routes/ingredients');
const menuRoutes = require('./routes/menu');
const weeklyMenuRoutes = require('./routes/weeklyMenu');
const settingsRoutes = require('./routes/settings');
const exportRoutes = require('./routes/export');
const reservationRoutes = require('./routes/reservations');
const customerRoutes = require('./routes/customers');
const invoiceRoutes = require('./routes/invoices');
const orderRoutes = require('./routes/orders');
const shiftRoutes = require('./routes/shifts');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ═══════════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════════

// Helmet mit CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Sonst blockiert es Bilder
}));

// Request-Logging (Production: kurz, Dev: verbose)
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

// Body Parser mit Größenlimit
app.use(express.json({ limit: '1mb' }));

// CORS – nur eigene Domains erlauben
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Requests ohne Origin (z.B. curl, Server-to-Server) erlauben
    if (!origin) return callback(null, true);
    // In Entwicklung alles erlauben wenn keine Origins konfiguriert
    if (ALLOWED_ORIGINS.length === 0 && !IS_PROD) return callback(null, true);
    // In Production: nur konfigurierte Origins
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // IP-basierter Zugriff während Domain-Transfer
    if (origin.includes('88.99.171.196')) return callback(null, true);
    callback(new Error('CORS nicht erlaubt'));
  },
  credentials: true,
}));

// Globales Rate-Limiting: 200 Requests / 15min pro IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte warte einen Moment.' },
});
app.use('/api/', globalLimiter);

// Strenges Rate-Limiting für Login: 5 Versuche / 15min
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Login-Versuche. Bitte warte 15 Minuten.' },
  keyGenerator: (req) => req.ip,
});
app.use('/api/auth/login', loginLimiter);

// Rate-Limiting für öffentliche Formulare: 10 / 15min
const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Zu viele Anfragen. Bitte versuche es später.' },
});
app.use('/api/reservations/public/book', publicFormLimiter);
app.use('/api/orders/public/place', publicFormLimiter);

// ═══════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════

app.use('/api/auth', authRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/weekly-menu', weeklyMenuRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shifts', shiftRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════
// ERROR HANDLER (kein Stack-Trace in Production)
// ═══════════════════════════════════════════

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message, IS_PROD ? '' : err.stack);
  res.status(err.status || 500).json({
    error: IS_PROD ? 'Ein Fehler ist aufgetreten.' : err.message,
  });
});

// ═══════════════════════════════════════════
// START
// ═══════════════════════════════════════════

async function start() {
  try {
    await initDatabase();
    initMail();
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`Da Enzo API auf Port ${PORT} [${IS_PROD ? 'PRODUCTION' : 'dev'}]`);
    });
  } catch (err) {
    console.error('Start fehlgeschlagen:', err);
    process.exit(1);
  }
}

start();
