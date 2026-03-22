const express = require('express');
const fs = require('fs');
const path = require('path');
const { getDb, logAudit } = require('../db/init');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const WEBSITE_PATH = process.env.WEBSITE_PATH || '/var/www/enzo';

// ═══════════════════════════════════════════
// Speisekarte → speisekarte.json
// ═══════════════════════════════════════════

function exportSpeisekarte() {
  const db = getDb();

  const settings = {};
  const settingsRows = db.prepare("SELECT key, value FROM settings WHERE key IN ('menu_intro', 'allergen_note')").all();
  for (const row of settingsRows) settings[row.key] = row.value;

  const categories = db.prepare(`
    SELECT id, name FROM menu_categories
    WHERE is_active = 1 ORDER BY sort_order, name
  `).all();

  const result = {
    intro: settings.menu_intro || '',
    allergenNote: settings.allergen_note || '',
    categories: [],
  };

  for (const cat of categories) {
    const items = db.prepare(`
      SELECT d.name, d.description AS desc, mi.price,
        COALESCE(das.allergens, '') AS allergens
      FROM menu_items mi
      JOIN dishes d ON mi.dish_id = d.id
      LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
      WHERE mi.category_id = ? AND mi.is_active = 1 AND d.is_active = 1
      ORDER BY mi.sort_order, d.name
    `).all(cat.id);

    if (items.length > 0) {
      result.categories.push({
        name: cat.name,
        items: items.map(item => {
          const entry = { name: item.name, price: formatPrice(item.price) };
          if (item.desc) entry.desc = item.desc;
          if (item.allergens) entry.allergens = item.allergens;
          return entry;
        }),
      });
    }
  }

  const json = JSON.stringify(result, null, 2);
  const filePath = path.join(WEBSITE_PATH, 'speisekarte.json');

  // Auch auf DEV exportieren falls vorhanden
  writeJsonSafe(filePath, json);
  writeJsonSafe(filePath.replace('/enzo/', '/enzo-dev/'), json);

  return result;
}

// ═══════════════════════════════════════════
// Wochenkarte → wochenkarte.json
// ═══════════════════════════════════════════

function exportWochenkarte() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const menu = db.prepare(`
    SELECT * FROM weekly_menu
    WHERE is_published = 1 AND week_start <= ?
    ORDER BY week_start DESC LIMIT 1
  `).get(today);

  let result;

  if (!menu) {
    result = {
      title: 'Wochenkarte',
      subtitle: 'Aktuell keine Wochenkarte verfügbar.',
      items: [],
    };
  } else {
    const items = db.prepare(`
      SELECT wmi.day_of_week, wmi.price, d.name, d.description,
        COALESCE(das.allergens, '') AS allergens
      FROM weekly_menu_items wmi
      JOIN dishes d ON wmi.dish_id = d.id
      LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
      WHERE wmi.weekly_menu_id = ?
      ORDER BY wmi.day_of_week, wmi.sort_order
    `).all(menu.id);

    const dayNames = { 1: 'Montag', 2: 'Dienstag', 3: 'Mittwoch', 4: 'Donnerstag', 5: 'Freitag', 6: 'Samstag' };

    if (menu.mode === 'daily') {
      result = {
        title: 'Wochenkarte',
        subtitle: formatWeekRange(menu.week_start),
        items: items.map(item => ({
          day: dayNames[item.day_of_week] || '',
          name: item.name,
          desc: item.description || '',
          price: formatPrice(item.price),
          allergens: item.allergens || '',
        })),
        note: menu.note || '',
      };
    } else {
      // weekly mode: ein Gericht fuer die ganze Woche
      result = {
        title: 'Wochenkarte',
        subtitle: formatWeekRange(menu.week_start),
        items: items.map(item => ({
          day: 'Wochengericht',
          name: item.name,
          desc: item.description || '',
          price: formatPrice(item.price),
          allergens: item.allergens || '',
        })),
        note: menu.note || '',
      };
    }
  }

  const json = JSON.stringify(result, null, 2);
  const filePath = path.join(WEBSITE_PATH, 'wochenkarte.json');

  writeJsonSafe(filePath, json);
  writeJsonSafe(filePath.replace('/enzo/', '/enzo-dev/'), json);

  return result;
}

// ═══════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════

function formatPrice(price) {
  if (!price && price !== 0) return '';
  return price.toFixed(2).replace('.', ',') + ' €';
}

function formatWeekRange(weekStart) {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 5); // Mo-Sa

  const opts = { day: '2-digit', month: '2-digit' };
  return `${start.toLocaleDateString('de-DE', opts)} – ${end.toLocaleDateString('de-DE', opts)}`;
}

function writeJsonSafe(filePath, json) {
  try {
    const dir = path.dirname(filePath);
    if (fs.existsSync(dir)) {
      fs.writeFileSync(filePath, json, 'utf-8');
      console.log(`  📄 Exportiert: ${filePath}`);
    }
  } catch (err) {
    console.error(`  ❌ Export fehlgeschlagen: ${filePath}`, err.message);
  }
}

// ═══════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════

// POST /api/export/speisekarte – Speisekarte exportieren
router.post('/speisekarte', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    const result = exportSpeisekarte();
    logAudit(req.user.id, 'create', 'export', null, { type: 'speisekarte', categories: result.categories.length }, req.ip);
    res.json({ message: `Speisekarte exportiert (${result.categories.length} Kategorien).`, data: result });
  } catch (err) {
    res.status(500).json({ error: 'Export fehlgeschlagen: ' + err.message });
  }
});

// POST /api/export/wochenkarte – Wochenkarte exportieren
router.post('/wochenkarte', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    const result = exportWochenkarte();
    logAudit(req.user.id, 'create', 'export', null, { type: 'wochenkarte' }, req.ip);
    res.json({ message: 'Wochenkarte exportiert.', data: result });
  } catch (err) {
    res.status(500).json({ error: 'Export fehlgeschlagen: ' + err.message });
  }
});

// POST /api/export/all – Beides exportieren
router.post('/all', authenticate, requireRole('inhaber', 'leitung'), (req, res) => {
  try {
    const speisekarte = exportSpeisekarte();
    const wochenkarte = exportWochenkarte();
    logAudit(req.user.id, 'create', 'export', null, { type: 'all' }, req.ip);
    res.json({ message: 'Speisekarte und Wochenkarte exportiert.' });
  } catch (err) {
    res.status(500).json({ error: 'Export fehlgeschlagen: ' + err.message });
  }
});

module.exports = router;
module.exports.exportSpeisekarte = exportSpeisekarte;
module.exports.exportWochenkarte = exportWochenkarte;
