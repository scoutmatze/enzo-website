const express = require('express');
const { getDb, logAudit } = require('../db/init');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

function getSetting(db, key, def) {
  try { return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || def; }
  catch { return def; }
}

// ═══════════════════════════════════════════
// PUBLIC ROUTES (ohne Auth – MÜSSEN VOR /:id!)
// ═══════════════════════════════════════════

router.get('/public/availability', (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Datum erforderlich.' });

    const db = getDb();
    const totalSeats = parseInt(getSetting(db, 'total_seats', '30'));
    const slotMinutes = parseInt(getSetting(db, 'reservation_slot_minutes', '30'));
    const bookingStart = getSetting(db, 'booking_start_time', '11:00');
    const bookingEnd = getSetting(db, 'booking_end_time', '21:00');
    const maxAdvanceDays = parseInt(getSetting(db, 'booking_advance_days', '30'));
    let openingHours = {};
    try { openingHours = JSON.parse(getSetting(db, 'opening_hours', '{}')); } catch { openingHours = {}; }

    const today = new Date().toISOString().split('T')[0];
    if (date < today) return res.json({ available: false, reason: 'Datum liegt in der Vergangenheit.' });

    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
    if (date > maxDate.toISOString().split('T')[0]) return res.json({ available: false, reason: 'Zu weit in der Zukunft.' });

    const dayNames = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();
    const dayKey = dayNames[dayOfWeek];
    let hours = openingHours[dayKey];

    // Sonder-Öffnung? (z.B. Sonntag normalerweise zu, aber heute Privatfeier)
    const specialOpen = db.prepare('SELECT * FROM special_open_dates WHERE date = ?').get(date);
    if (!hours && specialOpen) {
      hours = specialOpen.open_from + '-' + specialOpen.open_until;
    }
    if (!hours) return res.json({ available: false, reason: 'An diesem Tag geschlossen.', closed: true });

    const blocked = db.prepare('SELECT * FROM blocked_dates WHERE date = ?').get(date);
    if (blocked && blocked.is_full_day) return res.json({ available: false, reason: blocked.reason, blocked: true });

    const reservations = db.prepare("SELECT time, SUM(party_size) as booked FROM reservations WHERE date = ? AND status NOT IN ('cancelled','declined') GROUP BY time").all(date);
    const bookedMap = {}; for (const r of reservations) bookedMap[r.time] = r.booked;

    const slots = [];
    const [startH, startM] = bookingStart.split(':').map(Number);
    const [endH, endM] = bookingEnd.split(':').map(Number);
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;
    const now = new Date(); const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isToday = date === today;

    while (current < end) {
      const h = Math.floor(current / 60); const m = current % 60;
      const timeStr = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
      const booked = bookedMap[timeStr] || 0;
      const free = totalSeats - booked;
      let slotBlocked = false;
      if (blocked && !blocked.is_full_day && timeStr >= blocked.blocked_from && timeStr < blocked.blocked_until) slotBlocked = true;
      if (!isToday || current > nowMinutes + 60) {
        slots.push({ time: timeStr, free: slotBlocked ? 0 : free, available: !slotBlocked && free > 0 });
      }
      current += slotMinutes;
    }
    res.json({ available: true, date, day: dayKey, openingHours: hours, totalSeats, slots });
  } catch (err) { console.error('[availability]', err); res.status(500).json({ error: 'Fehler: ' + err.message }); }
});

router.get('/public/dates', (req, res) => {
  try {
    const db = getDb();
    let openingHours = {}; try { openingHours = JSON.parse(getSetting(db, 'opening_hours', '{}')); } catch {}
    const maxAdvanceDays = parseInt(getSetting(db, 'booking_advance_days', '30'));
    const totalSeats = parseInt(getSetting(db, 'total_seats', '30'));
    const blockedDates = db.prepare('SELECT date, reason, is_full_day FROM blocked_dates').all();
    const blockedMap = {}; for (const b of blockedDates) if (b.is_full_day) blockedMap[b.date] = b.reason;
    const specialDates = db.prepare('SELECT date, reason, open_from, open_until FROM special_open_dates').all();
    const specialMap = {}; for (const s of specialDates) specialMap[s.date] = s;
    const dayNames = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];
    const dates = [];
    for (let i = 0; i <= maxAdvanceDays; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayKey = dayNames[d.getDay()];
      let hours = openingHours[dayKey];
      const special = specialMap[dateStr];
      if (!hours && special) hours = special.open_from + '-' + special.open_until;
      const booked = db.prepare("SELECT COALESCE(SUM(party_size),0) as s FROM reservations WHERE date = ? AND status NOT IN ('cancelled','declined')").get(dateStr).s;
      dates.push({ date: dateStr, dayName: dayKey, open: !!hours, hours: hours || null, blocked: !!blockedMap[dateStr], blockedReason: blockedMap[dateStr] || null, special: !!special, specialReason: special?.reason || null, bookedSeats: booked, freeSeats: hours ? totalSeats - booked : 0, available: !!hours && !blockedMap[dateStr] && (totalSeats - booked) > 0 });
    }
    res.json(dates);
  } catch (err) { console.error('[dates]', err); res.status(500).json({ error: 'Fehler: ' + err.message }); }
});

router.post('/public/book', (req, res) => {
  try {
    const { guest_name, guest_email, guest_phone, date, time, party_size, message } = req.body;
    if (!guest_name || !date || !time || !party_size) return res.status(400).json({ error: 'Name, Datum, Uhrzeit und Personenzahl erforderlich.' });
    if (party_size < 1 || party_size > 20) return res.status(400).json({ error: 'Ungültige Personenzahl.' });
    if (req.body.website) return res.json({ status: 'ok', message: 'Reservierung empfangen.' });
    const db = getDb();
    const totalSeats = parseInt(getSetting(db, 'total_seats', '30'));
    const booked = db.prepare("SELECT COALESCE(SUM(party_size),0) as s FROM reservations WHERE date = ? AND time = ? AND status NOT IN ('cancelled','declined')").get(date, time).s;
    if (booked + party_size > totalSeats) return res.status(409).json({ error: 'Leider keine Plätze mehr frei zu dieser Uhrzeit.' });
    const blocked = db.prepare('SELECT * FROM blocked_dates WHERE date = ? AND is_full_day = 1').get(date);
    if (blocked) return res.status(409).json({ error: 'An diesem Tag sind leider keine Reservierungen möglich.' });
    const result = db.prepare("INSERT INTO reservations (guest_name, guest_email, guest_phone, date, time, party_size, message, source, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'website', 'pending')").run(guest_name, guest_email || null, guest_phone || null, date, time, party_size, message || null);
    res.json({ status: 'ok', id: result.lastInsertRowid, message: 'Vielen Dank! Ihre Reservierung wurde empfangen und wird zeitnah bestätigt.' });
  } catch (err) { console.error('[book]', err); res.status(500).json({ error: 'Fehler: ' + err.message }); }
});

// ═══════════════════════════════════════════
// ADMIN ROUTES (mit Auth)
// ═══════════════════════════════════════════

router.get('/stats', authenticate, (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const todayCount = db.prepare("SELECT COUNT(*) as c FROM reservations WHERE date = ? AND status NOT IN ('cancelled','declined')").get(today).c;
    const todayGuests = db.prepare("SELECT COALESCE(SUM(party_size),0) as s FROM reservations WHERE date = ? AND status NOT IN ('cancelled','declined')").get(today).s;
    const pendingCount = db.prepare("SELECT COUNT(*) as c FROM reservations WHERE status = 'pending'").get().c;
    const peak = db.prepare("SELECT time, SUM(party_size) as guests FROM reservations WHERE date = ? AND status NOT IN ('cancelled','declined') GROUP BY time ORDER BY guests DESC LIMIT 1").get(today);
    res.json({ todayCount, todayGuests, pendingCount, peakTime: peak?.time || null, peakGuests: peak?.guests || 0 });
  } catch (err) { console.error('[stats]', err); res.status(500).json({ error: 'Fehler: ' + err.message }); }
});

router.get('/today', authenticate, (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const reservations = db.prepare("SELECT * FROM reservations WHERE date = ? AND status NOT IN ('cancelled','declined') ORDER BY time ASC").all(today);
    const totalGuests = reservations.reduce((sum, r) => sum + r.party_size, 0);
    const totalSeats = parseInt(getSetting(db, 'total_seats', '30'));
    res.json({ date: today, reservations, totalGuests, totalSeats, freeSeats: totalSeats - totalGuests });
  } catch (err) { console.error('[today]', err); res.status(500).json({ error: 'Fehler: ' + err.message }); }
});

router.get('/blocked-dates/list', authenticate, (req, res) => {
  try { res.json(getDb().prepare('SELECT * FROM blocked_dates ORDER BY date ASC').all()); }
  catch (err) { res.status(500).json({ error: 'Fehler: ' + err.message }); }
});

router.post('/blocked-dates', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    const { date, reason, is_full_day, blocked_from, blocked_until } = req.body;
    if (!date || !reason) return res.status(400).json({ error: 'Datum und Grund erforderlich.' });
    const db = getDb();
    const result = db.prepare('INSERT INTO blocked_dates (date, reason, is_full_day, blocked_from, blocked_until, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(date, reason, is_full_day !== undefined ? (is_full_day ? 1 : 0) : 1, blocked_from || null, blocked_until || null, req.user.id);
    logAudit(req.user.id, 'create', 'blocked_date', result.lastInsertRowid, { date, reason }, req.ip);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Datum gesperrt.' });
  } catch (err) { res.status(500).json({ error: 'Fehler: ' + err.message }); }
});

router.delete('/blocked-dates/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    getDb().prepare('DELETE FROM blocked_dates WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, 'delete', 'blocked_date', req.params.id, null, req.ip);
    res.json({ message: 'Sperrung aufgehoben.' });
  } catch (err) { res.status(500).json({ error: 'Fehler: ' + err.message }); }
});

// Sonder-Öffnungstage
router.get('/special-open/list', authenticate, (req, res) => {
  try { res.json(getDb().prepare('SELECT * FROM special_open_dates ORDER BY date ASC').all()); }
  catch (err) { res.status(500).json({ error: 'Fehler: ' + err.message }); }
});

router.post('/special-open', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    const { date, reason, open_from, open_until } = req.body;
    if (!date || !reason) return res.status(400).json({ error: 'Datum und Grund erforderlich.' });
    const db = getDb();
    const result = db.prepare('INSERT INTO special_open_dates (date, reason, open_from, open_until, created_by) VALUES (?, ?, ?, ?, ?)').run(date, reason, open_from || '11:00', open_until || '22:00', req.user.id);
    logAudit(req.user.id, 'create', 'special_open_date', result.lastInsertRowid, { date, reason }, req.ip);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Sonder-Öffnung eingetragen.' });
  } catch (err) { res.status(500).json({ error: 'Fehler: ' + err.message }); }
});

router.delete('/special-open/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    getDb().prepare('DELETE FROM special_open_dates WHERE id = ?').run(req.params.id);
    logAudit(req.user.id, 'delete', 'special_open_date', req.params.id, null, req.ip);
    res.json({ message: 'Sonder-Öffnung entfernt.' });
  } catch (err) { res.status(500).json({ error: 'Fehler: ' + err.message }); }
});

router.get('/', authenticate, (req, res) => {
  try {
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
  } catch (err) { console.error('[list]', err); res.status(500).json({ error: 'Fehler: ' + err.message }); }
});

router.post('/', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    const { guest_name, guest_email, guest_phone, date, time, party_size, message, source, status, internal_notes } = req.body;
    if (!guest_name || !date || !time || !party_size) return res.status(400).json({ error: 'Name, Datum, Uhrzeit und Personenzahl erforderlich.' });
    const db = getDb();
    const result = db.prepare("INSERT INTO reservations (guest_name, guest_email, guest_phone, date, time, party_size, message, source, status, internal_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(guest_name, guest_email || null, guest_phone || null, date, time, party_size, message || null, source || 'phone', status || 'confirmed', internal_notes || null);
    logAudit(req.user.id, 'create', 'reservation', result.lastInsertRowid, { guest_name, date, time, party_size }, req.ip);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Reservierung erstellt.' });
  } catch (err) { res.status(500).json({ error: 'Fehler: ' + err.message }); }
});

router.put('/:id/confirm', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try { getDb().prepare("UPDATE reservations SET status = 'confirmed', confirmed_by = ?, confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id, req.params.id); res.json({ message: 'Bestätigt.' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/decline', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try { getDb().prepare("UPDATE reservations SET status = 'declined', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id); res.json({ message: 'Abgelehnt.' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/cancel', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try { getDb().prepare("UPDATE reservations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id); res.json({ message: 'Storniert.' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    const { guest_name, guest_email, guest_phone, date, time, party_size, message, status, internal_notes } = req.body;
    getDb().prepare("UPDATE reservations SET guest_name = COALESCE(?, guest_name), guest_email = ?, guest_phone = ?, date = COALESCE(?, date), time = COALESCE(?, time), party_size = COALESCE(?, party_size), message = ?, status = COALESCE(?, status), internal_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(guest_name, guest_email, guest_phone, date, time, party_size, message, status, internal_notes, req.params.id);
    res.json({ message: 'Aktualisiert.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /:id GANZ AM ENDE
router.get('/:id', authenticate, (req, res) => {
  try {
    const r = getDb().prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Nicht gefunden.' });
    res.json(r);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;