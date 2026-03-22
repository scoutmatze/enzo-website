const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, logAudit } = require('../db/init');
const { authenticate, requireRole, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  // Last Login aktualisieren
  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  logAudit(user.id, 'login', 'user', user.id, null, req.ip);

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
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Neues Passwort muss mindestens 8 Zeichen lang sein.' });
  }

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

// GET /api/auth/users (nur inhaber + admin)
router.get('/users', authenticate, requireRole('inhaber', 'admin'), (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT id, email, display_name, role, is_active, phone, last_login, created_at
    FROM users ORDER BY role, display_name
  `).all();
  res.json(users);
});

// POST /api/auth/users (nur inhaber + admin)
router.post('/users', authenticate, requireRole('inhaber', 'admin'), (req, res) => {
  const { email, password, display_name, role, phone } = req.body;
  if (!email || !password || !display_name || !role) {
    return res.status(400).json({ error: 'E-Mail, Passwort, Name und Rolle erforderlich.' });
  }
  if (!['inhaber', 'leitung', 'team'].includes(role)) {
    return res.status(400).json({ error: 'Ungültige Rolle.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein.' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'E-Mail wird bereits verwendet.' });
  }

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, display_name, role, phone)
    VALUES (?, ?, ?, ?, ?)
  `).run(email.toLowerCase().trim(), hash, display_name, role, phone || null);

  logAudit(req.user.id, 'create', 'user', result.lastInsertRowid, { email, role }, req.ip);

  res.status(201).json({
    id: result.lastInsertRowid,
    message: `Benutzer ${display_name} erstellt.`,
  });
});

module.exports = router;
