require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { initDatabase } = require('./db/init');
const authRoutes = require('./routes/auth');
const dishRoutes = require('./routes/dishes');
const ingredientRoutes = require('./routes/ingredients');
const menuRoutes = require('./routes/menu');
const weeklyMenuRoutes = require('./routes/weeklyMenu');
const settingsRoutes = require('./routes/settings');
const exportRoutes = require('./routes/export');
const reservationRoutes = require('./routes/reservations');
const customerRoutes = require('./routes/customers');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '5mb' }));

// CORS
const origins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: origins.length > 0 ? origins : '*',
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte warte einen Moment.' },
});
app.use('/api/', limiter);

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

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Statisches Admin-Frontend (React Build)
app.use(express.static(path.join(__dirname, '../public')));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// ═══════════════════════════════════════════
// ERROR HANDLER
// ═══════════════════════════════════════════

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Ein Fehler ist aufgetreten.'
      : err.message,
  });
});

// ═══════════════════════════════════════════
// START
// ═══════════════════════════════════════════

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`\n🍝 Da Enzo API läuft auf Port ${PORT}`);
      console.log(`   Umgebung: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Health:   http://127.0.0.1:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error('Server konnte nicht gestartet werden:', err);
    process.exit(1);
  }
}

start();
