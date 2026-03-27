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
      SELECT wmi.*,
        COALESCE(wmi.custom_name, d.name) AS dish_name,
        COALESCE(wmi.custom_description, d.description) AS dish_description,
        COALESCE(wmi.custom_allergens, das.allergens, '') AS allergens,
        d.category AS dish_category
      FROM weekly_menu_items wmi
      LEFT JOIN dishes d ON wmi.dish_id = d.id
      LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
      WHERE wmi.weekly_menu_id = ?
      ORDER BY wmi.sort_order, wmi.category, d.name
    `).all(menu.id);
  }

  res.json(menus);
});

// GET /api/weekly-menu/current – Aktuelle publizierte Wochenkarte (öffentlich)
router.get('/current', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const menu = db.prepare(`
    SELECT * FROM weekly_menu
    WHERE is_published = 1 AND week_start <= ? AND (week_end IS NULL OR week_end >= ?)
    ORDER BY week_start DESC LIMIT 1
  `).get(today, today);

  if (!menu) return res.json(null);

  menu.items = db.prepare(`
    SELECT wmi.*,
      COALESCE(wmi.custom_name, d.name) AS dish_name,
      COALESCE(wmi.custom_description, d.description) AS dish_description,
      COALESCE(wmi.custom_allergens, das.allergens, '') AS allergens,
      d.category AS dish_category
    FROM weekly_menu_items wmi
    LEFT JOIN dishes d ON wmi.dish_id = d.id
    LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
    WHERE wmi.weekly_menu_id = ?
    ORDER BY wmi.sort_order, wmi.category, d.name
  `).all(menu.id);

  res.json(menu);
});

// GET /api/weekly-menu/categories – Verfügbare Kategorien
router.get('/categories', authenticate, (req, res) => {
  const db = getDb();
  const cats = db.prepare('SELECT DISTINCT category FROM dishes WHERE is_active = 1 ORDER BY category').all();
  res.json(cats.map(c => c.category));
});

// POST /api/weekly-menu – Neue Wochenkarte
router.post('/', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { week_start, week_end, note, items } = req.body;

  if (!week_start) {
    return res.status(400).json({ error: 'Startdatum erforderlich.' });
  }

  // Default: 2 Wochen ab Start
  const endDate = week_end || (() => {
    const d = new Date(week_start);
    d.setDate(d.getDate() + 13); // 2 Wochen
    return d.toISOString().split('T')[0];
  })();

  const db = getDb();

  const create = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO weekly_menu (week_start, week_end, mode, note, created_by)
      VALUES (?, ?, 'category', ?, ?)
    `).run(week_start, endDate, note || null, req.user.id);

    const menuId = result.lastInsertRowid;

    if (items && items.length > 0) {
      const insertItem = db.prepare(`
        INSERT INTO weekly_menu_items (weekly_menu_id, dish_id, category, price, sort_order, custom_name, custom_description, custom_allergens)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      let sortIdx = 0;
      for (const item of items) {
        insertItem.run(
          menuId,
          item.dish_id || null,
          item.category || null,
          item.price || 0,
          item.sort_order || sortIdx++,
          item.custom_name || null,
          item.custom_description || null,
          item.custom_allergens || null
        );
      }
    }

    return menuId;
  });

  const menuId = create();
  logAudit(req.user.id, 'create', 'weekly_menu', menuId, { week_start, week_end: endDate }, req.ip);
  res.status(201).json({ id: menuId, message: 'Wochenkarte erstellt.' });
});

// PUT /api/weekly-menu/:id – Wochenkarte bearbeiten
router.put('/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { note, items, is_published, week_start, week_end } = req.body;
  const db = getDb();

  const update = db.transaction(() => {
    if (note !== undefined || is_published !== undefined || week_start || week_end) {
      const updates = [];
      const vals = [];
      if (note !== undefined) { updates.push('note = ?'); vals.push(note); }
      if (is_published !== undefined) { updates.push('is_published = ?'); vals.push(is_published ? 1 : 0); }
      if (week_start) { updates.push('week_start = ?'); vals.push(week_start); }
      if (week_end) { updates.push('week_end = ?'); vals.push(week_end); }
      updates.push('updated_at = CURRENT_TIMESTAMP');
      vals.push(req.params.id);
      db.prepare(`UPDATE weekly_menu SET ${updates.join(', ')} WHERE id = ?`).run(...vals);
    }

    if (items !== undefined) {
      db.prepare('DELETE FROM weekly_menu_items WHERE weekly_menu_id = ?').run(req.params.id);
      const insertItem = db.prepare(`
        INSERT INTO weekly_menu_items (weekly_menu_id, dish_id, category, price, sort_order, custom_name, custom_description, custom_allergens)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      let sortIdx = 0;
      for (const item of items) {
        insertItem.run(
          req.params.id,
          item.dish_id || null,
          item.category || null,
          item.price || 0,
          item.sort_order || sortIdx++,
          item.custom_name || null,
          item.custom_description || null,
          item.custom_allergens || null
        );
      }
    }
  });

  update();
  logAudit(req.user.id, 'update', 'weekly_menu', req.params.id, req.body, req.ip);
  res.json({ message: 'Wochenkarte aktualisiert.' });
});

// DELETE /api/weekly-menu/:id
router.delete('/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM weekly_menu WHERE id = ?').run(req.params.id);
  logAudit(req.user.id, 'delete', 'weekly_menu', req.params.id, null, req.ip);
  res.json({ message: 'Wochenkarte gelöscht.' });
});

// POST /api/weekly-menu/:id/publish
router.post('/:id/publish', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE weekly_menu SET is_published = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  logAudit(req.user.id, 'update', 'weekly_menu', req.params.id, { action: 'published' }, req.ip);

  const { exportWochenkarte } = require('./export');
  try {
    exportWochenkarte();
    res.json({ message: 'Wochenkarte veröffentlicht und Website aktualisiert.' });
  } catch (err) {
    res.json({ message: 'Wochenkarte veröffentlicht. Website-Export fehlgeschlagen: ' + err.message });
  }
});

module.exports = router;