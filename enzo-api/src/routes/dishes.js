const express = require('express');
const { getDb, logAudit } = require('../db/init');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/dishes – Alle Gerichte (Kochbuch)
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { category, active, search } = req.query;

  let sql = `
    SELECT d.*,
      COALESCE(das.allergens, '') AS allergens
    FROM dishes d
    LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
    WHERE 1=1
  `;
  const params = [];

  if (category) { sql += ' AND d.category = ?'; params.push(category); }
  if (active !== undefined) { sql += ' AND d.is_active = ?'; params.push(active === 'true' ? 1 : 0); }
  if (search) { sql += ' AND (d.name LIKE ? OR d.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  sql += ' ORDER BY d.category, d.name';
  const dishes = db.prepare(sql).all(...params);
  res.json(dishes);
});

// GET /api/dishes/categories – Verfuegbare Kategorien
router.get('/categories', authenticate, (req, res) => {
  res.json([
    { id: 'antipasti', name: 'Antipasti' },
    { id: 'primi', name: 'Primi Piatti' },
    { id: 'pinse', name: 'Pinse' },
    { id: 'secondi', name: 'Secondi Piatti' },
    { id: 'dolci', name: 'Dessert' },
    { id: 'caffe', name: 'Illy Cafè' },
    { id: 'tee', name: 'Tee & Schokolade' },
    { id: 'alkoholfrei', name: 'Alkoholfreie Getränke' },
    { id: 'bier', name: 'Bier' },
    { id: 'aperitivi', name: 'Aperitivi & Longdrinks' },
    { id: 'wein', name: 'Wein' },
    { id: 'sonstiges', name: 'Sonstiges' },
  ]);
});

// GET /api/dishes/:id – Einzelnes Gericht mit Zutaten und Allergenen
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const dish = db.prepare(`
    SELECT d.*, COALESCE(das.allergens, '') AS allergens
    FROM dishes d
    LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
    WHERE d.id = ?
  `).get(req.params.id);

  if (!dish) return res.status(404).json({ error: 'Gericht nicht gefunden.' });

  // Zutaten laden
  dish.ingredients = db.prepare(`
    SELECT i.id, i.name,
      GROUP_CONCAT(ia.allergen_id, ', ') AS allergens
    FROM dish_ingredients di
    JOIN ingredients i ON di.ingredient_id = i.id
    LEFT JOIN ingredient_allergens ia ON i.id = ia.ingredient_id
    WHERE di.dish_id = ?
    GROUP BY i.id
    ORDER BY i.name
  `).all(req.params.id);

  res.json(dish);
});

// POST /api/dishes – Neues Gericht
router.post('/', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { name, description, name_it, category, base_price, is_vegetarian, is_vegan, notes, ingredient_ids } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Name und Kategorie sind Pflichtfelder.' });
  }

  const db = getDb();

  const insertDish = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO dishes (name, description, name_it, category, base_price, is_vegetarian, is_vegan, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, description || null, name_it || null, category, base_price || null, is_vegetarian ? 1 : 0, is_vegan ? 1 : 0, notes || null);

    const dishId = result.lastInsertRowid;

    // Zutaten verknuepfen
    if (ingredient_ids && ingredient_ids.length > 0) {
      const insertIngredient = db.prepare('INSERT INTO dish_ingredients (dish_id, ingredient_id) VALUES (?, ?)');
      for (const ingId of ingredient_ids) {
        insertIngredient.run(dishId, ingId);
      }
    }

    return dishId;
  });

  const dishId = insertDish();
  logAudit(req.user.id, 'create', 'dish', dishId, { name, category }, req.ip);

  // Gericht mit berechneten Allergenen zurueckgeben
  const dish = db.prepare(`
    SELECT d.*, COALESCE(das.allergens, '') AS allergens
    FROM dishes d
    LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
    WHERE d.id = ?
  `).get(dishId);

  res.status(201).json(dish);
});

// PUT /api/dishes/:id – Gericht bearbeiten
router.put('/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { name, description, name_it, category, base_price, is_vegetarian, is_vegan, is_active, notes, ingredient_ids } = req.body;

  const db = getDb();
  const existing = db.prepare('SELECT id FROM dishes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Gericht nicht gefunden.' });

  const updateDish = db.transaction(() => {
    db.prepare(`
      UPDATE dishes SET
        name = COALESCE(?, name),
        description = ?,
        name_it = ?,
        category = COALESCE(?, category),
        base_price = ?,
        is_vegetarian = COALESCE(?, is_vegetarian),
        is_vegan = COALESCE(?, is_vegan),
        is_active = COALESCE(?, is_active),
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, description, name_it, category, base_price, is_vegetarian !== undefined ? (is_vegetarian ? 1 : 0) : null, is_vegan !== undefined ? (is_vegan ? 1 : 0) : null, is_active !== undefined ? (is_active ? 1 : 0) : null, notes, req.params.id);

    // Zutaten aktualisieren (falls mitgeschickt)
    if (ingredient_ids !== undefined) {
      db.prepare('DELETE FROM dish_ingredients WHERE dish_id = ?').run(req.params.id);
      if (ingredient_ids.length > 0) {
        const insertIngredient = db.prepare('INSERT INTO dish_ingredients (dish_id, ingredient_id) VALUES (?, ?)');
        for (const ingId of ingredient_ids) {
          insertIngredient.run(req.params.id, ingId);
        }
      }
    }
  });

  updateDish();
  logAudit(req.user.id, 'update', 'dish', req.params.id, req.body, req.ip);

  const dish = db.prepare(`
    SELECT d.*, COALESCE(das.allergens, '') AS allergens
    FROM dishes d
    LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
    WHERE d.id = ?
  `).get(req.params.id);

  res.json(dish);
});

// DELETE /api/dishes/:id – Gericht deaktivieren (nicht loeschen)
router.delete('/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE dishes SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  logAudit(req.user.id, 'delete', 'dish', req.params.id, null, req.ip);
  res.json({ message: 'Gericht deaktiviert.' });
});

module.exports = router;
