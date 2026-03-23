const express = require('express');
const { getDb, logAudit } = require('../db/init');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// ═══════════════════════════════════════════
// MITARBEITER (Employees)
// ═══════════════════════════════════════════

router.get('/employees', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    const db = getDb();
    const employees = db.prepare('SELECT e.*, u.email as login_email, u.display_name FROM employees e LEFT JOIN users u ON e.user_id = u.id WHERE e.is_active = 1 ORDER BY e.last_name, e.first_name').all();
    // Gehalt/Adresse nur für inhaber
    if (req.user.role !== 'inhaber') {
      for (const e of employees) { e.hourly_rate = null; e.address = null; }
    }
    res.json(employees);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/employees', authenticate, requireRole('inhaber'), (req, res) => {
  try {
    const { user_id, first_name, last_name, email, phone, address, employment_type, weekly_hours, hourly_rate, start_date, vacation_days_per_year, notes } = req.body;
    if (!first_name || !last_name) return res.status(400).json({ error: 'Vor- und Nachname erforderlich.' });
    const db = getDb();
    const result = db.prepare('INSERT INTO employees (user_id, first_name, last_name, email, phone, address, employment_type, weekly_hours, hourly_rate, start_date, vacation_days_per_year, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(user_id || null, first_name, last_name, email || null, phone || null, address || null, employment_type || null, weekly_hours || null, hourly_rate || null, start_date || null, vacation_days_per_year || 24, notes || null);
    logAudit(req.user.id, 'create', 'employee', result.lastInsertRowid, { first_name, last_name }, req.ip);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Mitarbeiter angelegt.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/employees/:id', authenticate, requireRole('inhaber'), (req, res) => {
  try {
    const { first_name, last_name, email, phone, address, employment_type, weekly_hours, hourly_rate, vacation_days_per_year, notes, is_active } = req.body;
    const db = getDb();
    db.prepare('UPDATE employees SET first_name=COALESCE(?,first_name), last_name=COALESCE(?,last_name), email=?, phone=?, address=?, employment_type=?, weekly_hours=?, hourly_rate=?, vacation_days_per_year=COALESCE(?,vacation_days_per_year), notes=?, is_active=COALESCE(?,is_active), updated_at=CURRENT_TIMESTAMP WHERE id=?').run(first_name, last_name, email, phone, address, employment_type, weekly_hours, hourly_rate, vacation_days_per_year, notes, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id);
    logAudit(req.user.id, 'update', 'employee', req.params.id, req.body, req.ip);
    res.json({ message: 'Mitarbeiter aktualisiert.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════
// SCHICHTVORLAGEN
// ═══════════════════════════════════════════

router.get('/templates', authenticate, (req, res) => {
  try { res.json(getDb().prepare('SELECT * FROM shift_templates ORDER BY start_time').all()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/templates', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    const { name, start_time, end_time, color } = req.body;
    if (!name || !start_time || !end_time) return res.status(400).json({ error: 'Name, Start und Ende erforderlich.' });
    const result = getDb().prepare('INSERT INTO shift_templates (name, start_time, end_time, color) VALUES (?, ?, ?, ?)').run(name, start_time, end_time, color || '#B85A3A');
    res.status(201).json({ id: result.lastInsertRowid, message: 'Vorlage erstellt.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════
// SCHICHTPLAN
// ═══════════════════════════════════════════

// GET /api/shifts?week=2026-03-23 (Montag der Woche)
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { week, employee_id, date } = req.query;

    let sql = 'SELECT s.*, e.first_name, e.last_name, st.name as template_name, st.color FROM shifts s JOIN employees e ON s.employee_id = e.id LEFT JOIN shift_templates st ON s.template_id = st.id WHERE 1=1';
    const params = [];

    if (week) {
      const weekEnd = new Date(week); weekEnd.setDate(weekEnd.getDate() + 6);
      sql += ' AND s.date >= ? AND s.date <= ?'; params.push(week, weekEnd.toISOString().split('T')[0]);
    }
    if (date) { sql += ' AND s.date = ?'; params.push(date); }
    if (employee_id) { sql += ' AND s.employee_id = ?'; params.push(employee_id); }

    // team-Rolle: nur eigene Schichten
    if (req.user.role === 'team') {
      const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
      if (emp) { sql += ' AND s.employee_id = ?'; params.push(emp.id); }
      else return res.json([]);
    }

    sql += ' ORDER BY s.date, s.start_time, e.last_name';
    res.json(db.prepare(sql).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/shifts
router.post('/', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    const { employee_id, date, template_id, start_time, end_time, notes } = req.body;
    if (!employee_id || !date) return res.status(400).json({ error: 'Mitarbeiter und Datum erforderlich.' });

    const db = getDb();
    let sTime = start_time, eTime = end_time;
    if (template_id && (!sTime || !eTime)) {
      const tmpl = db.prepare('SELECT * FROM shift_templates WHERE id = ?').get(template_id);
      if (tmpl) { sTime = sTime || tmpl.start_time; eTime = eTime || tmpl.end_time; }
    }
    if (!sTime || !eTime) return res.status(400).json({ error: 'Start- und Endzeit erforderlich.' });

    const result = db.prepare('INSERT INTO shifts (employee_id, date, template_id, start_time, end_time, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(employee_id, date, template_id || null, sTime, eTime, notes || null, req.user.id);
    logAudit(req.user.id, 'create', 'shift', result.lastInsertRowid, { employee_id, date, start_time: sTime, end_time: eTime }, req.ip);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Schicht eingetragen.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/shifts/:id
router.delete('/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    getDb().prepare('DELETE FROM shifts WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, 'delete', 'shift', req.params.id, null, req.ip);
    res.json({ message: 'Schicht gelöscht.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════
// WÜNSCHE
// ═══════════════════════════════════════════

router.get('/wishes', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { month, employee_id } = req.query;
    let sql = 'SELECT sw.*, e.first_name, e.last_name FROM shift_wishes sw JOIN employees e ON sw.employee_id = e.id WHERE 1=1';
    const params = [];
    if (month) { sql += " AND sw.date LIKE ?"; params.push(month + '%'); }
    if (employee_id) { sql += ' AND sw.employee_id = ?'; params.push(employee_id); }

    if (req.user.role === 'team') {
      const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
      if (emp) { sql += ' AND sw.employee_id = ?'; params.push(emp.id); }
      else return res.json([]);
    }

    sql += ' ORDER BY sw.date';
    res.json(db.prepare(sql).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/wishes', authenticate, (req, res) => {
  try {
    const { employee_id, date, wish_type, reason } = req.body;
    const db = getDb();
    // team darf nur eigene Wünsche
    let empId = employee_id;
    if (req.user.role === 'team') {
      const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
      if (!emp) return res.status(403).json({ error: 'Kein Mitarbeiterprofil gefunden.' });
      empId = emp.id;
    }
    if (!empId || !date || !wish_type) return res.status(400).json({ error: 'Mitarbeiter, Datum und Wunschtyp erforderlich.' });
    const result = db.prepare('INSERT INTO shift_wishes (employee_id, date, wish_type, reason) VALUES (?, ?, ?, ?)').run(empId, date, wish_type, reason || null);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Wunsch eingetragen.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/wishes/:id', authenticate, (req, res) => {
  try {
    getDb().prepare('DELETE FROM shift_wishes WHERE id = ?').run(req.params.id);
    res.json({ message: 'Wunsch gelöscht.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════
// URLAUB / ABWESENHEIT
// ═══════════════════════════════════════════

router.get('/time-off', authenticate, (req, res) => {
  try {
    const db = getDb();
    let sql = 'SELECT t.*, e.first_name, e.last_name FROM time_off t JOIN employees e ON t.employee_id = e.id WHERE 1=1';
    const params = [];

    if (req.user.role === 'team') {
      const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
      if (emp) { sql += ' AND t.employee_id = ?'; params.push(emp.id); }
      else return res.json([]);
    }

    const { status, employee_id } = req.query;
    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    if (employee_id) { sql += ' AND t.employee_id = ?'; params.push(employee_id); }

    sql += ' ORDER BY t.date_from DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/time-off', authenticate, (req, res) => {
  try {
    const { employee_id, type, date_from, date_to, days_count, reason } = req.body;
    const db = getDb();
    let empId = employee_id;
    if (req.user.role === 'team') {
      const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
      if (!emp) return res.status(403).json({ error: 'Kein Mitarbeiterprofil.' });
      empId = emp.id;
    }
    if (!empId || !type || !date_from || !date_to || !days_count) return res.status(400).json({ error: 'Alle Felder erforderlich.' });

    const result = db.prepare('INSERT INTO time_off (employee_id, type, date_from, date_to, days_count, reason) VALUES (?, ?, ?, ?, ?, ?)').run(empId, type, date_from, date_to, days_count, reason || null);
    logAudit(req.user.id, 'create', 'time_off', result.lastInsertRowid, { type, date_from, date_to }, req.ip);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Antrag eingereicht.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/time-off/:id/approve', authenticate, requireRole('inhaber'), (req, res) => {
  try {
    getDb().prepare("UPDATE time_off SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id, req.params.id);
    logAudit(req.user.id, 'update', 'time_off', req.params.id, { action: 'approved' }, req.ip);
    res.json({ message: 'Genehmigt.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/time-off/:id/decline', authenticate, requireRole('inhaber'), (req, res) => {
  try {
    getDb().prepare("UPDATE time_off SET status = 'declined' WHERE id = ?").run(req.params.id);
    logAudit(req.user.id, 'update', 'time_off', req.params.id, { action: 'declined' }, req.ip);
    res.json({ message: 'Abgelehnt.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
