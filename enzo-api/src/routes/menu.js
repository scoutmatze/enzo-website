const express = require('express');
const { getDb, logAudit } = require('../db/init');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/menu – Komplette Speisekarte mit Kategorien und Gerichten
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const categories = db.prepare(`
    SELECT * FROM menu_categories WHERE is_active = 1 ORDER BY sort_order, name
  `).all();

  for (const cat of categories) {
    cat.items = db.prepare(`
      SELECT mi.id, mi.price, mi.sort_order, mi.is_active,
        d.name, d.description, d.name_it, d.is_vegetarian, d.is_vegan,
        COALESCE(das.allergens, '') AS allergens
      FROM menu_items mi
      JOIN dishes d ON mi.dish_id = d.id
      LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
      WHERE mi.category_id = ? AND mi.is_active = 1
      ORDER BY mi.sort_order, d.name
    `).all(cat.id);
  }

  res.json(categories);
});

// POST /api/menu/categories – Neue Kategorie
router.post('/categories', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { name, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Name erforderlich.' });

  const db = getDb();
  const result = db.prepare('INSERT INTO menu_categories (name, sort_order) VALUES (?, ?)').run(name, sort_order || 0);
  logAudit(req.user.id, 'create', 'menu_category', result.lastInsertRowid, { name }, req.ip);
  res.status(201).json({ id: result.lastInsertRowid, name, sort_order: sort_order || 0 });
});

// PUT /api/menu/categories/:id
router.put('/categories/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { name, sort_order, is_active } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE menu_categories SET
      name = COALESCE(?, name),
      sort_order = COALESCE(?, sort_order),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(name, sort_order, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id);
  logAudit(req.user.id, 'update', 'menu_category', req.params.id, req.body, req.ip);
  res.json({ message: 'Kategorie aktualisiert.' });
});

// POST /api/menu/items – Gericht zur Speisekarte hinzufuegen
router.post('/items', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { category_id, dish_id, price, sort_order } = req.body;
  if (!category_id || !dish_id || price === undefined) {
    return res.status(400).json({ error: 'Kategorie, Gericht und Preis erforderlich.' });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO menu_items (category_id, dish_id, price, sort_order) VALUES (?, ?, ?, ?)
  `).run(category_id, dish_id, price, sort_order || 0);

  logAudit(req.user.id, 'create', 'menu_item', result.lastInsertRowid, { category_id, dish_id, price }, req.ip);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Gericht zur Karte hinzugefügt.' });
});

// PUT /api/menu/items/:id
router.put('/items/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { price, sort_order, is_active } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE menu_items SET
      price = COALESCE(?, price),
      sort_order = COALESCE(?, sort_order),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(price, sort_order, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id);
  logAudit(req.user.id, 'update', 'menu_item', req.params.id, req.body, req.ip);
  res.json({ message: 'Menüeintrag aktualisiert.' });
});

// DELETE /api/menu/items/:id
router.delete('/items/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
  logAudit(req.user.id, 'delete', 'menu_item', req.params.id, null, req.ip);
  res.json({ message: 'Von der Karte entfernt.' });
});

module.exports = router;
