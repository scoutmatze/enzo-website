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
      SELECT wmi.day_of_week, wmi.price, wmi.custom_name, wmi.custom_description, wmi.custom_allergens,
        d.name, d.description,
        COALESCE(wmi.custom_allergens, das.allergens, '') AS allergens
      FROM weekly_menu_items wmi
      LEFT JOIN dishes d ON wmi.dish_id = d.id
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
          name: item.custom_name || item.name || '',
          desc: item.custom_description || item.description || '',
          price: formatPrice(item.price),
          allergens: item.allergens || '',
        })),
        note: menu.note || '',
      };
    } else {
      result = {
        title: 'Wochenkarte',
        subtitle: formatWeekRange(menu.week_start),
        items: items.map(item => ({
          day: 'Wochengericht',
          name: item.custom_name || item.name || '',
          desc: item.custom_description || item.description || '',
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

// ═══════════════════════════════════════════
// DRUCK-PDFs
// ═══════════════════════════════════════════

const FOOD_CATS = ['antipasti', 'primi', 'secondi', 'pinse', 'dolci', 'sonstiges'];
const DRINK_CATS = ['caffe', 'tee', 'alkoholfrei', 'bier', 'aperitivi', 'wein', 'digestivi'];

function getSetting(db, key, def) {
  return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || def;
}

function drawMenuHeader(doc, title, subtitle) {
  doc.fontSize(24).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.3);
  if (subtitle) { doc.fontSize(10).font('Helvetica').fillColor('#888').text(subtitle, { align: 'center' }); }
  doc.fillColor('#000');
  doc.moveDown(0.4);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).stroke();
  doc.moveDown(0.6);
}

function drawCategory(doc, catName, items) {
  // Estimate height: header(30) + items(22 each) + padding(20)
  const estHeight = 30 + items.length * 22 + 20;
  if (doc.y + estHeight > 760) doc.addPage();

  doc.fontSize(14).font('Helvetica-Bold').text(catName);
  doc.moveDown(0.3);

  for (const item of items) {
    if (doc.y > 740) doc.addPage();
    const y = doc.y;
    doc.fontSize(10).font('Helvetica-Bold').text(item.name, 50, y, { width: 340, continued: false });
    if (item.allergens) {
      doc.fontSize(7).font('Helvetica').fillColor('#999').text(' (' + item.allergens + ')', 50 + doc.widthOfString(item.name, { fontSize: 10 }) + 4, y + 1);
      doc.fillColor('#000');
    }
    if (item.price) {
      doc.fontSize(10).font('Helvetica').text(item.price, 460, y, { width: 85, align: 'right' });
    }
    if (item.desc) {
      doc.fontSize(8).font('Helvetica').fillColor('#666').text(item.desc, 50, doc.y + 1, { width: 400 });
      doc.fillColor('#000');
    }
    doc.moveDown(0.5);
  }
  doc.moveDown(0.4);
}

// GET /api/export/speisekarte-pdf
router.get('/speisekarte-pdf', authenticate, (req, res) => {
  try {
    const data = exportSpeisekarte();
    const db = getDb();
    const restaurantName = getSetting(db, 'restaurant_name', 'Da Enzo');
    const address = getSetting(db, 'address', '');
    const allergenNote = getSetting(db, 'allergen_note', '');

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Speisekarte.pdf"');
    doc.pipe(res);

    // ── ESSEN ──
    doc.fontSize(9).font('Helvetica').fillColor('#888').text(restaurantName + ' · ' + address, { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(0.5);
    drawMenuHeader(doc, 'Speisekarte', 'Essen');

    if (data.intro) {
      doc.fontSize(9).font('Helvetica').fillColor('#666').text(data.intro, { align: 'center' });
      doc.fillColor('#000');
      doc.moveDown(0.8);
    }

    const foodCats = data.categories.filter(c => {
      const key = c.name.toLowerCase().replace(/[^a-zäöü]/g, '');
      return !DRINK_CATS.some(d => key.includes(d));
    });
    const drinkCats = data.categories.filter(c => {
      const key = c.name.toLowerCase().replace(/[^a-zäöü]/g, '');
      return DRINK_CATS.some(d => key.includes(d));
    });

    for (const cat of foodCats) {
      drawCategory(doc, cat.name, cat.items);
    }

    // Allergen-Hinweis am Ende der Essen-Seite
    if (allergenNote) {
      if (doc.y > 680) doc.addPage();
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.3).stroke();
      doc.moveDown(0.5);
      doc.fontSize(6.5).font('Helvetica').fillColor('#999').text(allergenNote, { width: 495, lineGap: 2 });
      doc.fillColor('#000');
    }

    // ── GETRÄNKE ──
    if (drinkCats.length > 0) {
      doc.addPage();
      doc.fontSize(9).font('Helvetica').fillColor('#888').text(restaurantName + ' · ' + address, { align: 'center' });
      doc.fillColor('#000');
      doc.moveDown(0.5);
      drawMenuHeader(doc, 'Getränkekarte', '');

      for (const cat of drinkCats) {
        drawCategory(doc, cat.name, cat.items);
      }

      if (allergenNote) {
        if (doc.y > 680) doc.addPage();
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.3).stroke();
        doc.moveDown(0.5);
        doc.fontSize(6.5).font('Helvetica').fillColor('#999').text(allergenNote, { width: 495, lineGap: 2 });
        doc.fillColor('#000');
      }
    }

    doc.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/export/wochenkarte-pdf
router.get('/wochenkarte-pdf', authenticate, (req, res) => {
  try {
    const data = exportWochenkarte();
    const db = getDb();
    const restaurantName = getSetting(db, 'restaurant_name', 'Da Enzo');
    const address = getSetting(db, 'address', '');
    const allergenNote = getSetting(db, 'allergen_note', '');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Wochenkarte.pdf"');
    doc.pipe(res);

    doc.fontSize(9).font('Helvetica').fillColor('#888').text(restaurantName + ' · ' + address, { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(0.5);
    drawMenuHeader(doc, 'Wochenkarte', data.subtitle || '');

    for (const item of (data.items || [])) {
      if (doc.y > 700) doc.addPage();
      const y = doc.y;

      if (item.day) {
        doc.fontSize(11).font('Helvetica-Bold').text(item.day, 50, y, { width: 120 });
      }

      const nameX = item.day ? 170 : 50;
      doc.fontSize(11).font('Helvetica-Bold').text(item.name || '', nameX, y, { width: 280 });
      if (item.desc) {
        doc.fontSize(8).font('Helvetica').fillColor('#666').text(item.desc, nameX, doc.y + 1, { width: 280 });
        doc.fillColor('#000');
      }
      if (item.allergens) {
        doc.fontSize(7).font('Helvetica').fillColor('#999').text('Allergene: ' + item.allergens, nameX, doc.y + 1);
        doc.fillColor('#000');
      }

      if (item.price) {
        doc.fontSize(11).font('Helvetica').text(item.price, 460, y, { width: 85, align: 'right' });
      }

      doc.moveDown(0.8);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.2).strokeColor('#ddd').stroke();
      doc.strokeColor('#000');
      doc.moveDown(0.5);
    }

    if (data.note) {
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica').fillColor('#666').text(data.note, { align: 'center' });
      doc.fillColor('#000');
    }

    if (allergenNote) {
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.3).stroke();
      doc.moveDown(0.5);
      doc.fontSize(6.5).font('Helvetica').fillColor('#999').text(allergenNote, { width: 495, lineGap: 2 });
      doc.fillColor('#000');
    }

    doc.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.exportSpeisekarte = exportSpeisekarte;
module.exports.exportWochenkarte = exportWochenkarte;