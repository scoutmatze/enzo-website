const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
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
    WHERE is_published = 1 AND week_start <= ? AND (week_end IS NULL OR week_end >= ?)
    ORDER BY week_start DESC LIMIT 1
  `).get(today, today);

  let result;

  if (!menu) {
    result = {
      title: 'Le specialità dello Chef',
      subtitle: 'Aktuell keine Spezialitäten verfügbar.',
      categories: [],
    };
  } else {
    const items = db.prepare(`
      SELECT wmi.*, wmi.category AS item_category,
        COALESCE(wmi.custom_name, d.name) AS dish_name,
        COALESCE(wmi.custom_description, d.description) AS dish_description,
        COALESCE(wmi.custom_allergens, das.allergens, '') AS allergens,
        d.category AS dish_category
      FROM weekly_menu_items wmi
      LEFT JOIN dishes d ON wmi.dish_id = d.id
      LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
      WHERE wmi.weekly_menu_id = ?
      ORDER BY wmi.sort_order, wmi.category, d.name
    `).all(menu.id);

    const catLabels = { antipasti: 'Antipasti', primi: 'Primi Piatti', secondi: 'Secondi', pinse: 'Pinse & Pizza', dolci: 'Dolci', caffe: 'Caffè', alkoholfrei: 'Alkoholfrei', bier: 'Birra', aperitivi: 'Aperitivi', wein: 'Vino', digestivi: 'Digestivi', sonstiges: 'Sonstiges' };

    // Nach Kategorie gruppieren
    const grouped = {};
    for (const item of items) {
      const cat = item.item_category || item.dish_category || 'sonstiges';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        name: item.dish_name || '',
        desc: item.dish_description || '',
        price: formatPrice(item.price),
        allergens: item.allergens || '',
      });
    }

    const startDate = new Date(menu.week_start);
    const endDate = menu.week_end ? new Date(menu.week_end) : new Date(startDate.getTime() + 13 * 86400000);
    const dateOpts = { day: '2-digit', month: '2-digit' };
    const subtitle = `${startDate.toLocaleDateString('de-DE', dateOpts)} – ${endDate.toLocaleDateString('de-DE', { ...dateOpts, year: 'numeric' })}`;

    result = {
      title: 'Le specialità dello Chef',
      subtitle,
      categories: Object.entries(grouped).map(([key, items]) => ({
        name: catLabels[key] || key,
        key,
        items,
      })),
      note: menu.note || '',
    };
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

// ═══════════════════════════════════════════
// DRUCK-PDFs – Da Enzo Design
// ═══════════════════════════════════════════

const DRINK_CATS = ['caffe', 'tee', 'alkoholfrei', 'bier', 'aperitivi', 'wein', 'digestivi'];

// Design Tokens
const C = {
  terra: '#B85A3A',
  espresso: '#2A1F17',
  gold: '#C9A96E',
  cream: '#FAF5EE',
  olive: '#5C6B4E',
  muted: '#8B7E74',
  light: '#D4C9BC',
};

function getSetting(db, key, def) {
  return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || def;
}

// Elegante Trennlinie mit Ornament
function drawOrnament(doc, y) {
  const cx = 297.5;
  doc.lineWidth(0.4).strokeColor(C.gold);
  doc.moveTo(100, y).lineTo(cx - 15, y).stroke();
  doc.moveTo(cx + 15, y).lineTo(495, y).stroke();
  // Kleiner Diamant in der Mitte
  doc.save();
  doc.moveTo(cx, y - 3).lineTo(cx + 4, y).lineTo(cx, y + 3).lineTo(cx - 4, y).closePath().fillColor(C.gold).fill();
  doc.restore();
  doc.strokeColor(C.espresso);
}

// Seiten-Header mit Restaurant-Name
function drawPageHeader(doc, restaurantName, address) {
  doc.fontSize(8).font('Helvetica').fillColor(C.muted);
  doc.text(restaurantName, 50, 35, { align: 'center', width: 495 });
  doc.text(address, 50, 46, { align: 'center', width: 495 });
  doc.fillColor(C.espresso);
  drawOrnament(doc, 62);
  doc.y = 75;
}

// Großer Titel
function drawMenuTitle(doc, title, subtitle) {
  doc.moveDown(0.8);
  doc.fontSize(28).font('Helvetica-Bold').fillColor(C.espresso);
  doc.text(title, { align: 'center' });

  if (subtitle) {
    doc.moveDown(0.15);
    doc.fontSize(10).font('Helvetica').fillColor(C.gold).text(subtitle, { align: 'center' });
  }

  doc.fillColor(C.espresso);
  doc.moveDown(0.5);
  drawOrnament(doc, doc.y);
  doc.moveDown(1);
}

// Kategorie-Überschrift
function drawCategoryHeader(doc, name) {
  doc.moveDown(0.3);
  doc.fontSize(14).font('Helvetica-Bold').fillColor(C.terra);
  doc.text(name.toUpperCase(), { align: 'center', characterSpacing: 3 });
  doc.fillColor(C.espresso);

  // Dezente Linie unter der Kategorie
  const lineY = doc.y + 4;
  doc.lineWidth(0.3).strokeColor(C.light);
  doc.moveTo(180, lineY).lineTo(415, lineY).stroke();
  doc.strokeColor(C.espresso);
  doc.moveDown(0.6);
}

// Gericht mit Punkt-Linie zum Preis
function drawDish(doc, item) {
  if (doc.y > 720) doc.addPage();
  const y = doc.y;

  // Name
  doc.fontSize(10).font('Helvetica-Bold').fillColor(C.espresso);
  const nameW = doc.widthOfString(item.name);
  doc.text(item.name, 65, y);

  // Allergene direkt hinter dem Namen
  if (item.allergens) {
    const allergenX = 65 + nameW + 3;
    doc.fontSize(6.5).font('Helvetica').fillColor(C.gold);
    doc.text(item.allergens, allergenX, y + 2, { width: 100 });
  }

  // Preis rechts
  if (item.price) {
    doc.fontSize(10).font('Helvetica').fillColor(C.espresso);
    const priceW = doc.widthOfString(item.price);
    doc.text(item.price, 530 - priceW, y);

    // Punkt-Linie zwischen Name und Preis
    const dotsStart = 65 + nameW + (item.allergens ? doc.widthOfString(item.allergens, { fontSize: 6.5 }) + 10 : 5);
    const dotsEnd = 530 - priceW - 8;
    if (dotsEnd > dotsStart + 20) {
      doc.fontSize(8).fillColor(C.light);
      let dots = '';
      const dotW = doc.widthOfString('.', { fontSize: 8 });
      for (let x = dotsStart; x < dotsEnd; x += dotW + 1.5) dots += '.';
      doc.text(dots, dotsStart, y + 1, { width: dotsEnd - dotsStart });
    }
  }

  doc.fillColor(C.espresso);

  // Beschreibung
  if (item.desc) {
    doc.fontSize(8).font('Helvetica').fillColor(C.muted);
    doc.text(item.desc, 65, doc.y + 2, { width: 420 });
    doc.fillColor(C.espresso);
  }

  doc.moveDown(0.6);
}

// Kategorie mit Seitenumbruch-Check
function drawCategory(doc, catName, items) {
  const estHeight = 40 + items.length * 28;
  if (doc.y + Math.min(estHeight, 100) > 720) doc.addPage();

  drawCategoryHeader(doc, catName);
  for (const item of items) drawDish(doc, item);
  doc.moveDown(0.3);
}

// Allergen-Fußnote
function drawAllergenNote(doc, text) {
  if (!text) return;
  if (doc.y > 660) doc.addPage();
  doc.moveDown(1.5);
  drawOrnament(doc, doc.y);
  doc.moveDown(0.6);
  doc.fontSize(6).font('Helvetica').fillColor(C.muted);
  doc.text(text, 65, doc.y, { width: 465, lineGap: 2, align: 'center' });
  doc.fillColor(C.espresso);
}

// GET /api/export/speisekarte-pdf
router.get('/speisekarte-pdf', authenticate, (req, res) => {
  try {
    const data = exportSpeisekarte();
    const db = getDb();
    const restaurantName = getSetting(db, 'restaurant_name', 'Da Enzo – Caffé & Ristorante');
    const address = getSetting(db, 'address', 'Zschokkestraße 34, 80686 München');
    const allergenNote = getSetting(db, 'allergen_note', '');

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Speisekarte.pdf"');
    doc.pipe(res);

    // Essen & Getränke trennen
    const foodCats = data.categories.filter(c => {
      const key = c.name.toLowerCase().replace(/[^a-zäöü]/g, '');
      return !DRINK_CATS.some(d => key.includes(d));
    });
    const drinkCats = data.categories.filter(c => {
      const key = c.name.toLowerCase().replace(/[^a-zäöü]/g, '');
      return DRINK_CATS.some(d => key.includes(d));
    });

    // ── SEITE: ESSEN ──
    drawPageHeader(doc, restaurantName, address);
    drawMenuTitle(doc, 'Speisekarte', 'Buon Appetito');

    if (data.intro) {
      doc.fontSize(9).font('Helvetica').fillColor(C.muted).text(data.intro, 80, doc.y, { align: 'center', width: 435 });
      doc.fillColor(C.espresso);
      doc.moveDown(1);
    }

    for (const cat of foodCats) drawCategory(doc, cat.name, cat.items);
    drawAllergenNote(doc, allergenNote);

    // ── SEITE: GETRÄNKE ──
    if (drinkCats.length > 0) {
      doc.addPage();
      drawPageHeader(doc, restaurantName, address);
      drawMenuTitle(doc, 'Getränkekarte', 'Bevande');

      for (const cat of drinkCats) drawCategory(doc, cat.name, cat.items);
      drawAllergenNote(doc, allergenNote);
    }

    doc.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/export/wochenkarte-pdf
router.get('/wochenkarte-pdf', authenticate, (req, res) => {
  try {
    const data = exportWochenkarte();
    const db = getDb();
    const restaurantName = getSetting(db, 'restaurant_name', 'Da Enzo – Caffé & Ristorante');
    const address = getSetting(db, 'address', 'Zschokkestraße 34, 80687 München');
    const allergenNote = getSetting(db, 'allergen_note', '');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Wochenkarte.pdf"');
    doc.pipe(res);

    // Logo (Stein) oben mittig – falls vorhanden
    const logoPath = path.join(WEBSITE_PATH, 'img', 'logo-footer.webp');
    const logoPng = path.join(WEBSITE_PATH, 'img', 'logo-stamp.png');
    try {
      const lp = require('fs').existsSync(logoPng) ? logoPng : (require('fs').existsSync(logoPath) ? logoPath : null);
      if (lp) {
        doc.image(lp, 248, 30, { width: 100 });
        doc.y = 90;
      }
    } catch (e) { /* Logo nicht verfügbar */ }

    drawPageHeader(doc, restaurantName, address);
    drawMenuTitle(doc, 'Le specialità dello Chef', data.subtitle || '');

    // Kategorien rendern
    const categories = data.categories || [];
    if (categories.length === 0 && data.items) {
      // Fallback: alte Format-Kompatibilität
      for (const item of data.items) drawDish(doc, item);
    } else {
      for (const cat of categories) {
        if (!cat.items || cat.items.length === 0) continue;
        drawCategory(doc, cat.name, cat.items);
      }
    }

    // Fußnote
    if (data.note) {
      doc.moveDown(0.8);
      doc.fontSize(9).font('Helvetica').fillColor(C.muted).text(data.note, { align: 'center' });
      doc.fillColor(C.espresso);
    }

    drawAllergenNote(doc, allergenNote);
    doc.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.exportSpeisekarte = exportSpeisekarte;
module.exports.exportWochenkarte = exportWochenkarte;