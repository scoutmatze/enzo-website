const express = require('express');
const { getDb, logAudit } = require('../db/init');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/weekly-menu – Aktuelle und kommende Wochenkarten
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const menus = db.prepare(`
    SELECT wm.*, u.display_name AS created_by_name
    FROM weekly_menu wm
    LEFT JOIN users u ON wm.created_by = u.id
    ORDER BY wm.week_start DESC
    LIMIT 10
  `).all();

  for (const menu of menus) {
    menu.items = db.prepare(`
      SELECT wmi.*, d.name AS dish_name, d.description AS dish_description,
        COALESCE(das.allergens, '') AS allergens
      FROM weekly_menu_items wmi
      JOIN dishes d ON wmi.dish_id = d.id
      LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
      WHERE wmi.weekly_menu_id = ?
      ORDER BY wmi.day_of_week, wmi.sort_order
    `).all(menu.id);
  }

  res.json(menus);
});

// GET /api/weekly-menu/current – Aktuelle publizierte Wochenkarte
router.get('/current', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const menu = db.prepare(`
    SELECT * FROM weekly_menu
    WHERE is_published = 1 AND week_start <= ?
    ORDER BY week_start DESC LIMIT 1
  `).get(today);

  if (!menu) return res.json(null);

  menu.items = db.prepare(`
    SELECT wmi.*, d.name AS dish_name, d.description AS dish_description,
      COALESCE(das.allergens, '') AS allergens
    FROM weekly_menu_items wmi
    JOIN dishes d ON wmi.dish_id = d.id
    LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
    WHERE wmi.weekly_menu_id = ?
    ORDER BY wmi.day_of_week, wmi.sort_order
  `).all(menu.id);

  res.json(menu);
});

// POST /api/weekly-menu – Neue Wochenkarte
router.post('/', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { week_start, mode, note, items } = req.body;

  if (!week_start || !mode) {
    return res.status(400).json({ error: 'Wochenstart und Modus erforderlich.' });
  }
  if (!['daily', 'weekly'].includes(mode)) {
    return res.status(400).json({ error: 'Modus muss "daily" oder "weekly" sein.' });
  }

  const db = getDb();

  const create = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO weekly_menu (week_start, mode, note, created_by)
      VALUES (?, ?, ?, ?)
    `).run(week_start, mode, note || null, req.user.id);

    const menuId = result.lastInsertRowid;

    if (items && items.length > 0) {
      const insertItem = db.prepare(`
        INSERT INTO weekly_menu_items (weekly_menu_id, dish_id, day_of_week, price, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const item of items) {
        insertItem.run(menuId, item.dish_id, item.day_of_week || null, item.price, item.sort_order || 0);
      }
    }

    return menuId;
  });

  const menuId = create();
  logAudit(req.user.id, 'create', 'weekly_menu', menuId, { week_start, mode }, req.ip);
  res.status(201).json({ id: menuId, message: 'Wochenkarte erstellt.' });
});

// PUT /api/weekly-menu/:id – Wochenkarte bearbeiten
router.put('/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { note, items, is_published } = req.body;
  const db = getDb();

  const update = db.transaction(() => {
    if (note !== undefined || is_published !== undefined) {
      db.prepare(`
        UPDATE weekly_menu SET
          note = COALESCE(?, note),
          is_published = COALESCE(?, is_published),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(note, is_published !== undefined ? (is_published ? 1 : 0) : null, req.params.id);
    }

    if (items !== undefined) {
      db.prepare('DELETE FROM weekly_menu_items WHERE weekly_menu_id = ?').run(req.params.id);
      const insertItem = db.prepare(`
        INSERT INTO weekly_menu_items (weekly_menu_id, dish_id, day_of_week, price, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const item of items) {
        insertItem.run(req.params.id, item.dish_id, item.day_of_week || null, item.price, item.sort_order || 0);
      }
    }
  });

  update();
  logAudit(req.user.id, 'update', 'weekly_menu', req.params.id, req.body, req.ip);
  res.json({ message: 'Wochenkarte aktualisiert.' });
});

// POST /api/weekly-menu/:id/publish – Wochenkarte veroeffentlichen + JSON exportieren
router.post('/:id/publish', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE weekly_menu SET is_published = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  logAudit(req.user.id, 'update', 'weekly_menu', req.params.id, { action: 'published' }, req.ip);

  // JSON fuer Website generieren
  const { exportWochenkarte } = require('./export');
  try {
    exportWochenkarte();
    res.json({ message: 'Wochenkarte veröffentlicht und Website aktualisiert.' });
  } catch (err) {
    res.json({ message: 'Wochenkarte veröffentlicht. Website-Export fehlgeschlagen: ' + err.message });
  }
});

module.exports = router;
