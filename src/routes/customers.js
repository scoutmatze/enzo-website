const express = require('express');
const { getDb, logAudit } = require('../db/init');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers
router.get('/', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const db = getDb();
  const { search, business } = req.query;
  let sql = 'SELECT * FROM customers WHERE gdpr_deleted_at IS NULL';
  const params = [];

  if (search) { sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
  if (business === 'true') { sql += ' AND is_business_customer = 1'; }

  sql += ' ORDER BY name ASC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/customers/:id
router.get('/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Kunde nicht gefunden.' });

  customer.reservations = db.prepare('SELECT * FROM reservations WHERE customer_id = ? ORDER BY date DESC LIMIT 20').all(req.params.id);
  res.json(customer);
});

// POST /api/customers
router.post('/', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { name, email, phone, company, is_business_customer, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name erforderlich.' });

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO customers (name, email, phone, company, is_business_customer, notes, gdpr_consent_at, gdpr_consent_source)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'manual')
  `).run(name, email || null, phone || null, company || null, is_business_customer ? 1 : 0, notes || null);

  logAudit(req.user.id, 'create', 'customer', result.lastInsertRowid, { name }, req.ip);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Kunde erstellt.' });
});

// PUT /api/customers/:id
router.put('/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { name, email, phone, company, is_business_customer, notes } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE customers SET
      name = COALESCE(?, name), email = ?, phone = ?, company = ?,
      is_business_customer = COALESCE(?, is_business_customer),
      notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, email, phone, company, is_business_customer !== undefined ? (is_business_customer ? 1 : 0) : null, notes, req.params.id);

  logAudit(req.user.id, 'update', 'customer', req.params.id, req.body, req.ip);
  res.json({ message: 'Kunde aktualisiert.' });
});

// DELETE /api/customers/:id/gdpr – DSGVO-Pseudonymisierung
router.delete('/:id/gdpr', authenticate, requireRole('inhaber', 'admin'), (req, res) => {
  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Kunde nicht gefunden.' });

  const pseudonymize = db.transaction(() => {
    // Kunde pseudonymisieren
    db.prepare(`
      UPDATE customers SET
        name = 'Gelöschter Kunde #' || id,
        email = NULL, phone = NULL, company = NULL, notes = NULL,
        gdpr_deleted_at = CURRENT_TIMESTAMP,
        gdpr_deletion_requested_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);

    // Reservierungen anonymisieren
    db.prepare(`
      UPDATE reservations SET
        guest_name = 'Anonymisiert', guest_email = NULL, guest_phone = NULL, message = NULL
      WHERE customer_id = ?
    `).run(req.params.id);
  });

  pseudonymize();
  logAudit(req.user.id, 'delete', 'customer', req.params.id, { action: 'gdpr_pseudonymized' }, req.ip);
  res.json({ message: 'Kundendaten DSGVO-konform pseudonymisiert.' });
});

module.exports = router;
