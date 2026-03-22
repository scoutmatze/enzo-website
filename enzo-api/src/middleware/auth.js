const jwt = require('jsonwebtoken');
const { getDb } = require('../db/init');

const JWT_SECRET = process.env.JWT_SECRET || 'UNSICHER_BITTE_AENDERN';

// JWT-Token pruefen
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nicht eingeloggt.' });
  }

  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);

    // User aus DB laden (falls zwischenzeitlich deaktiviert)
    const db = getDb();
    const user = db.prepare('SELECT id, email, display_name, role, is_active FROM users WHERE id = ?').get(payload.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Konto nicht aktiv.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sitzung abgelaufen. Bitte neu einloggen.' });
    }
    return res.status(401).json({ error: 'Ungültiger Token.' });
  }
}

// Rollen-Hierarchie: inhaber > leitung > team
const ROLE_LEVEL = { admin: 100, inhaber: 90, leitung: 50, team: 10 };

// Mindestrolle pruefen
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Nicht eingeloggt.' });
    }

    // Admin darf immer (ausser bei inhaber-only Funktionen)
    if (req.user.role === 'admin' && roles.includes('admin')) {
      return next();
    }

    // Prüfe ob User-Rolle mindestens so hoch wie eine der erlaubten Rollen
    const userLevel = ROLE_LEVEL[req.user.role] || 0;
    const requiredLevel = Math.min(...roles.map(r => ROLE_LEVEL[r] || 999));

    if (userLevel >= requiredLevel) {
      return next();
    }

    return res.status(403).json({ error: 'Keine Berechtigung für diese Aktion.' });
  };
}

module.exports = { authenticate, requireRole, JWT_SECRET };
