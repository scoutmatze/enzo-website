#!/bin/bash
DB="/opt/enzo-api/data/enzo.db"
sqlite3 "$DB" "UPDATE ingredient_allergens SET allergen_id = 'N' WHERE allergen_id = 'R';"
echo "R → N (Weichtiere) korrigiert"
echo ""
echo "Ergebnis:"
sqlite3 "$DB" "SELECT d.name, COALESCE(das.allergens, 'keine') FROM dishes d LEFT JOIN dish_allergen_string das ON d.id = das.dish_id WHERE d.id BETWEEN 55 AND 61;"
