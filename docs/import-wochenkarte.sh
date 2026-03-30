#!/bin/bash
# ═══════════════════════════════════════════
# Da Enzo – Wochenkarte Import
# Enzos aktuelle Karte: 23.03. – 04.04.2026
# ═══════════════════════════════════════════
DB="/opt/enzo-api/data/enzo.db"

echo "🍽️  Importiere Enzos Wochenkarte..."
echo ""

# ── 1. Gerichte ins Kochbuch ──
echo "1/3 Gerichte ins Kochbuch..."

# Antipasti
sqlite3 "$DB" "INSERT OR IGNORE INTO dishes (name, description, category, is_active, is_orderable) VALUES ('Austernpilze grigliati con rucola, pomodorini e scaglie di parmigiano', 'Gegrillte Austernpilze mit Rucola, Kirschtomaten und Parmesanspänen', 'antipasti', 1, 0);"
sqlite3 "$DB" "INSERT OR IGNORE INTO dishes (name, description, category, is_active, is_orderable) VALUES ('Tacchino con insalata fresca e funghi con crema di balsamico', 'Putenstreifen mit frischem Salat und Champignons mit Balsamicocreme', 'antipasti', 1, 0);"

# Primi Piatti
sqlite3 "$DB" "INSERT OR IGNORE INTO dishes (name, description, category, is_active, is_orderable) VALUES ('Linguine allo scoglio', 'Linguine mit Meeresfrüchten (Scampi, Calamari, Muscheln)', 'primi', 1, 0);"
sqlite3 "$DB" "INSERT OR IGNORE INTO dishes (name, description, category, is_active, is_orderable) VALUES ('Tagliatelle con gorgonzola e noci', 'Tagliatelle mit Gorgonzola und Walnüssen', 'primi', 1, 0);"
sqlite3 "$DB" "INSERT OR IGNORE INTO dishes (name, description, category, is_active, is_orderable) VALUES ('Tagliatelle ai porcini', 'Tagliatelle mit Steinpilzen', 'primi', 1, 0);"

# Secondi – Carne
sqlite3 "$DB" "INSERT OR IGNORE INTO dishes (name, description, category, is_active, is_orderable) VALUES ('Salsiccia con cime di rapa', 'Salsiccia mit Stängelkohl', 'secondi', 1, 0);"

# Secondi – Pesce
sqlite3 "$DB" "INSERT OR IGNORE INTO dishes (name, description, category, is_active, is_orderable) VALUES ('Scampi alla griglia con insalatina mista', 'Gegrillte Scampi mit gemischtem Salat', 'secondi', 1, 0);"

echo "  ✅ 7 Gerichte eingefügt"

# ── 2. Allergene zuweisen ──
echo ""
echo "2/3 Allergene zuweisen..."

# Allergene-Codes: A=Gluten, B=Krebstiere, C=Ei, G=Milch, H=Schalenfrüchte, R=Weichtiere

# Austernpilze mit Parmesan → G (Milch)
DISH_ID=$(sqlite3 "$DB" "SELECT id FROM dishes WHERE name LIKE 'Austernpilze%' LIMIT 1;")
if [ -n "$DISH_ID" ]; then
  sqlite3 "$DB" "INSERT OR IGNORE INTO dish_allergens (dish_id, allergen_id) SELECT $DISH_ID, id FROM allergens WHERE code = 'G';"
  echo "  ✅ Austernpilze: G"
fi

# Tacchino – keine typischen Hauptallergene
DISH_ID=$(sqlite3 "$DB" "SELECT id FROM dishes WHERE name LIKE 'Tacchino%' LIMIT 1;")
if [ -n "$DISH_ID" ]; then
  echo "  ℹ️  Tacchino: keine Standardallergene (ggf. manuell ergänzen)"
fi

# Linguine allo scoglio → A (Gluten), B (Krebstiere), R (Weichtiere)
DISH_ID=$(sqlite3 "$DB" "SELECT id FROM dishes WHERE name LIKE 'Linguine allo scoglio%' LIMIT 1;")
if [ -n "$DISH_ID" ]; then
  sqlite3 "$DB" "INSERT OR IGNORE INTO dish_allergens (dish_id, allergen_id) SELECT $DISH_ID, id FROM allergens WHERE code IN ('A','B','R');"
  echo "  ✅ Linguine allo scoglio: A, B, R"
fi

# Tagliatelle con gorgonzola e noci → A (Gluten), G (Milch), H (Schalenfrüchte)
DISH_ID=$(sqlite3 "$DB" "SELECT id FROM dishes WHERE name LIKE 'Tagliatelle con gorgonzola%' LIMIT 1;")
if [ -n "$DISH_ID" ]; then
  sqlite3 "$DB" "INSERT OR IGNORE INTO dish_allergens (dish_id, allergen_id) SELECT $DISH_ID, id FROM allergens WHERE code IN ('A','G','H');"
  echo "  ✅ Tagliatelle Gorgonzola: A, G, H"
fi

# Tagliatelle ai porcini → A (Gluten), G (Milch – Butter/Parmesan typisch)
DISH_ID=$(sqlite3 "$DB" "SELECT id FROM dishes WHERE name LIKE 'Tagliatelle ai porcini%' LIMIT 1;")
if [ -n "$DISH_ID" ]; then
  sqlite3 "$DB" "INSERT OR IGNORE INTO dish_allergens (dish_id, allergen_id) SELECT $DISH_ID, id FROM allergens WHERE code IN ('A','G');"
  echo "  ✅ Tagliatelle Porcini: A, G"
fi

# Salsiccia → keine Standard-Allergene (ggf. Senf/Sellerie je nach Rezept)
DISH_ID=$(sqlite3 "$DB" "SELECT id FROM dishes WHERE name LIKE 'Salsiccia%' LIMIT 1;")
if [ -n "$DISH_ID" ]; then
  echo "  ℹ️  Salsiccia: keine Standardallergene (ggf. manuell ergänzen)"
fi

# Scampi → B (Krebstiere)
DISH_ID=$(sqlite3 "$DB" "SELECT id FROM dishes WHERE name LIKE 'Scampi alla griglia%' LIMIT 1;")
if [ -n "$DISH_ID" ]; then
  sqlite3 "$DB" "INSERT OR IGNORE INTO dish_allergens (dish_id, allergen_id) SELECT $DISH_ID, id FROM allergens WHERE code = 'B';"
  echo "  ✅ Scampi: B"
fi

# ── 3. Wochenkarte erstellen ──
echo ""
echo "3/3 Wochenkarte erstellen (23.03. – 04.04.2026)..."

# Erst prüfen ob es schon eine gibt für diesen Zeitraum
EXISTING=$(sqlite3 "$DB" "SELECT id FROM weekly_menu WHERE week_start = '2026-03-23' LIMIT 1;")
if [ -n "$EXISTING" ]; then
  echo "  ⚠️  Wochenkarte ab 23.03. existiert bereits (ID: $EXISTING). Lösche und erstelle neu..."
  sqlite3 "$DB" "DELETE FROM weekly_menu_items WHERE weekly_menu_id = $EXISTING;"
  sqlite3 "$DB" "DELETE FROM weekly_menu WHERE id = $EXISTING;"
fi

# Wochenkarte anlegen
sqlite3 "$DB" "INSERT INTO weekly_menu (week_start, week_end, mode, note, is_published, created_by) VALUES ('2026-03-23', '2026-04-04', 'category', 'I dessert del giorno sono esposti nella nostra vetrina · Unsere Tagesdesserts finden Sie in unserer Vitrine oder fragen Sie unseren Service', 1, 1);"
WK_ID=$(sqlite3 "$DB" "SELECT id FROM weekly_menu ORDER BY id DESC LIMIT 1;")
echo "  Wochenkarte ID: $WK_ID"

# Items einfügen (mit Kategorie und Verweis auf Dish)
SORT=0

# Antipasti
for DNAME in "Austernpilze%" "Tacchino%"; do
  DID=$(sqlite3 "$DB" "SELECT id FROM dishes WHERE name LIKE '$DNAME' LIMIT 1;")
  if [ -n "$DID" ]; then
    PRICE=$(sqlite3 "$DB" "SELECT base_price FROM dishes WHERE id = $DID;")
    sqlite3 "$DB" "INSERT INTO weekly_menu_items (weekly_menu_id, dish_id, category, price, sort_order) VALUES ($WK_ID, $DID, 'antipasti', ${PRICE:-0}, $SORT);"
    SORT=$((SORT+1))
  fi
done

# Primi
for DNAME in "Linguine allo scoglio%" "Tagliatelle con gorgonzola%" "Tagliatelle ai porcini%"; do
  DID=$(sqlite3 "$DB" "SELECT id FROM dishes WHERE name LIKE '$DNAME' LIMIT 1;")
  if [ -n "$DID" ]; then
    PRICE=$(sqlite3 "$DB" "SELECT base_price FROM dishes WHERE id = $DID;")
    sqlite3 "$DB" "INSERT INTO weekly_menu_items (weekly_menu_id, dish_id, category, price, sort_order) VALUES ($WK_ID, $DID, 'primi', ${PRICE:-0}, $SORT);"
    SORT=$((SORT+1))
  fi
done

# Secondi – Carne
DID=$(sqlite3 "$DB" "SELECT id FROM dishes WHERE name LIKE 'Salsiccia%' LIMIT 1;")
if [ -n "$DID" ]; then
  PRICE=$(sqlite3 "$DB" "SELECT base_price FROM dishes WHERE id = $DID;")
  sqlite3 "$DB" "INSERT INTO weekly_menu_items (weekly_menu_id, dish_id, category, price, sort_order, custom_name) VALUES ($WK_ID, $DID, 'secondi', ${PRICE:-0}, $SORT, NULL);"
  SORT=$((SORT+1))
fi

# Secondi – Pesce
DID=$(sqlite3 "$DB" "SELECT id FROM dishes WHERE name LIKE 'Scampi alla griglia%' LIMIT 1;")
if [ -n "$DID" ]; then
  PRICE=$(sqlite3 "$DB" "SELECT base_price FROM dishes WHERE id = $DID;")
  sqlite3 "$DB" "INSERT INTO weekly_menu_items (weekly_menu_id, dish_id, category, price, sort_order) VALUES ($WK_ID, $DID, 'secondi', ${PRICE:-0}, $SORT);"
  SORT=$((SORT+1))
fi

echo "  ✅ $SORT Gerichte zur Wochenkarte hinzugefügt"

# ── 4. JSON exportieren ──
echo ""
echo "Website-Export..."
curl -s -X POST http://127.0.0.1:3000/api/export/wochenkarte \
  -H "Authorization: Bearer $(sqlite3 $DB "SELECT token FROM sessions ORDER BY id DESC LIMIT 1;" 2>/dev/null)" \
  -H "Content-Type: application/json" 2>/dev/null || echo "  ℹ️  JSON-Export manuell über Admin → Veröffentlichen"

echo ""
echo "═══════════════════════════════════════════"
echo "✅ Import abgeschlossen!"
echo ""
echo "Zusammenfassung:"
sqlite3 "$DB" "SELECT '  Gerichte im Kochbuch: ' || COUNT(*) FROM dishes WHERE is_active = 1;"
sqlite3 "$DB" "SELECT '  Wochenkarte ab: ' || week_start || ' bis ' || week_end FROM weekly_menu WHERE id = $WK_ID;"
sqlite3 "$DB" "SELECT '  Gerichte auf Karte: ' || COUNT(*) FROM weekly_menu_items WHERE weekly_menu_id = $WK_ID;"
echo ""
echo "⚠️  Preise sind noch 0 – bitte im Admin-Backend ergänzen!"
echo "⚠️  Allergene Tacchino + Salsiccia manuell prüfen!"
echo "⚠️  Dessert-Hinweis steht als Fußnote – kein eigenes Gericht."
echo ""
echo "Nächste Schritte:"
echo "  1. Admin öffnen → Wochenkarte → Preise eintragen"
echo "  2. Allergene bei Tacchino + Salsiccia prüfen"
echo "  3. Veröffentlichen klicken (aktualisiert Website)"
echo "═══════════════════════════════════════════"
