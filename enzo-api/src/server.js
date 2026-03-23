require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

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

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(cors({ origin: '*', credentials: true }));

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

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

async function start() {
  try {
    await initDatabase();
    initMail();
    app.listen(PORT, '127.0.0.1', () => {
      console.log('Da Enzo API auf Port ' + PORT);
    });
  } catch (err) {
    console.error('Start fehlgeschlagen:', err);
    process.exit(1);
  }
}

start();
