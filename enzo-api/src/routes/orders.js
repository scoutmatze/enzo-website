const express = require('express');
const { getDb, logAudit } = require('../db/init');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// PUBLIC: Ist das Bestellsystem aktiv?
router.get('/public/status', (req, res) => {
  try {
    const db = getDb();
    const enabled = db.prepare("SELECT value FROM settings WHERE key = 'orders_enabled'").get()?.value === 'true';
    const notice = db.prepare("SELECT value FROM settings WHERE key = 'orders_notice'").get()?.value || '';
    let menu = [], extras = [];
    if (enabled) {
      menu = db.prepare(`
        SELECT d.id, d.name, d.description, d.base_price, d.category,
          COALESCE(das.allergens, '') as allergens
        FROM dishes d
        LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
        WHERE d.is_active = 1 AND d.is_orderable = 1
        ORDER BY d.category, d.name
      `).all();
      extras = db.prepare('SELECT * FROM order_extras WHERE is_active = 1 ORDER BY sort_order, name').all();
    }
    res.json({ enabled, notice, menu, extras });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/orders/public/place – Öffentliche Bestellung (Website)
router.post('/public/place', (req, res) => {
  try {
    const db = getDb();
    const enabled = db.prepare("SELECT value FROM settings WHERE key = 'orders_enabled'").get()?.value === 'true';
    if (!enabled) return res.status(403).json({ error: 'Bestellungen sind aktuell nicht möglich.' });

    const { guest_name, guest_phone, items, pickup_time, notes } = req.body;
    if (!guest_name || !guest_phone || !items || items.length === 0) {
      return res.status(400).json({ error: 'Name, Telefon und mindestens ein Gericht erforderlich.' });
    }
    // Honeypot
    if (req.body.website) return res.json({ status: 'ok', message: 'Bestellung empfangen.' });

    let total = 0;
    const result = db.prepare("INSERT INTO orders (guest_name, guest_phone, order_type, pickup_time, notes) VALUES (?, ?, 'pickup', ?, ?)").run(guest_name, guest_phone, pickup_time || null, notes || null);
    const orderId = result.lastInsertRowid;

    const ins = db.prepare('INSERT INTO order_items (order_id, dish_id, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?)');
    for (const item of items) {
      const dish = db.prepare('SELECT base_price FROM dishes WHERE id = ?').get(item.dish_id);
      const price = dish?.base_price || 0;
      ins.run(orderId, item.dish_id, item.quantity || 1, price, item.notes || null);
      total += price * (item.quantity || 1);
    }
    db.prepare('UPDATE orders SET total = ? WHERE id = ?').run(total, orderId);

    res.json({ status: 'ok', id: orderId, total, message: 'Bestellung empfangen! Wir rufen Sie an wenn sie abholbereit ist.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { status, date } = req.query;
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (date) { sql += " AND date(created_at) = ?"; params.push(date); }
    sql += ' ORDER BY created_at DESC LIMIT 50';
    const orders = db.prepare(sql).all(...params);
    for (const o of orders) {
      o.items = db.prepare('SELECT oi.*, d.name as dish_name FROM order_items oi JOIN dishes d ON oi.dish_id = d.id WHERE oi.order_id = ?').all(o.id);
    }
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/active – Offene Bestellungen
router.get('/active', authenticate, (req, res) => {
  try {
    const db = getDb();
    const orders = db.prepare("SELECT * FROM orders WHERE status IN ('new','confirmed','preparing','ready') ORDER BY created_at ASC").all();
    for (const o of orders) {
      o.items = db.prepare('SELECT oi.*, d.name as dish_name FROM order_items oi JOIN dishes d ON oi.dish_id = d.id WHERE oi.order_id = ?').all(o.id);
    }
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/orders
router.post('/', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    const { guest_name, guest_phone, order_type, pickup_time, items, notes } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Mindestens ein Gericht erforderlich.' });

    const db = getDb();
    const create = db.transaction(() => {
      let total = 0;
      const result = db.prepare('INSERT INTO orders (guest_name, guest_phone, order_type, pickup_time, notes) VALUES (?, ?, ?, ?, ?)').run(guest_name || 'Gast', guest_phone || null, order_type || 'pickup', pickup_time || null, notes || null);
      const orderId = result.lastInsertRowid;

      const ins = db.prepare('INSERT INTO order_items (order_id, dish_id, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?)');
      for (const item of items) {
        const dish = db.prepare('SELECT base_price FROM dishes WHERE id = ?').get(item.dish_id);
        const price = item.unit_price || dish?.base_price || 0;
        ins.run(orderId, item.dish_id, item.quantity || 1, price, item.notes || null);
        total += price * (item.quantity || 1);
      }

      db.prepare('UPDATE orders SET total = ? WHERE id = ?').run(total, orderId);
      return { orderId, total };
    });

    const r = create();
    logAudit(req.user.id, 'create', 'order', r.orderId, { total: r.total }, req.ip);
    res.status(201).json({ id: r.orderId, total: r.total, message: 'Bestellung aufgenommen.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/orders/:id/status
router.put('/:id/status', authenticate, (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Ungültiger Status.' });
    const db = getDb();
    db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
    logAudit(req.user.id, 'update', 'order', req.params.id, { status }, req.ip);
    res.json({ message: 'Status aktualisiert.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════
// BESTELLKARTE (Admin)
// ═══════════════════════════════════════════

// GET /api/orders/menu – Alle bestellbaren Gerichte
router.get('/menu', authenticate, (req, res) => {
  try {
    const db = getDb();
    const dishes = db.prepare(`
      SELECT d.*, COALESCE(das.allergens, '') as allergens
      FROM dishes d
      LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
      WHERE d.is_active = 1
      ORDER BY d.is_orderable DESC, d.category, d.name
    `).all();
    res.json(dishes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/orders/menu/:dishId/toggle – Bestellbar ein/aus
router.put('/menu/:dishId/toggle', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    const db = getDb();
    const dish = db.prepare('SELECT is_orderable FROM dishes WHERE id = ?').get(req.params.dishId);
    if (!dish) return res.status(404).json({ error: 'Gericht nicht gefunden.' });
    const newVal = dish.is_orderable ? 0 : 1;
    db.prepare('UPDATE dishes SET is_orderable = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newVal, req.params.dishId);
    logAudit(req.user.id, 'update', 'dish', req.params.dishId, { is_orderable: newVal }, req.ip);
    res.json({ is_orderable: newVal, message: newVal ? 'Gericht ist jetzt bestellbar.' : 'Gericht nicht mehr bestellbar.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/extras
router.get('/extras', authenticate, (req, res) => {
  try { res.json(getDb().prepare('SELECT * FROM order_extras ORDER BY sort_order, name').all()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/orders/extras
router.post('/extras', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    const { name, price, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Name erforderlich.' });
    const result = getDb().prepare('INSERT INTO order_extras (name, price, sort_order) VALUES (?, ?, ?)').run(name, price || 0, sort_order || 0);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Extra erstellt.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/orders/extras/:id
router.delete('/extras/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    getDb().prepare('DELETE FROM order_extras WHERE id = ?').run(req.params.id);
    res.json({ message: 'Extra gelöscht.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/:id (MUSS am Ende stehen wegen /:id)
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Nicht gefunden.' });
    order.items = db.prepare('SELECT oi.*, d.name as dish_name FROM order_items oi JOIN dishes d ON oi.dish_id = d.id WHERE oi.order_id = ?').all(req.params.id);
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
