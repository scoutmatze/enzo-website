#!/bin/bash
DB="/opt/enzo-api/data/enzo.db"
echo "🔧 Allergene über Zutaten verknüpfen"
echo ""

# Schema prüfen
echo "=== Allergen-Tabelle ==="
sqlite3 "$DB" "SELECT * FROM allergens LIMIT 20;"
echo ""
echo "=== ingredient_allergens Schema ==="
sqlite3 "$DB" ".schema ingredient_allergens"
echo ""

# Hilfsfunktion
link_ing_allergen() {
  local ING_NAME="$1"
  local ALLERGEN_ID="$2"
  local ING_ID=$(sqlite3 "$DB" "SELECT id FROM ingredients WHERE name = '$ING_NAME';")
  if [ -n "$ING_ID" ]; then
    sqlite3 "$DB" "INSERT OR IGNORE INTO ingredient_allergens (ingredient_id, allergen_id) VALUES ($ING_ID, '$ALLERGEN_ID');"
    echo "  ✅ $ING_NAME → $ALLERGEN_ID"
  else
    echo "  ⚠️  $ING_NAME nicht gefunden"
  fi
}

echo "Verknüpfe Zutaten mit Allergenen..."
echo ""

# A = Gluten
link_ing_allergen "Linguine" "A"
link_ing_allergen "Tagliatelle" "A"

# B = Krebstiere
link_ing_allergen "Scampi" "B"

# G = Milch
link_ing_allergen "Parmesan" "G"
link_ing_allergen "Gorgonzola" "G"
link_ing_allergen "Sahne" "G"
link_ing_allergen "Butter" "G"

# H = Schalenfrüchte
link_ing_allergen "Walnüsse" "H"

# L = Sellerie
link_ing_allergen "Balsamico-Creme" "L"

# R = Weichtiere
link_ing_allergen "Miesmuscheln" "R"
link_ing_allergen "Calamari" "R"

echo ""
echo "=== Ergebnis: Allergene pro Gericht ==="
sqlite3 "$DB" "SELECT d.name, COALESCE(das.allergens, 'keine') FROM dishes d LEFT JOIN dish_allergen_string das ON d.id = das.dish_id WHERE d.id BETWEEN 55 AND 61;"
