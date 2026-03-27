#!/bin/bash
# ═══════════════════════════════════════════
# Da Enzo – Wochenkarte + Telegram Update
# ═══════════════════════════════════════════
set -e
echo "🔧 Da Enzo Update"

# ── 1. DB Migrations ──
echo ""
echo "1/4 Datenbank-Migrationen..."
sqlite3 /opt/enzo-api/data/enzo.db "
  -- week_end für 2-Wochen-Karten
  ALTER TABLE weekly_menu ADD COLUMN week_end DATE;
" 2>/dev/null && echo "  ✅ weekly_menu.week_end hinzugefügt" || echo "  ✅ week_end existiert bereits"

sqlite3 /opt/enzo-api/data/enzo.db "
  -- Kategorie pro Wochenkarten-Item
  ALTER TABLE weekly_menu_items ADD COLUMN category TEXT;
" 2>/dev/null && echo "  ✅ weekly_menu_items.category hinzugefügt" || echo "  ✅ category existiert bereits"

# ── 2. Telegram Route in server.js registrieren ──
echo ""
echo "2/4 Telegram-Route..."
if ! grep -q "telegramRoute\|telegram.*Route" /opt/enzo-api/src/server.js; then
  # Füge nach der letzten Route-Registrierung ein
  sed -i "/app.use.*\/api\/shifts/a\\
const telegramRoutes = require('./routes/telegram');\\
app.use('/api/telegram', telegramRoutes);" /opt/enzo-api/src/server.js
  echo "  ✅ Telegram-Route in server.js registriert"
else
  echo "  ✅ Telegram-Route bereits vorhanden"
fi

# ── 3. TELEGRAM_CHAT_IDS in .env (Multi-User) ──
echo ""
echo "3/4 Telegram Multi-User..."
if grep -q "TELEGRAM_CHAT_ID=" /opt/enzo-api/.env && ! grep -q "TELEGRAM_CHAT_IDS=" /opt/enzo-api/.env; then
  OLD_ID=$(grep "TELEGRAM_CHAT_ID=" /opt/enzo-api/.env | tail -1 | cut -d= -f2)
  # Umbenennen zu CHAT_IDS
  sed -i "s/TELEGRAM_CHAT_ID=.*/TELEGRAM_CHAT_IDS=$OLD_ID/" /opt/enzo-api/.env
  echo "  ✅ TELEGRAM_CHAT_ID → TELEGRAM_CHAT_IDS migriert ($OLD_ID)"
  echo "  ℹ️  Enzos Chat-ID hinzufügen: Zeile bearbeiten zu TELEGRAM_CHAT_IDS=$OLD_ID,ENZOS_ID"
fi

# ── 4. Neustart + Webhook registrieren ──
echo ""
echo "4/4 Neustart + Telegram Webhook..."
systemctl restart enzo-api
sleep 3

if curl -s http://127.0.0.1:3000/api/health | grep -q '"ok"'; then
  echo "  ✅ API läuft"
else
  echo "  ❌ API antwortet nicht! journalctl -u enzo-api --since '30 sec ago'"
  exit 1
fi

# Telegram Webhook registrieren
WEBHOOK_RESULT=$(curl -s -X POST http://127.0.0.1:3000/api/telegram/setup \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://da-enzo-muenchen.de"}')
echo "  Webhook: $WEBHOOK_RESULT"

echo ""
echo "═══════════════════════════════════════════"
echo "✅ Update abgeschlossen!"
echo ""
echo "Nächste Schritte:"
echo "  1. Enzo: Bot in Telegram öffnen → /start senden"
echo "  2. Chat-ID von Enzo holen: https://api.telegram.org/bot<TOKEN>/getUpdates"
echo "  3. In .env: TELEGRAM_CHAT_IDS=deine_id,enzos_id"
echo "  4. systemctl restart enzo-api"
echo "  5. Test-Reservierung machen → beide bekommen Push + Buttons"
echo "═══════════════════════════════════════════"
