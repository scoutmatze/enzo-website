const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, logAudit } = require('../db/init');
const { authenticate, requireRole, JWT_SECRET } = require('../middleware/auth');
const { sanitize } = require('../utils/sanitize');

const router = express.Router();

// ═══════════════════════════════════════════
// BRUTE-FORCE SCHUTZ (In-Memory)
// ═══════════════════════════════════════════
const loginAttempts = new Map(); // IP → { count, lastAttempt, lockedUntil }
const MAX_ATTEMPTS = 10;
const LOCK_DURATION = 30 * 60 * 1000; // 30 Minuten
const ATTEMPT_WINDOW = 60 * 60 * 1000; // 1 Stunde

function checkBruteForce(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return { blocked: false };

  // Lockout aktiv?
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    const mins = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    return { blocked: true, message: `Konto gesperrt. Versuche es in ${mins} Minuten erneut.` };
  }

  // Altes Fenster? Reset.
  if (Date.now() - entry.lastAttempt > ATTEMPT_WINDOW) {
    loginAttempts.delete(ip);
    return { blocked: false };
  }

  return { blocked: false };
}

function recordFailedLogin(ip) {
  const entry = loginAttempts.get(ip) || { count: 0, lastAttempt: 0, lockedUntil: null };
  entry.count++;
  entry.lastAttempt = Date.now();

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCK_DURATION;
    console.warn(`[SECURITY] IP ${ip} gesperrt nach ${entry.count} fehlgeschlagenen Login-Versuchen`);
  }

  loginAttempts.set(ip, entry);
}

function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

// Alte Einträge alle 15min bereinigen
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts.entries()) {
    if (now - entry.lastAttempt > ATTEMPT_WINDOW) loginAttempts.delete(ip);
  }
}, 15 * 60 * 1000);

// ═══════════════════════════════════════════
// PASSWORT-VALIDIERUNG
// ═══════════════════════════════════════════
function validatePassword(pw) {
  if (!pw || pw.length < 8) return 'Passwort muss mindestens 8 Zeichen lang sein.';
  if (!/[A-ZÄÖÜ]/.test(pw)) return 'Passwort braucht mindestens einen Großbuchstaben.';
  if (!/[0-9]/.test(pw)) return 'Passwort braucht mindestens eine Zahl.';
  if (/^[a-zA-Z0-9]+$/.test(pw) && pw.length < 10) return 'Passwort zu einfach. Verwende Sonderzeichen oder mach es länger.';
  return null;
}

// ═══════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════

router.post('/login', (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  // Brute-Force Check
  const bf = checkBruteForce(ip);
  if (bf.blocked) {
    logAudit(null, 'login_blocked', 'user', null, { ip, reason: 'brute_force' }, ip);
    return res.status(429).json({ error: bf.message });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    recordFailedLogin(ip);
    // Fehlgeschlagenen Login protokollieren (ohne Passwort!)
    logAudit(null, 'login_failed', 'user', null, { email: email.toLowerCase().trim(), ip }, ip);
    return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });
  }

  // Erfolgreicher Login → Versuche zurücksetzen
  clearLoginAttempts(ip);

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '4h' } // Reduziert von 8h auf 4h
  );

  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  logAudit(user.id, 'login', 'user', user.id, { ip }, ip);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
    },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/password
router.put('/password', authenticate, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich.' });
  }

  const pwError = validatePassword(new_password);
  if (pwError) return res.status(400).json({ error: pwError });

  const db = getDb();
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);

  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ error: 'Aktuelles Passwort ist falsch.' });
  }

  const hash = bcrypt.hashSync(new_password, 12);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.user.id);
  logAudit(req.user.id, 'update', 'user', req.user.id, { action: 'password_changed' }, req.ip);

  res.json({ message: 'Passwort geändert.' });
});

// GET /api/auth/users
router.get('/users', authenticate, requireRole('inhaber', 'admin'), (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, email, display_name, role, is_active, phone, last_login, created_at FROM users ORDER BY role, display_name').all();
  res.json(users);
});

// POST /api/auth/users
router.post('/users', authenticate, requireRole('inhaber', 'admin'), (req, res) => {
  const { email, password, display_name, role, phone } = req.body;
  if (!email || !password || !display_name || !role) {
    return res.status(400).json({ error: 'E-Mail, Passwort, Name und Rolle erforderlich.' });
  }
  if (!['inhaber', 'leitung', 'team'].includes(role)) {
    return res.status(400).json({ error: 'Ungültige Rolle.' });
  }

  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });

  const db = getDb();
  const cleanEmail = sanitize(email).toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) return res.status(409).json({ error: 'E-Mail wird bereits verwendet.' });

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare('INSERT INTO users (email, password_hash, display_name, role, phone) VALUES (?, ?, ?, ?, ?)').run(cleanEmail, hash, sanitize(display_name), role, phone ? sanitize(phone) : null);

  logAudit(req.user.id, 'create', 'user', result.lastInsertRowid, { email: cleanEmail, role }, req.ip);
  res.status(201).json({ id: result.lastInsertRowid, message: `Benutzer ${display_name} erstellt.` });
});

module.exports = router;
