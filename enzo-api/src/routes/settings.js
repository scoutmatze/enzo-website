const express = require('express');
const { getDb, logAudit } = require('../db/init');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value, updated_at FROM settings').all();
  const settings = {};
  for (const row of rows) {
    try { settings[row.key] = JSON.parse(row.value); }
    catch { settings[row.key] = row.value; }
  }
  res.json(settings);
});

// PUT /api/settings
router.put('/', authenticate, requireRole('inhaber', 'admin'), (req, res) => {
  const db = getDb();
  const update = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES (?, ?, CURRENT_TIMESTAMP, ?)');

  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(req.body)) {
      const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
      update.run(key, val, req.user.id);
    }
  });

  tx();
  logAudit(req.user.id, 'update', 'settings', null, req.body, req.ip);
  res.json({ message: 'Einstellungen gespeichert.' });
});

module.exports = router;
