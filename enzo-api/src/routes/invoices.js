const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { getDb, logAudit } = require('../db/init');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendInvoiceEmail } = require('../utils/email');

const router = express.Router();
const INVOICE_DIR = path.join(__dirname, '../../data/invoices');

// Archiv-Verzeichnis erstellen
if (!fs.existsSync(INVOICE_DIR)) fs.mkdirSync(INVOICE_DIR, { recursive: true });

// GET /api/invoices
router.get('/', authenticate, requireRole('inhaber'), (req, res) => {
  try {
    const db = getDb();
    const { status, customer_id } = req.query;
    let sql = 'SELECT i.*, c.name as customer_name, c.company FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND i.status = ?'; params.push(status); }
    if (customer_id) { sql += ' AND i.customer_id = ?'; params.push(customer_id); }
    sql += ' ORDER BY i.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/invoices/:id
router.get('/:id', authenticate, requireRole('inhaber'), (req, res) => {
  try {
    const db = getDb();
    const invoice = db.prepare('SELECT i.*, c.name as customer_name, c.company, c.email as customer_email, c.address as customer_address FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE i.id = ?').get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Nicht gefunden.' });
    invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY date, id').all(req.params.id);
    res.json(invoice);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/invoices
router.post('/', authenticate, requireRole('inhaber'), (req, res) => {
  try {
    const { customer_id, period_from, period_to, items, notes, due_date } = req.body;
    if (!customer_id || !period_from || !period_to) return res.status(400).json({ error: 'Kunde, Zeitraum erforderlich.' });

    const db = getDb();
    // Rechnungsnummer generieren
    const year = new Date().getFullYear();
    const last = db.prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1").get(`RE-${year}-%`);
    let num = 1;
    if (last) { const m = last.invoice_number.match(/RE-\d{4}-(\d+)/); if (m) num = parseInt(m[1]) + 1; }
    const invoice_number = `RE-${year}-${String(num).padStart(3, '0')}`;

    const create = db.transaction(() => {
      let subtotal = 0;
      const result = db.prepare('INSERT INTO invoices (invoice_number, customer_id, period_from, period_to, notes, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(invoice_number, customer_id, period_from, period_to, notes || null, due_date || null, req.user.id);
      const invoiceId = result.lastInsertRowid;

      if (items && items.length > 0) {
        const ins = db.prepare('INSERT INTO invoice_items (invoice_id, date, description, quantity, unit_price, total, tax_rate, dish_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const item of items) {
          const total = (item.quantity || 1) * item.unit_price;
          const taxRate = item.tax_rate !== undefined ? item.tax_rate : 19.0;
          ins.run(invoiceId, item.date, item.description, item.quantity || 1, item.unit_price, total, taxRate, item.dish_id || null);
          subtotal += total;
        }
      }

      // MwSt. nach Steuersätzen berechnen
      const taxGroups = db.prepare('SELECT tax_rate, SUM(total) as base FROM invoice_items WHERE invoice_id = ? GROUP BY tax_rate').all(invoiceId);
      let tax_amount = 0;
      for (const g of taxGroups) {
        tax_amount += Math.round(g.base * g.tax_rate) / 100;
      }
      tax_amount = Math.round(tax_amount * 100) / 100;
      const total = Math.round((subtotal + tax_amount) * 100) / 100;
      db.prepare('UPDATE invoices SET subtotal = ?, tax_amount = ?, total = ? WHERE id = ?').run(subtotal, tax_amount, total, invoiceId);
      return { invoiceId, invoice_number, total };
    });

    const r = create();
    logAudit(req.user.id, 'create', 'invoice', r.invoiceId, { invoice_number: r.invoice_number }, req.ip);
    res.status(201).json({ id: r.invoiceId, invoice_number: r.invoice_number, total: r.total, message: 'Rechnung erstellt.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/invoices/:id
router.put('/:id', authenticate, requireRole('inhaber'), (req, res) => {
  try {
    const { status, notes, due_date, paid_at } = req.body;
    const db = getDb();
    const sets = []; const params = [];
    if (status) { sets.push('status = ?'); params.push(status); }
    if (notes !== undefined) { sets.push('notes = ?'); params.push(notes); }
    if (due_date) { sets.push('due_date = ?'); params.push(due_date); }
    if (paid_at) { sets.push('paid_at = ?'); params.push(paid_at); }
    if (status === 'paid' && !paid_at) { sets.push('paid_at = CURRENT_TIMESTAMP'); }
    if (status === 'sent') { sets.push('sent_at = CURRENT_TIMESTAMP'); }
    sets.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);
    db.prepare('UPDATE invoices SET ' + sets.join(', ') + ' WHERE id = ?').run(...params);
    logAudit(req.user.id, 'update', 'invoice', req.params.id, req.body, req.ip);

    // PDF-Archiv: beim Finalisieren (→ sent) automatisch speichern
    if (status === 'sent' || status === 'paid') {
      archiveInvoicePdf(db, req.params.id).catch(e => console.error('[PDF archive]', e.message));
    }

    res.json({ message: 'Rechnung aktualisiert.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/invoices/:id/items – Positionen zu bestehender Rechnung hinzufügen
router.post('/:id/items', authenticate, requireRole('inhaber'), (req, res) => {
  try {
    const db = getDb();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Nicht gefunden.' });
    if (invoice.status !== 'draft') return res.status(400).json({ error: 'Nur Entwürfe können bearbeitet werden.' });

    const { items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Keine Positionen.' });

    const ins = db.prepare('INSERT INTO invoice_items (invoice_id, date, description, quantity, unit_price, total, tax_rate, dish_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const item of items) {
      const total = (item.quantity || 1) * item.unit_price;
      ins.run(req.params.id, item.date, item.description, item.quantity || 1, item.unit_price, total, item.tax_rate || 19, item.dish_id || null);
    }

    // Totals neu berechnen
    const subtotal = db.prepare('SELECT COALESCE(SUM(total),0) as s FROM invoice_items WHERE invoice_id = ?').get(req.params.id).s;
    const taxGroups = db.prepare('SELECT tax_rate, SUM(total) as base FROM invoice_items WHERE invoice_id = ? GROUP BY tax_rate').all(req.params.id);
    let tax_amount = 0;
    for (const g of taxGroups) tax_amount += Math.round(g.base * g.tax_rate) / 100;
    tax_amount = Math.round(tax_amount * 100) / 100;
    const total = Math.round((subtotal + tax_amount) * 100) / 100;
    db.prepare('UPDATE invoices SET subtotal = ?, tax_amount = ?, total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(subtotal, tax_amount, total, req.params.id);

    logAudit(req.user.id, 'update', 'invoice', req.params.id, { items_added: items.length }, req.ip);
    res.json({ message: items.length + ' Position(en) hinzugefügt.', subtotal, tax_amount, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/invoices/:id/items/:itemId – Position löschen
router.delete('/:id/items/:itemId', authenticate, requireRole('inhaber'), (req, res) => {
  try {
    const db = getDb();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!invoice || invoice.status !== 'draft') return res.status(400).json({ error: 'Nur Entwürfe bearbeitbar.' });
    db.prepare('DELETE FROM invoice_items WHERE id = ? AND invoice_id = ?').run(req.params.itemId, req.params.id);

    // Totals neu berechnen
    const subtotal = db.prepare('SELECT COALESCE(SUM(total),0) as s FROM invoice_items WHERE invoice_id = ?').get(req.params.id).s;
    const taxGroups = db.prepare('SELECT tax_rate, SUM(total) as base FROM invoice_items WHERE invoice_id = ? GROUP BY tax_rate').all(req.params.id);
    let tax_amount = 0;
    for (const g of taxGroups) tax_amount += Math.round(g.base * g.tax_rate) / 100;
    tax_amount = Math.round(tax_amount * 100) / 100;
    const total = Math.round((subtotal + tax_amount) * 100) / 100;
    db.prepare('UPDATE invoices SET subtotal = ?, tax_amount = ?, total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(subtotal, tax_amount, total, req.params.id);

    res.json({ message: 'Position gelöscht.', subtotal, tax_amount, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/invoices/:id/pdf
router.get('/:id/pdf', authenticate, requireRole('inhaber'), (req, res) => {
  try {
    const db = getDb();
    const invoice = db.prepare('SELECT i.*, c.name as customer_name, c.company, c.email as customer_email FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE i.id = ?').get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Nicht gefunden.' });
    invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY date, id').all(req.params.id);

    const getSetting = (key, def) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || def;

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoice_number}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text(getSetting('restaurant_name', 'Da Enzo'), 50, 50);
    doc.fontSize(9).font('Helvetica').text(getSetting('address', ''), 50, 75);
    doc.text(`Tel: ${getSetting('phone', '')} | E-Mail: ${getSetting('email', '')}`, 50, 87);
    doc.moveDown(2);

    // Empfänger
    doc.fontSize(11).text(invoice.company || invoice.customer_name, 50, 130);
    if (invoice.company && invoice.customer_name !== invoice.company) doc.text(invoice.customer_name);

    // Rechnungsinfo
    doc.fontSize(16).font('Helvetica-Bold').text(`Rechnung ${invoice.invoice_number}`, 50, 190);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Zeitraum: ${invoice.period_from} bis ${invoice.period_to}`, 50, 215);
    doc.text(`Rechnungsdatum: ${new Date(invoice.created_at).toLocaleDateString('de-DE')}`, 50, 230);
    if (invoice.due_date) doc.text(`Fällig bis: ${new Date(invoice.due_date).toLocaleDateString('de-DE')}`, 50, 245);

    // Tabelle
    let y = 280;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Datum', 50, y); doc.text('Beschreibung', 120, y); doc.text('Anz.', 340, y, { width: 30, align: 'right' }); doc.text('MwSt.', 375, y, { width: 35, align: 'right' }); doc.text('Preis', 420, y, { width: 60, align: 'right' }); doc.text('Gesamt', 490, y, { width: 60, align: 'right' });
    y += 15;
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 8;

    doc.font('Helvetica').fontSize(9);
    const taxTotals = {};
    for (const item of invoice.items) {
      if (y > 700) { doc.addPage(); y = 50; }
      const d = new Date(item.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      const rate = item.tax_rate || 19;
      doc.text(d, 50, y); doc.text(item.description, 120, y, { width: 210 }); doc.text(String(item.quantity), 340, y, { width: 30, align: 'right' }); doc.text(rate + '%', 375, y, { width: 35, align: 'right' }); doc.text(item.unit_price.toFixed(2) + ' €', 420, y, { width: 60, align: 'right' }); doc.text(item.total.toFixed(2) + ' €', 490, y, { width: 60, align: 'right' });
      if (!taxTotals[rate]) taxTotals[rate] = 0;
      taxTotals[rate] += item.total;
      y += 18;
    }

    // Summen
    y += 10;
    doc.moveTo(370, y).lineTo(550, y).stroke();
    y += 10;
    doc.text('Netto:', 370, y, { width: 110, align: 'right' }); doc.text(invoice.subtotal.toFixed(2) + ' €', 490, y, { width: 60, align: 'right' });
    // MwSt. pro Satz
    for (const [rate, base] of Object.entries(taxTotals).sort()) {
      y += 15;
      const taxAmt = Math.round(base * parseFloat(rate)) / 100;
      doc.text('MwSt. ' + rate + '% (auf ' + base.toFixed(2) + ' €):', 310, y, { width: 170, align: 'right' }); doc.text(taxAmt.toFixed(2) + ' €', 490, y, { width: 60, align: 'right' });
    }
    y += 15;
    doc.font('Helvetica-Bold');
    doc.text('Gesamt:', 370, y, { width: 110, align: 'right' }); doc.text(invoice.total.toFixed(2) + ' €', 490, y, { width: 60, align: 'right' });

    if (invoice.notes) { y += 30; doc.font('Helvetica').fontSize(9).text(`Hinweis: ${invoice.notes}`, 50, y); }

    doc.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/invoices/:id/items – Positionen zu bestehender Rechnung hinzufügen
router.post('/:id/items', authenticate, requireRole('inhaber'), (req, res) => {
  try {
    const db = getDb();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden.' });
    if (invoice.status !== 'draft') return res.status(400).json({ error: 'Nur Entwürfe können bearbeitet werden.' });

    const { items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Mindestens eine Position erforderlich.' });

    const ins = db.prepare('INSERT INTO invoice_items (invoice_id, date, description, quantity, unit_price, total, tax_rate, dish_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const item of items) {
      const total = (item.quantity || 1) * item.unit_price;
      ins.run(req.params.id, item.date, item.description, item.quantity || 1, item.unit_price, total, item.tax_rate || 19, item.dish_id || null);
    }

    // Summen neu berechnen
    recalcInvoice(db, req.params.id);
    const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    logAudit(req.user.id, 'update', 'invoice', req.params.id, { action: 'items_added' }, req.ip);
    res.json({ message: 'Positionen hinzugefügt.', total: updated.total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/invoices/:id/items/:itemId
router.delete('/:id/items/:itemId', authenticate, requireRole('inhaber'), (req, res) => {
  try {
    const db = getDb();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden.' });
    if (invoice.status !== 'draft') return res.status(400).json({ error: 'Nur Entwürfe können bearbeitet werden.' });

    db.prepare('DELETE FROM invoice_items WHERE id = ? AND invoice_id = ?').run(req.params.itemId, req.params.id);
    recalcInvoice(db, req.params.id);
    const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    res.json({ message: 'Position entfernt.', total: updated.total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function recalcInvoice(db, invoiceId) {
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
  let subtotal = 0;
  const taxGroups = {};
  for (const it of items) {
    subtotal += it.total;
    const rate = it.tax_rate || 19;
    if (!taxGroups[rate]) taxGroups[rate] = 0;
    taxGroups[rate] += it.total;
  }
  let tax_amount = 0;
  for (const [rate, base] of Object.entries(taxGroups)) {
    tax_amount += Math.round(base * parseFloat(rate)) / 100;
  }
  tax_amount = Math.round(tax_amount * 100) / 100;
  const total = Math.round((subtotal + tax_amount) * 100) / 100;
  db.prepare('UPDATE invoices SET subtotal = ?, tax_amount = ?, total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(subtotal, tax_amount, total, invoiceId);
}

// POST /api/invoices/:id/send
router.post('/:id/send', authenticate, requireRole('inhaber'), async (req, res) => {
  try {
    const db = getDb();
    const invoice = db.prepare('SELECT i.*, c.name as customer_name, c.email as customer_email FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE i.id = ?').get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Nicht gefunden.' });
    if (!invoice.customer_email) return res.status(400).json({ error: 'Kunde hat keine E-Mail-Adresse.' });

    const r = await sendInvoiceEmail({ to: invoice.customer_email, invoiceNumber: invoice.invoice_number, customerName: invoice.customer_name, total: invoice.total.toFixed(2) + ' €' });
    if (r.sent) {
      db.prepare("UPDATE invoices SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
      res.json({ message: 'Rechnung per E-Mail versendet.' });
    } else {
      res.status(500).json({ error: 'Versand fehlgeschlagen: ' + r.reason });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/invoices/:id – Nur Entwürfe löschbar
router.delete('/:id', authenticate, requireRole('inhaber'), (req, res) => {
  try {
    const db = getDb();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Nicht gefunden.' });
    if (invoice.status !== 'draft') return res.status(400).json({ error: 'Nur Entwürfe können gelöscht werden. Versendete Rechnungen müssen storniert werden.' });
    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(req.params.id);
    db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, 'delete', 'invoice', req.params.id, { invoice_number: invoice.invoice_number }, req.ip);
    res.json({ message: 'Rechnung ' + invoice.invoice_number + ' gelöscht.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PDF-Archiv: Rechnung als PDF auf Disk speichern
async function archiveInvoicePdf(db, invoiceId) {
  const getSetting = (key, def) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || def;
  const invoice = db.prepare('SELECT i.*, c.name as customer_name, c.company, c.address as customer_address FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE i.id = ?').get(invoiceId);
  if (!invoice) return;
  invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY date, id').all(invoiceId);

  return new Promise((resolve, reject) => {
    const filePath = path.join(INVOICE_DIR, invoice.invoice_number + '.pdf');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).font('Helvetica-Bold').text(getSetting('restaurant_name', 'Da Enzo'), 50, 50);
    doc.fontSize(9).font('Helvetica').text(getSetting('address', ''), 50, 75);
    doc.text('Tel: ' + getSetting('phone', '') + ' | E-Mail: ' + getSetting('email', ''), 50, 87);

    doc.fontSize(11).text(invoice.company || invoice.customer_name, 50, 130);
    if (invoice.company && invoice.customer_name !== invoice.company) doc.text(invoice.customer_name);
    if (invoice.customer_address) doc.text(invoice.customer_address);

    doc.fontSize(16).font('Helvetica-Bold').text('Rechnung ' + invoice.invoice_number, 50, 190);
    doc.fontSize(10).font('Helvetica');
    doc.text('Zeitraum: ' + invoice.period_from + ' bis ' + invoice.period_to, 50, 215);
    doc.text('Rechnungsdatum: ' + new Date(invoice.created_at).toLocaleDateString('de-DE'), 50, 230);
    if (invoice.due_date) doc.text('Fällig bis: ' + new Date(invoice.due_date).toLocaleDateString('de-DE'), 50, 245);

    let y = 280;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Datum', 50, y); doc.text('Beschreibung', 120, y); doc.text('Anz.', 340, y, { width: 30, align: 'right' }); doc.text('MwSt.', 375, y, { width: 35, align: 'right' }); doc.text('Preis', 420, y, { width: 60, align: 'right' }); doc.text('Gesamt', 490, y, { width: 60, align: 'right' });
    y += 15; doc.moveTo(50, y).lineTo(550, y).stroke(); y += 8;
    doc.font('Helvetica').fontSize(9);
    const taxTotals = {};
    for (const item of invoice.items) {
      if (y > 700) { doc.addPage(); y = 50; }
      const d = new Date(item.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      const rate = item.tax_rate || 19;
      doc.text(d, 50, y); doc.text(item.description, 120, y, { width: 210 }); doc.text(String(item.quantity), 340, y, { width: 30, align: 'right' }); doc.text(rate + '%', 375, y, { width: 35, align: 'right' }); doc.text(item.unit_price.toFixed(2) + ' €', 420, y, { width: 60, align: 'right' }); doc.text(item.total.toFixed(2) + ' €', 490, y, { width: 60, align: 'right' });
      if (!taxTotals[rate]) taxTotals[rate] = 0;
      taxTotals[rate] += item.total;
      y += 18;
    }
    y += 10; doc.moveTo(370, y).lineTo(550, y).stroke(); y += 10;
    doc.text('Netto:', 370, y, { width: 110, align: 'right' }); doc.text(invoice.subtotal.toFixed(2) + ' €', 490, y, { width: 60, align: 'right' });
    for (const [rate, base] of Object.entries(taxTotals).sort()) {
      y += 15;
      const taxAmt = Math.round(base * parseFloat(rate)) / 100;
      doc.text('MwSt. ' + rate + '% (auf ' + base.toFixed(2) + ' €):', 310, y, { width: 170, align: 'right' }); doc.text(taxAmt.toFixed(2) + ' €', 490, y, { width: 60, align: 'right' });
    }
    y += 15; doc.font('Helvetica-Bold');
    doc.text('Gesamt:', 370, y, { width: 110, align: 'right' }); doc.text(invoice.total.toFixed(2) + ' €', 490, y, { width: 60, align: 'right' });
    if (invoice.notes) { y += 30; doc.font('Helvetica').fontSize(9).text('Hinweis: ' + invoice.notes, 50, y); }

    doc.end();
    stream.on('finish', () => {
      db.prepare('UPDATE invoices SET pdf_path = ? WHERE id = ?').run(filePath, invoiceId);
      console.log('[PDF archiviert] ' + filePath);
      resolve(filePath);
    });
    stream.on('error', reject);
  });
}

module.exports = router;