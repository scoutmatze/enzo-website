/**
 * Seed-Script: Importiert die bestehende speisekarte.json in die Datenbank
 * 
 * Nutzung: node src/db/seed.js
 * 
 * Liest speisekarte.json und erstellt daraus:
 * - Menu-Kategorien
 * - Gerichte (im Kochbuch)
 * - Menu-Items (Verknuepfung Kategorie ↔ Gericht)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDb, initDatabase } = require('./init');

async function seed() {
  await initDatabase();
  const db = getDb();

  // Speisekarte JSON laden
  const jsonPath = path.resolve(__dirname, '../../speisekarte.json');
  if (!fs.existsSync(jsonPath)) {
    // Versuche im website-Ordner
    const altPath = path.resolve(__dirname, '../../../website/speisekarte.json');
    if (!fs.existsSync(altPath)) {
      console.error('speisekarte.json nicht gefunden! Lege sie neben das Script oder in website/');
      process.exit(1);
    }
    var data = JSON.parse(fs.readFileSync(altPath, 'utf-8'));
  } else {
    var data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  }

  console.log(`\nImportiere ${data.categories.length} Kategorien...\n`);

  // Settings aktualisieren
  if (data.intro) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('menu_intro', ?, CURRENT_TIMESTAMP)").run(data.intro);
  }
  if (data.allergenNote) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('allergen_note', ?, CURRENT_TIMESTAMP)").run(data.allergenNote);
  }

  const insertCategory = db.prepare('INSERT INTO menu_categories (name, sort_order) VALUES (?, ?)');
  const insertDish = db.prepare(`
    INSERT INTO dishes (name, description, category, base_price, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);
  const insertMenuItem = db.prepare(`
    INSERT INTO menu_items (category_id, dish_id, price, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  let totalDishes = 0;

  const importAll = db.transaction(() => {
    for (let catIdx = 0; catIdx < data.categories.length; catIdx++) {
      const cat = data.categories[catIdx];

      // Kategorie erstellen
      const catResult = insertCategory.run(cat.name, catIdx * 10);
      const categoryId = catResult.lastInsertRowid;

      console.log(`  📂 ${cat.name} (${cat.items.length} Gerichte)`);

      for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
        const item = cat.items[itemIdx];

        // Preis parsen ("12,90 €" → 12.90)
        let price = null;
        if (item.price) {
          const priceStr = item.price.replace('€', '').replace(',', '.').trim();
          price = parseFloat(priceStr) || null;
        }

        // Kategorie-ID fuer das Gericht ableiten
        const categoryMap = {
          'Antipasti': 'antipasti',
          'Primi Piatti': 'primi',
          'Pinse': 'pinse',
          'Secondi Piatti': 'secondi',
          'Dessert': 'dolci',
          'Illy Cafè': 'caffe',
          'Tee & Schokolade': 'tee',
          'Alkoholfreie Getränke': 'alkoholfrei',
          'Bier': 'bier',
          'Aperitivi & Longdrinks': 'aperitivi',
        };

        const dishCategory = categoryMap[cat.name] || 'sonstiges';

        // Gericht erstellen
        const dishResult = insertDish.run(
          item.name,
          item.desc || null,
          dishCategory,
          price
        );
        const dishId = dishResult.lastInsertRowid;

        // Menu-Item verknuepfen
        insertMenuItem.run(categoryId, dishId, price || 0, itemIdx * 10);

        totalDishes++;
      }
    }
  });

  importAll();

  console.log(`\n✅ Import abgeschlossen!`);
  console.log(`   ${data.categories.length} Kategorien`);
  console.log(`   ${totalDishes} Gerichte`);
  console.log(`\n   Allergene muessen noch pro Gericht ueber das Backend gepflegt werden.`);
  console.log(`   (Zutaten anlegen → Gerichten zuweisen → Allergene werden automatisch berechnet)\n`);
}

seed().catch(err => {
  console.error('Seed fehlgeschlagen:', err);
  process.exit(1);
});
