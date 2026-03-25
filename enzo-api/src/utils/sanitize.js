/**
 * Input Sanitization für Da Enzo API
 * Entfernt HTML-Tags und gefährliche Zeichen aus Benutzereingaben
 */

// HTML-Tags entfernen
function stripHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
}

// Grundlegende Sanitization: HTML strippen, Whitespace normalisieren
function sanitize(input) {
  if (input === null || input === undefined) return input;
  if (typeof input !== 'string') return input;
  return stripHtml(input)
    .replace(/\s+/g, ' ')  // Mehrfache Whitespaces → ein Leerzeichen
    .trim();
}

// Objekt-Sanitization: alle String-Werte in einem Objekt bereinigen
function sanitizeObject(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };
  const keys = fields || Object.keys(result);
  for (const key of keys) {
    if (typeof result[key] === 'string') {
      result[key] = sanitize(result[key]);
    }
  }
  return result;
}

// E-Mail-Validierung (basic)
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Telefonnummer-Validierung (basic: nur Zahlen, +, -, Leerzeichen, Klammern)
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return true; // Optional
  return /^[\d\s\+\-\(\)\/\.]+$/.test(phone.trim());
}

module.exports = { sanitize, sanitizeObject, stripHtml, isValidEmail, isValidPhone };
