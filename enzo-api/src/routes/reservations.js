const express = require('express');
const { getDb, logAudit } = require('../db/init');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// ═══════════════════════════════════════════
// ADMIN ROUTES (mit Auth)
// ═══════════════════════════════════════════

// GET /api/reservations – Alle Reservierungen (mit Filtern)
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { date, status, from, to } = req.query;
  let sql = 'SELECT * FROM reservations WHERE 1=1';
  const params = [];

  if (date) { sql += ' AND date = ?'; params.push(date); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (from) { sql += ' AND date >= ?'; params.push(from); }
  if (to) { sql += ' AND date <= ?'; params.push(to); }

  sql += ' ORDER BY date ASC, time ASC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/reservations/today – Heute
router.get('/today', authenticate, (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const reservations = db.prepare(`
    SELECT * FROM reservations WHERE date = ? AND status NOT IN ('cancelled', 'declined')
    ORDER BY time ASC
  `).all(today);

  const totalGuests = reservations.reduce((sum, r) => sum + r.party_size, 0);
  const totalSeats = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'total_seats'").get()?.value || '30');

  res.json({ date: today, reservations, totalGuests, totalSeats, freeSeats: totalSeats - totalGuests });
});

// GET /api/reservations/stats – Übersicht für Dashboard
router.get('/stats', authenticate, (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const todayCount = db.prepare("SELECT COUNT(*) as c FROM reservations WHERE date = ? AND status NOT IN ('cancelled','declined')").get(today).c;
  const todayGuests = db.prepare("SELECT COALESCE(SUM(party_size),0) as s FROM reservations WHERE date = ? AND status NOT IN ('cancelled','declined')").get(today).s;
  const pendingCount = db.prepare("SELECT COUNT(*) as c FROM reservations WHERE status = 'pending'").get().c;
  const totalSeats = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'total_seats'").get()?.value || '30');

  res.json({ todayCount, todayGuests, pendingCount, totalSeats, freeSeats: totalSeats - todayGuests });
});

// GET /api/reservations/:id (MUSS NACH /public/* stehen!)
// → verschoben nach unten, siehe Ende der Admin-Routes

// POST /api/reservations – Manuelle Reservierung (durch Mitarbeiter)
router.post('/', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { guest_name, guest_email, guest_phone, date, time, party_size, message, source, status, internal_notes } = req.body;
  if (!guest_name || !date || !time || !party_size) {
    return res.status(400).json({ error: 'Name, Datum, Uhrzeit und Personenzahl erforderlich.' });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO reservations (guest_name, guest_email, guest_phone, date, time, party_size, message, source, status, internal_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guest_name, guest_email || null, guest_phone || null, date, time, party_size,
    message || null, source || 'phone', status || 'confirmed', internal_notes || null);

  logAudit(req.user.id, 'create', 'reservation', result.lastInsertRowid, { guest_name, date, time, party_size }, req.ip);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Reservierung erstellt.' });
});

// PUT /api/reservations/:id – Bearbeiten
router.put('/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { guest_name, guest_email, guest_phone, date, time, party_size, message, status, internal_notes } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE reservations SET
      guest_name = COALESCE(?, guest_name),
      guest_email = ?,
      guest_phone = ?,
      date = COALESCE(?, date),
      time = COALESCE(?, time),
      party_size = COALESCE(?, party_size),
      message = ?,
      status = COALESCE(?, status),
      internal_notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(guest_name, guest_email, guest_phone, date, time, party_size, message, status, internal_notes, req.params.id);

  logAudit(req.user.id, 'update', 'reservation', req.params.id, req.body, req.ip);
  res.json({ message: 'Reservierung aktualisiert.' });
});

// PUT /api/reservations/:id/confirm
router.put('/:id/confirm', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const db = getDb();
  db.prepare("UPDATE reservations SET status = 'confirmed', confirmed_by = ?, confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(req.user.id, req.params.id);
  logAudit(req.user.id, 'update', 'reservation', req.params.id, { action: 'confirmed' }, req.ip);
  res.json({ message: 'Reservierung bestätigt.' });
});

// PUT /api/reservations/:id/decline
router.put('/:id/decline', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const db = getDb();
  db.prepare("UPDATE reservations SET status = 'declined', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  logAudit(req.user.id, 'update', 'reservation', req.params.id, { action: 'declined' }, req.ip);
  res.json({ message: 'Reservierung abgelehnt.' });
});

// PUT /api/reservations/:id/cancel
router.put('/:id/cancel', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const db = getDb();
  db.prepare("UPDATE reservations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  logAudit(req.user.id, 'update', 'reservation', req.params.id, { action: 'cancelled' }, req.ip);
  res.json({ message: 'Reservierung storniert.' });
});

// ═══════════════════════════════════════════
// BLOCKED DATES
// ═══════════════════════════════════════════

// GET /api/reservations/blocked-dates
router.get('/blocked-dates/list', authenticate, (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM blocked_dates ORDER BY date ASC').all());
});

// POST /api/reservations/blocked-dates
router.post('/blocked-dates', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const { date, reason, is_full_day, blocked_from, blocked_until } = req.body;
  if (!date || !reason) return res.status(400).json({ error: 'Datum und Grund erforderlich.' });

  const db = getDb();
  const result = db.prepare('INSERT INTO blocked_dates (date, reason, is_full_day, blocked_from, blocked_until, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(date, reason, is_full_day !== undefined ? (is_full_day ? 1 : 0) : 1, blocked_from || null, blocked_until || null, req.user.id);

  logAudit(req.user.id, 'create', 'blocked_date', result.lastInsertRowid, { date, reason }, req.ip);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Datum gesperrt.' });
});

// DELETE /api/reservations/blocked-dates/:id
router.delete('/blocked-dates/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM blocked_dates WHERE id = ?').run(req.params.id);
  logAudit(req.user.id, 'delete', 'blocked_date', req.params.id, null, req.ip);
  res.json({ message: 'Sperrung aufgehoben.' });
});

// ═══════════════════════════════════════════
// PUBLIC ROUTES (ohne Auth – für Website)
// ═══════════════════════════════════════════

// GET /api/reservations/public/availability?date=2026-03-25
// Gibt verfügbare Zeiten für ein Datum zurück
router.get('/public/availability', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Datum erforderlich.' });

  const db = getDb();

  // Settings laden
  const getSetting = (key, def) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || def;
  const totalSeats = parseInt(getSetting('total_seats', '30'));
  const slotMinutes = parseInt(getSetting('reservation_slot_minutes', '30'));
  const bookingStart = getSetting('booking_start_time', '11:00');
  const bookingEnd = getSetting('booking_end_time', '21:00');
  const openingHours = JSON.parse(getSetting('opening_hours', '{}'));
  const maxAdvanceDays = parseInt(getSetting('booking_advance_days', '30'));

  // Prüfe ob Datum in der Zukunft und innerhalb des Buchungszeitraums
  const today = new Date().toISOString().split('T')[0];
  if (date < today) return res.json({ available: false, reason: 'Datum liegt in der Vergangenheit.' });

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
  if (date > maxDate.toISOString().split('T')[0]) return res.json({ available: false, reason: 'Zu weit in der Zukunft.' });

  // Prüfe Öffnungszeiten
  const dayNames = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];
  const dayOfWeek = new Date(date).getDay();
  const dayKey = dayNames[dayOfWeek];
  const hours = openingHours[dayKey];

  if (!hours) return res.json({ available: false, reason: 'An diesem Tag geschlossen.', closed: true });

  // Prüfe gesperrte Tage
  const blocked = db.prepare('SELECT * FROM blocked_dates WHERE date = ?').get(date);
  if (blocked && blocked.is_full_day) return res.json({ available: false, reason: blocked.reason, blocked: true });

  // Bestehende Reservierungen für den Tag laden
  const reservations = db.prepare(`
    SELECT time, SUM(party_size) as booked
    FROM reservations WHERE date = ? AND status NOT IN ('cancelled', 'declined')
    GROUP BY time
  `).all(date);

  const bookedMap = {};
  for (const r of reservations) bookedMap[r.time] = r.booked;

  // Zeitslots generieren
  const slots = [];
  const [startH, startM] = bookingStart.split(':').map(Number);
  const [endH, endM] = bookingEnd.split(':').map(Number);
  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  // Für heute: nur zukünftige Slots
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isToday = date === today;

  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const booked = bookedMap[timeStr] || 0;
    const free = totalSeats - booked;

    // Prüfe ob geblockt (Teil-Block)
    let slotBlocked = false;
    if (blocked && !blocked.is_full_day) {
      if (timeStr >= blocked.blocked_from && timeStr < blocked.blocked_until) slotBlocked = true;
    }

    if (!isToday || current > nowMinutes + 60) { // mindestens 1h Vorlauf
      slots.push({
        time: timeStr,
        free: slotBlocked ? 0 : free,
        available: !slotBlocked && free > 0,
      });
    }

    current += slotMinutes;
  }

  res.json({
    available: true,
    date,
    day: dayKey,
    openingHours: hours,
    totalSeats,
    slots,
  });
});

// GET /api/reservations/public/dates – Verfügbare Tage der nächsten X Tage
router.get('/public/dates', (req, res) => {
  const db = getDb();
  const getSetting = (key, def) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || def;
  const openingHours = JSON.parse(getSetting('opening_hours', '{}'));
  const maxAdvanceDays = parseInt(getSetting('booking_advance_days', '30'));
  const totalSeats = parseInt(getSetting('total_seats', '30'));

  const blockedDates = db.prepare('SELECT date, reason, is_full_day FROM blocked_dates').all();
  const blockedMap = {};
  for (const b of blockedDates) if (b.is_full_day) blockedMap[b.date] = b.reason;

  const dayNames = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];
  const dates = [];

  for (let i = 0; i <= maxAdvanceDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayKey = dayNames[d.getDay()];
    const hours = openingHours[dayKey];

    // Gebuchte Plätze für den Tag
    const booked = db.prepare("SELECT COALESCE(SUM(party_size),0) as s FROM reservations WHERE date = ? AND status NOT IN ('cancelled','declined')").get(dateStr).s;

    dates.push({
      date: dateStr,
      dayName: dayKey,
      open: !!hours,
      hours: hours || null,
      blocked: !!blockedMap[dateStr],
      blockedReason: blockedMap[dateStr] || null,
      bookedSeats: booked,
      freeSeats: hours ? totalSeats - booked : 0,
      available: !!hours && !blockedMap[dateStr] && (totalSeats - booked) > 0,
    });
  }

  res.json(dates);
});

// POST /api/reservations/public/book – Öffentliche Buchung (Website-Formular)
router.post('/public/book', (req, res) => {
  const { guest_name, guest_email, guest_phone, date, time, party_size, message } = req.body;

  if (!guest_name || !date || !time || !party_size) {
    return res.status(400).json({ error: 'Name, Datum, Uhrzeit und Personenzahl erforderlich.' });
  }
  if (party_size < 1 || party_size > 20) {
    return res.status(400).json({ error: 'Ungültige Personenzahl.' });
  }

  const db = getDb();
  const totalSeats = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'total_seats'").get()?.value || '30');

  // Prüfe Verfügbarkeit
  const booked = db.prepare("SELECT COALESCE(SUM(party_size),0) as s FROM reservations WHERE date = ? AND time = ? AND status NOT IN ('cancelled','declined')").get(date, time).s;
  if (booked + party_size > totalSeats) {
    return res.status(409).json({ error: 'Leider keine Plätze mehr frei zu dieser Uhrzeit.' });
  }

  // Prüfe gesperrte Tage
  const blocked = db.prepare('SELECT * FROM blocked_dates WHERE date = ? AND is_full_day = 1').get(date);
  if (blocked) {
    return res.status(409).json({ error: 'An diesem Tag sind leider keine Reservierungen möglich.' });
  }

  // Honeypot Check
  if (req.body.website) {
    return res.json({ status: 'ok', message: 'Reservierung empfangen.' });
  }

  const result = db.prepare(`
    INSERT INTO reservations (guest_name, guest_email, guest_phone, date, time, party_size, message, source, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'website', 'pending')
  `).run(guest_name, guest_email || null, guest_phone || null, date, time, party_size, message || null);

  res.json({ status: 'ok', id: result.lastInsertRowid, message: 'Vielen Dank! Ihre Reservierung wurde empfangen und wird zeitnah bestätigt.' });
});

// ═══════════════════════════════════════════
// GET /api/reservations/:id (NACH public/* Routen!)
// ═══════════════════════════════════════════
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const r = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Reservierung nicht gefunden.' });
  res.json(r);
});

module.exports = router;