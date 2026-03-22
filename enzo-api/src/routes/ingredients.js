const express = require('express');
const { getDb, logAudit } = require('../db/init');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/ingredients – Alle Zutaten mit ihren Allergenen
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const ingredients = db.prepare(`
    SELECT i.id, i.name,
      COALESCE(GROUP_CONCAT(ia.allergen_id, ', '), '') AS allergens
    FROM ingredients i
    LEFT JOIN ingredient_allergens ia ON i.id = ia.ingredient_id
    GROUP BY i.id
    ORDER BY i.name
  `).all();
  res.json(ingredients);
});

// GET /api/ingredients/allergens – Alle verfuegbaren Allergene
router.get('/allergens', authenticate, (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM allergens ORDER BY id').all());
});

// POST /api/ingredients – Neue Zutat mit Allergenen
router.post('/', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { name, allergen_ids } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist Pflichtfeld.' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM ingredients WHERE name = ?').get(name.trim());
  if (existing) return res.status(409).json({ error: 'Zutat existiert bereits.', id: existing.id });

  const create = db.transaction(() => {
    const result = db.prepare('INSERT INTO ingredients (name) VALUES (?)').run(name.trim());
    const id = result.lastInsertRowid;

    if (allergen_ids && allergen_ids.length > 0) {
      const insert = db.prepare('INSERT INTO ingredient_allergens (ingredient_id, allergen_id) VALUES (?, ?)');
      for (const aid of allergen_ids) insert.run(id, aid);
    }
    return id;
  });

  const id = create();
  logAudit(req.user.id, 'create', 'ingredient', id, { name, allergen_ids }, req.ip);
  res.status(201).json({ id, name: name.trim(), allergens: (allergen_ids || []).join(', ') });
});

// PUT /api/ingredients/:id – Zutat + Allergene aktualisieren
router.put('/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { name, allergen_ids } = req.body;
  const db = getDb();

  const update = db.transaction(() => {
    if (name) {
      db.prepare('UPDATE ingredients SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
    }
    if (allergen_ids !== undefined) {
      db.prepare('DELETE FROM ingredient_allergens WHERE ingredient_id = ?').run(req.params.id);
      if (allergen_ids.length > 0) {
        const insert = db.prepare('INSERT INTO ingredient_allergens (ingredient_id, allergen_id) VALUES (?, ?)');
        for (const aid of allergen_ids) insert.run(req.params.id, aid);
      }
    }
  });

  update();
  logAudit(req.user.id, 'update', 'ingredient', req.params.id, req.body, req.ip);
  res.json({ message: 'Zutat aktualisiert.' });
});

module.exports = router;
