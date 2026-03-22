/**
 * Seed-Allergene: Erstellt Zutaten mit Allergenen und weist sie den Gerichten zu
 * 
 * Nutzung: node src/db/seed-allergens.js
 */

require('dotenv').config();
const { getDb, initDatabase } = require('./init');

async function seedAllergens() {
  await initDatabase();
  const db = getDb();

  // ═══════════════════════════════════════════
  // ZUTATEN MIT ALLERGENEN
  // A=Gluten B=Krebstiere C=Eier D=Fisch E=Erdnüsse
  // F=Soja G=Milch H=Schalenfrüchte L=Sellerie
  // M=Senf N=Weichtiere O=Sulfite P=Lupinen Q=Sesam
  // ═══════════════════════════════════════════

  const INGREDIENTS = [
    // Mehl & Getreide
    { name: 'Weizenmehl', allergens: ['A'] },
    { name: 'Hartweizengrieß (Semola)', allergens: ['A'] },
    { name: 'Paniermehl', allergens: ['A', 'C'] },
    { name: 'Pizzateig / Pinsateig', allergens: ['A'] },
    { name: 'Pasta (Weizen)', allergens: ['A'] },
    { name: 'Lasagneplatten', allergens: ['A', 'C'] },
    { name: 'Ravioli-Teig', allergens: ['A', 'C'] },

    // Milchprodukte
    { name: 'Mozzarella', allergens: ['G'] },
    { name: 'Büffelmozzarella', allergens: ['G'] },
    { name: 'Fior di Latte', allergens: ['G'] },
    { name: 'Parmesan (Parmigiano)', allergens: ['G'] },
    { name: 'Grana Padano', allergens: ['G'] },
    { name: 'Pecorino', allergens: ['G'] },
    { name: 'Ricotta', allergens: ['G'] },
    { name: 'Butter', allergens: ['G'] },
    { name: 'Sahne', allergens: ['G'] },
    { name: 'Béchamelsauce', allergens: ['A', 'G'] },
    { name: 'Milch', allergens: ['G'] },

    // Eier
    { name: 'Ei', allergens: ['C'] },

    // Fisch & Meeresfrüchte
    { name: 'Thunfisch', allergens: ['D'] },
    { name: 'Dorade (Orata)', allergens: ['D'] },
    { name: 'Garnelen (Gamberi)', allergens: ['B'] },
    { name: 'Kapern', allergens: [] },
    { name: 'Sardellen (Anchovis)', allergens: ['D'] },

    // Fleisch & Wurst
    { name: 'Rinderhack', allergens: [] },
    { name: 'Rindfleisch', allergens: [] },
    { name: 'Kalbfleisch', allergens: [] },
    { name: 'Gekochter Schinken (Prosciutto Cotto)', allergens: [] },
    { name: 'Parmaschinken (Prosciutto Crudo)', allergens: [] },
    { name: 'Scharfe Salami (Diavola)', allergens: [] },
    { name: 'Italienische Wurstwaren', allergens: [] },

    // Gemüse & Kräuter
    { name: 'Tomaten', allergens: [] },
    { name: 'Tomatensauce', allergens: [] },
    { name: 'Aubergine', allergens: [] },
    { name: 'Zucchini', allergens: [] },
    { name: 'Rucola', allergens: [] },
    { name: 'Grüne Bohnen', allergens: [] },
    { name: 'Gegrilltes Gemüse', allergens: [] },
    { name: 'Zwiebeln', allergens: [] },
    { name: 'Kartoffeln', allergens: [] },
    { name: 'Steinpilze', allergens: [] },
    { name: 'Basilikum', allergens: [] },
    { name: 'Salbei', allergens: [] },
    { name: 'Rosmarin', allergens: [] },
    { name: 'Knoblauch', allergens: [] },

    // Pesto & Saucen
    { name: 'Pesto alla Genovese', allergens: ['H', 'G'] }, // Pinienkerne + Parmesan
    { name: 'Thunfischsauce (Tonnato)', allergens: ['D', 'C'] }, // Thunfisch + Ei (Mayo)

    // Öle & Gewürze
    { name: 'Olivenöl', allergens: [] },
    { name: 'Zitrone', allergens: [] },
    { name: 'Peperoncino (Chili)', allergens: [] },
    { name: 'Salz & Pfeffer', allergens: [] },

    // Nüsse
    { name: 'Pinienkerne', allergens: ['H'] },

    // Getränke-Zutaten
    { name: 'Kaffee (Illy)', allergens: [] },
    { name: 'Kakao / Schokolade (Domori)', allergens: ['G'] },
    { name: 'Honig', allergens: [] },
    { name: 'Prosecco', allergens: ['O'] }, // Sulfite im Wein
    { name: 'Wein / Vermouth', allergens: ['O'] },
    { name: 'Campari / Aperol', allergens: [] },
    { name: 'Spirituosen', allergens: [] },
    { name: 'Holundersirup', allergens: [] },

    // Bier
    { name: 'Bier (Gerste/Weizen)', allergens: ['A'] },

    // Sonstiges
    { name: 'Senf', allergens: ['M'] },
    { name: 'Sellerie', allergens: ['L'] },
    { name: 'Sojasauce', allergens: ['F'] },
  ];

  // ═══════════════════════════════════════════
  // GERICHT → ZUTATEN ZUORDNUNG
  // Basierend auf Name und Beschreibung
  // ═══════════════════════════════════════════

  const DISH_INGREDIENTS = {
    // === ANTIPASTI ===
    'Caprese': ['Mozzarella', 'Tomaten', 'Pesto alla Genovese', 'Olivenöl', 'Basilikum'],
    'Parmigiana di Melanzane': ['Aubergine', 'Tomaten', 'Tomatensauce', 'Parmesan (Parmigiano)', 'Mozzarella', 'Olivenöl', 'Basilikum'],
    'Vitello Tonnato': ['Kalbfleisch', 'Thunfischsauce (Tonnato)', 'Kapern', 'Olivenöl', 'Zitrone'],
    'Carpaccio di Manzo': ['Rindfleisch', 'Rucola', 'Parmesan (Parmigiano)', 'Olivenöl', 'Zitrone'],
    'Antipasto all\'Italiana': ['Italienische Wurstwaren', 'Parmesan (Parmigiano)', 'Gegrilltes Gemüse', 'Olivenöl'],

    // === PRIMI PIATTI ===
    'Trofie al Pesto': ['Pasta (Weizen)', 'Pesto alla Genovese', 'Grüne Bohnen', 'Kartoffeln', 'Olivenöl'],
    'Pennette all\'Arrabbiata': ['Pasta (Weizen)', 'Tomatensauce', 'Peperoncino (Chili)', 'Knoblauch', 'Olivenöl'],
    'Spaghetti alla Bolognese': ['Pasta (Weizen)', 'Rinderhack', 'Tomatensauce', 'Tomaten', 'Zwiebeln', 'Sellerie', 'Olivenöl'],
    'Lasagne al Forno': ['Lasagneplatten', 'Rinderhack', 'Tomatensauce', 'Béchamelsauce', 'Parmesan (Parmigiano)', 'Olivenöl'],
    'Ravioli gefüllt mit Steinpilzen': ['Ravioli-Teig', 'Steinpilze', 'Butter', 'Salbei', 'Parmesan (Parmigiano)'],
    'Paccheri con Gamberi e Zucchine': ['Pasta (Weizen)', 'Garnelen (Gamberi)', 'Zucchini', 'Knoblauch', 'Olivenöl', 'Tomaten'],

    // === PINSE ===
    'Margherita': ['Pizzateig / Pinsateig', 'Fior di Latte', 'Tomatensauce', 'Basilikum', 'Olivenöl'],
    'Bufalina': ['Pizzateig / Pinsateig', 'Büffelmozzarella', 'Tomatensauce', 'Basilikum', 'Olivenöl'],
    'Cotto e Mozzarella': ['Pizzateig / Pinsateig', 'Mozzarella', 'Gekochter Schinken (Prosciutto Cotto)', 'Tomatensauce', 'Olivenöl'],
    'Diavola': ['Pizzateig / Pinsateig', 'Mozzarella', 'Scharfe Salami (Diavola)', 'Tomatensauce', 'Olivenöl'],
    'Tonno e Cipolla': ['Pizzateig / Pinsateig', 'Mozzarella', 'Thunfisch', 'Zwiebeln', 'Tomatensauce', 'Olivenöl'],
    'Rucola, Crudo e Grana': ['Pizzateig / Pinsateig', 'Grana Padano', 'Parmaschinken (Prosciutto Crudo)', 'Rucola', 'Tomatensauce', 'Olivenöl'],

    // === SECONDI ===
    'Scaloppine al Limone': ['Kalbfleisch', 'Weizenmehl', 'Butter', 'Zitrone', 'Kartoffeln', 'Rosmarin', 'Olivenöl'],
    'Tagliata di Manzo': ['Rindfleisch', 'Rucola', 'Parmesan (Parmigiano)', 'Tomaten', 'Olivenöl'],
    'Filetto di Orata su Verdure Grigliate': ['Dorade (Orata)', 'Gegrilltes Gemüse', 'Olivenöl', 'Zitrone'],

    // === DESSERT ===
    'Dessertvariation aus der Vitrine': ['Weizenmehl', 'Ei', 'Butter', 'Sahne', 'Milch'],

    // === CAFFÈ ===
    'Espresso': ['Kaffee (Illy)'],
    'Espresso Deca': ['Kaffee (Illy)'],
    'Espresso Doppio': ['Kaffee (Illy)'],
    'Espresso Corretto': ['Kaffee (Illy)', 'Spirituosen'],
    'Café Americano': ['Kaffee (Illy)'],
    'Cappuccino': ['Kaffee (Illy)', 'Milch'],
    'Cappuccino Viennese': ['Kaffee (Illy)', 'Milch', 'Sahne'],
    'Latte Macchiato': ['Kaffee (Illy)', 'Milch'],
    'Marocchino': ['Kaffee (Illy)', 'Milch', 'Kakao / Schokolade (Domori)'],
    'Café Shakerato': ['Kaffee (Illy)', 'Milch', 'Ei'],

    // === TEE ===
    'Earl Grey / Darjeeling / Früchte Tee': [],
    'Grüner Tee Jasmin / Kamillen Tee': [],
    'Rooibos / Fr. Minze mit Honig': ['Honig'],
    'Heiße Schokolade (Domori)': ['Kakao / Schokolade (Domori)', 'Milch', 'Sahne'],

    // === ALKOHOLFREI ===
    'Aqua Morelli': [],
    'Coca-Cola / Orangina / Limonata': [],
    'Tonic Water / Ginger Ale': [],
    'Crodino / SanBitter': [],
    'Säfte': [],
    'Saftschorle': [],

    // === BIER ===
    'Peroni': ['Bier (Gerste/Weizen)'],
    'Augustiner Hell': ['Bier (Gerste/Weizen)'],
    'Franziskaner Weißbier': ['Bier (Gerste/Weizen)'],
    'Alkoholfreies Bier / Gösser Radler': ['Bier (Gerste/Weizen)'],

    // === APERITIVI ===
    'Aperol Spritz': ['Prosecco', 'Campari / Aperol'],
    'Hugo': ['Prosecco', 'Holundersirup'],
    'Crodino / SanBitter / Sarti Spritz': ['Prosecco'],
    'Italicus Spritz': ['Prosecco'],
    'Americano / Negroni': ['Wein / Vermouth', 'Campari / Aperol'],
    'Espresso Martini': ['Kaffee (Illy)', 'Spirituosen'],
    'Campari / Martini / Tocco Rosso': ['Campari / Aperol'],
    'Vodka Lemon / Gin Tonic / Cuba Libre': ['Spirituosen'],
    'Digestivi': ['Spirituosen'],
  };

  // ═══════════════════════════════════════════
  // AUSFÜHREN
  // ═══════════════════════════════════════════

  console.log('\n🧂 Erstelle Zutaten mit Allergenen...\n');

  // Alte Zuordnungen löschen (falls erneut ausgeführt)
  db.exec('DELETE FROM dish_ingredients');
  db.exec('DELETE FROM ingredient_allergens');
  db.exec('DELETE FROM ingredients');

  const insertIng = db.prepare('INSERT INTO ingredients (name) VALUES (?)');
  const insertIA = db.prepare('INSERT INTO ingredient_allergens (ingredient_id, allergen_id) VALUES (?, ?)');
  const insertDI = db.prepare('INSERT INTO dish_ingredients (dish_id, ingredient_id) VALUES (?, ?)');

  // Zutaten-Map: Name → ID
  const ingMap = {};

  const createIngredients = db.transaction(() => {
    for (const ing of INGREDIENTS) {
      const result = insertIng.run(ing.name);
      const id = result.lastInsertRowid;
      ingMap[ing.name] = id;

      for (const allergenId of ing.allergens) {
        insertIA.run(id, allergenId);
      }
    }
  });

  createIngredients();
  console.log(`  ✅ ${INGREDIENTS.length} Zutaten erstellt`);

  // Allergen-Statistik
  const allergenCount = {};
  for (const ing of INGREDIENTS) {
    for (const a of ing.allergens) {
      allergenCount[a] = (allergenCount[a] || 0) + 1;
    }
  }
  console.log(`  📊 Allergen-Verteilung: ${Object.entries(allergenCount).map(([k, v]) => `${k}=${v}`).join(', ')}`);

  // Gerichte laden
  const dishes = db.prepare('SELECT id, name FROM dishes').all();
  console.log(`\n📖 Weise ${dishes.length} Gerichten ihre Zutaten zu...\n`);

  let assignedCount = 0;
  let skippedCount = 0;

  const assignIngredients = db.transaction(() => {
    for (const dish of dishes) {
      const ingredientNames = DISH_INGREDIENTS[dish.name];

      if (!ingredientNames || ingredientNames.length === 0) {
        skippedCount++;
        continue;
      }

      for (const ingName of ingredientNames) {
        const ingId = ingMap[ingName];
        if (ingId) {
          insertDI.run(dish.id, ingId);
        } else {
          console.log(`  ⚠️  Zutat "${ingName}" für "${dish.name}" nicht gefunden`);
        }
      }
      assignedCount++;
    }
  });

  assignIngredients();

  // Ergebnis anzeigen
  console.log(`  ✅ ${assignedCount} Gerichte mit Zutaten verknüpft`);
  console.log(`  ⏭️  ${skippedCount} Gerichte ohne Zutaten (Getränke etc.)`);

  // Allergene pro Gericht anzeigen
  console.log('\n📋 Berechnete Allergene pro Gericht:\n');
  const dishAllergens = db.prepare(`
    SELECT d.name, COALESCE(das.allergens, '–') AS allergens
    FROM dishes d
    LEFT JOIN dish_allergen_string das ON d.id = das.dish_id
    ORDER BY d.category, d.name
  `).all();

  const maxName = Math.max(...dishAllergens.map(d => d.name.length));
  for (const d of dishAllergens) {
    const pad = ' '.repeat(maxName - d.name.length + 2);
    console.log(`  ${d.name}${pad}${d.allergens}`);
  }

  console.log(`\n✅ Seed abgeschlossen!\n`);
}

seedAllergens().catch(err => {
  console.error('Seed fehlgeschlagen:', err);
  process.exit(1);
});
