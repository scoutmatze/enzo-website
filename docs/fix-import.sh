#!/bin/bash
# ═══════════════════════════════════════════
# Da Enzo – Vollständiger Import Wochenkarte
# Gerichte + Allergene + Zutaten
# ═══════════════════════════════════════════
DB="/opt/enzo-api/data/enzo.db"
echo "🍽️  Vollständiger Wochenkarten-Import"
echo ""

# ── Schema prüfen ──
echo "Schema-Check..."
sqlite3 "$DB" ".schema dish_allergens" 2>/dev/null
sqlite3 "$DB" ".schema dish_ingredients" 2>/dev/null
echo ""

# ── 1. Allergene direkt in dish_allergens ──
echo "1/3 Allergene zuweisen..."

# Austernpilze (ID 55): G (Milch – Parmesan)
sqlite3 "$DB" "DELETE FROM dish_allergens WHERE dish_id = 55;"
sqlite3 "$DB" "INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (55, 'G');"
echo "  ✅ Austernpilze: G (Milch/Parmesan)"

# Tacchino (ID 56): keine Hauptallergene, ggf. L (Sellerie) je nach Balsamico
sqlite3 "$DB" "DELETE FROM dish_allergens WHERE dish_id = 56;"
sqlite3 "$DB" "INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (56, 'L');"
echo "  ✅ Tacchino: L (Sellerie – Balsamico)"

# Linguine allo scoglio (ID 57): A (Gluten), B (Krebstiere), R (Weichtiere)
sqlite3 "$DB" "DELETE FROM dish_allergens WHERE dish_id = 57;"
sqlite3 "$DB" "INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (57, 'A');"
sqlite3 "$DB" "INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (57, 'B');"
sqlite3 "$DB" "INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (57, 'R');"
echo "  ✅ Linguine allo scoglio: A, B, R"

# Tagliatelle gorgonzola e noci (ID 58): A (Gluten), G (Milch), H (Schalenfrüchte)
sqlite3 "$DB" "DELETE FROM dish_allergens WHERE dish_id = 58;"
sqlite3 "$DB" "INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (58, 'A');"
sqlite3 "$DB" "INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (58, 'G');"
sqlite3 "$DB" "INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (58, 'H');"
echo "  ✅ Tagliatelle Gorgonzola: A, G, H"

# Tagliatelle ai porcini (ID 59): A (Gluten), G (Milch)
sqlite3 "$DB" "DELETE FROM dish_allergens WHERE dish_id = 59;"
sqlite3 "$DB" "INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (59, 'A');"
sqlite3 "$DB" "INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (59, 'G');"
echo "  ✅ Tagliatelle Porcini: A, G"

# Salsiccia (ID 60): ggf. keine Standard-Allergene
sqlite3 "$DB" "DELETE FROM dish_allergens WHERE dish_id = 60;"
echo "  ℹ️  Salsiccia: keine Standardallergene (Enzo fragen!)"

# Scampi (ID 61): B (Krebstiere)
sqlite3 "$DB" "DELETE FROM dish_allergens WHERE dish_id = 61;"
sqlite3 "$DB" "INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (61, 'B');"
echo "  ✅ Scampi: B (Krebstiere)"

# ── 2. Zutaten anlegen und verknüpfen ──
echo ""
echo "2/3 Zutaten anlegen..."

# Hilfsfunktion: Zutat anlegen falls nicht vorhanden, ID zurückgeben
add_ingredient() {
  local NAME="$1"
  sqlite3 "$DB" "INSERT OR IGNORE INTO ingredients (name) VALUES ('$NAME');"
  sqlite3 "$DB" "SELECT id FROM ingredients WHERE name = '$NAME';"
}

link_dish_ingredient() {
  local DISH_ID=$1
  local ING_ID=$2
  sqlite3 "$DB" "INSERT OR IGNORE INTO dish_ingredients (dish_id, ingredient_id) VALUES ($DISH_ID, $ING_ID);" 2>/dev/null
}

# Prüfe ob dish_ingredients existiert
HAS_DI=$(sqlite3 "$DB" "SELECT name FROM sqlite_master WHERE type='table' AND name='dish_ingredients';" 2>/dev/null)
if [ -z "$HAS_DI" ]; then
  echo "  ⚠️  Tabelle dish_ingredients existiert nicht – erstelle sie..."
  sqlite3 "$DB" "CREATE TABLE IF NOT EXISTS dish_ingredients (dish_id INTEGER NOT NULL, ingredient_id INTEGER NOT NULL, quantity TEXT, unit TEXT, PRIMARY KEY (dish_id, ingredient_id));"
fi

# Austernpilze (55)
for ING in "Austernpilze" "Rucola" "Kirschtomaten" "Parmesan" "Olivenöl" "Knoblauch"; do
  IID=$(add_ingredient "$ING")
  link_dish_ingredient 55 "$IID"
done
echo "  ✅ Austernpilze: 6 Zutaten"

# Tacchino (56)
for ING in "Putenbrust" "Blattsalat" "Champignons" "Balsamico-Creme" "Olivenöl" "Kirschtomaten"; do
  IID=$(add_ingredient "$ING")
  link_dish_ingredient 56 "$IID"
done
echo "  ✅ Tacchino: 6 Zutaten"

# Linguine allo scoglio (57)
for ING in "Linguine" "Scampi" "Calamari" "Miesmuscheln" "Knoblauch" "Weißwein" "Kirschtomaten" "Petersilie" "Olivenöl" "Peperoncino"; do
  IID=$(add_ingredient "$ING")
  link_dish_ingredient 57 "$IID"
done
echo "  ✅ Linguine allo scoglio: 10 Zutaten"

# Tagliatelle con gorgonzola e noci (58)
for ING in "Tagliatelle" "Gorgonzola" "Walnüsse" "Sahne" "Butter" "Parmesan"; do
  IID=$(add_ingredient "$ING")
  link_dish_ingredient 58 "$IID"
done
echo "  ✅ Tagliatelle Gorgonzola: 6 Zutaten"

# Tagliatelle ai porcini (59)
for ING in "Tagliatelle" "Steinpilze" "Knoblauch" "Olivenöl" "Petersilie" "Parmesan" "Butter"; do
  IID=$(add_ingredient "$ING")
  link_dish_ingredient 59 "$IID"
done
echo "  ✅ Tagliatelle Porcini: 7 Zutaten"

# Salsiccia (60)
for ING in "Salsiccia" "Stängelkohl" "Knoblauch" "Olivenöl" "Peperoncino"; do
  IID=$(add_ingredient "$ING")
  link_dish_ingredient 60 "$IID"
done
echo "  ✅ Salsiccia: 5 Zutaten"

# Scampi alla griglia (61)
for ING in "Scampi" "Blattsalat" "Kirschtomaten" "Olivenöl" "Zitrone" "Knoblauch"; do
  IID=$(add_ingredient "$ING")
  link_dish_ingredient 61 "$IID"
done
echo "  ✅ Scampi alla griglia: 6 Zutaten"

# ── 3. Beschreibungen aktualisieren ──
echo ""
echo "3/3 Beschreibungen vervollständigen..."
sqlite3 "$DB" "UPDATE dishes SET description = 'Gegrillte Austernpilze mit Rucola, Kirschtomaten und Parmesanspänen' WHERE id = 55 AND (description IS NULL OR description = '');"
sqlite3 "$DB" "UPDATE dishes SET description = 'Putenstreifen mit frischem Salat und Champignons mit Balsamicocreme' WHERE id = 56 AND (description IS NULL OR description = '');"
sqlite3 "$DB" "UPDATE dishes SET description = 'Linguine mit Meeresfrüchten (Scampi, Calamari, Muscheln)' WHERE id = 57 AND (description IS NULL OR description = '');"
sqlite3 "$DB" "UPDATE dishes SET description = 'Tagliatelle mit Gorgonzola und Walnüssen' WHERE id = 58 AND (description IS NULL OR description = '');"
sqlite3 "$DB" "UPDATE dishes SET description = 'Tagliatelle mit Steinpilzen' WHERE id = 59 AND (description IS NULL OR description = '');"
sqlite3 "$DB" "UPDATE dishes SET description = 'Salsiccia mit Stängelkohl' WHERE id = 60 AND (description IS NULL OR description = '');"
sqlite3 "$DB" "UPDATE dishes SET description = 'Gegrillte Scampi mit gemischtem Salat' WHERE id = 61 AND (description IS NULL OR description = '');"
echo "  ✅ Beschreibungen gesetzt"

# ── Ergebnis ──
echo ""
echo "═══════════════════════════════════════════"
echo "Ergebnis:"
echo ""
echo "Gerichte mit Allergenen:"
sqlite3 "$DB" "SELECT d.name, COALESCE(das.allergens, 'keine') FROM dishes d LEFT JOIN dish_allergen_string das ON d.id = das.dish_id WHERE d.id BETWEEN 55 AND 61;"
echo ""
echo "Zutaten pro Gericht:"
sqlite3 "$DB" "SELECT d.name || ': ' || COUNT(di.ingredient_id) || ' Zutaten' FROM dishes d LEFT JOIN dish_ingredients di ON d.id = di.dish_id WHERE d.id BETWEEN 55 AND 61 GROUP BY d.id;" 2>/dev/null || echo "  (dish_ingredients nicht verfügbar)"
echo ""
echo "Zutaten gesamt:"
sqlite3 "$DB" "SELECT COUNT(*) || ' Zutaten in der Datenbank' FROM ingredients;"
echo ""
echo "⚠️  Salsiccia: Allergene mit Enzo klären!"
echo "⚠️  Preise im Admin-Backend eintragen!"
echo "═══════════════════════════════════════════"
