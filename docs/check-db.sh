#!/bin/bash
DB="/opt/enzo-api/data/enzo.db"
echo "=== GERICHTE (Wochenkarten-relevant) ==="
sqlite3 "$DB" "SELECT id, name, category FROM dishes WHERE name LIKE '%Austernpilze%' OR name LIKE '%Linguine%' OR name LIKE '%Tagliatelle%' OR name LIKE '%Salsiccia%' OR name LIKE '%Scampi%' OR name LIKE '%Tacchino%';"

echo ""
echo "=== ALLERGENE (Tabelle) ==="
sqlite3 "$DB" "SELECT code, name FROM allergens LIMIT 20;"

echo ""
echo "=== DISH_ALLERGENS ==="
sqlite3 "$DB" "SELECT d.name, GROUP_CONCAT(a.code) FROM dish_allergens da JOIN dishes d ON da.dish_id = d.id JOIN allergens a ON da.allergen_id = a.id GROUP BY d.id;"

echo ""
echo "=== WOCHENKARTE ITEMS ==="
sqlite3 "$DB" "SELECT wmi.id, wmi.dish_id, wmi.category, wmi.custom_name, d.name AS dish_name FROM weekly_menu_items wmi LEFT JOIN dishes d ON wmi.dish_id = d.id WHERE wmi.weekly_menu_id = (SELECT id FROM weekly_menu ORDER BY id DESC LIMIT 1);"

echo ""
echo "=== INGREDIENTS ==="
sqlite3 "$DB" "SELECT COUNT(*) || ' Zutaten in DB' FROM ingredients;"
sqlite3 "$DB" ".schema ingredients" 2>/dev/null | head -3

echo ""
echo "=== DISH_ALLERGEN_STRING VIEW ==="
sqlite3 "$DB" ".schema dish_allergen_string" 2>/dev/null | head -5
