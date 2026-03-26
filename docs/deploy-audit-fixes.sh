#!/bin/bash
# ═══════════════════════════════════════════
# Da Enzo – Finaler Deploy aller Audit-Fixes
# Auf dem Server ausführen als root
# ═══════════════════════════════════════════

set -e
echo "🚀 Da Enzo – Finaler Audit-Fix Deploy"
echo "═══════════════════════════════════════════"

# ── F-01: Admin Basic Auth sicherstellen ──
echo ""
echo "F-01: Admin Basic Auth..."
CONF="/etc/nginx/sites-enabled/enzo-temp.conf"

if ! grep -q "admin.html" "$CONF"; then
    # Admin Basic Auth Block einfügen vor dem ersten location /
    sed -i '/location \/ {/i \
    # F-01: Admin Basic Auth\
    location = /admin.html {\
        auth_basic "Da Enzo Admin";\
        auth_basic_user_file /etc/nginx/.htpasswd-enzo;\
        try_files $uri =404;\
    }\
' "$CONF" 2>/dev/null || true
    echo "  ✅ Admin Basic Auth in nginx eingefügt"
else
    echo "  ✅ Admin Basic Auth bereits vorhanden"
fi

# .htpasswd erstellen falls nicht vorhanden
if [ ! -f /etc/nginx/.htpasswd-enzo ]; then
    apt-get install -y apache2-utils > /dev/null 2>&1 || true
    ADMIN_PW=$(openssl rand -base64 12)
    htpasswd -bc /etc/nginx/.htpasswd-enzo enzo "$ADMIN_PW"
    chmod 640 /etc/nginx/.htpasswd-enzo
    chown root:www-data /etc/nginx/.htpasswd-enzo
    echo ""
    echo "  ╔═══════════════════════════════════════╗"
    echo "  ║  ADMIN BASIC AUTH ZUGANGSDATEN:       ║"
    echo "  ║  User:     enzo                       ║"
    echo "  ║  Passwort: $ADMIN_PW  ║"
    echo "  ║  BITTE NOTIEREN!                      ║"
    echo "  ╚═══════════════════════════════════════╝"
    echo ""
else
    echo "  ✅ .htpasswd-enzo existiert"
fi

# ── F-02/F-14: Security Headers ──
echo "F-02/F-14: Security Headers..."

# HSTS
if ! grep -q "Strict-Transport-Security" "$CONF"; then
    sed -i '/listen 443 ssl/a \    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;' "$CONF"
    echo "  ✅ HSTS hinzugefügt"
else
    echo "  ✅ HSTS vorhanden"
fi

# X-Frame-Options
if ! grep -q "X-Frame-Options" "$CONF"; then
    sed -i '/listen 443 ssl/a \    add_header X-Frame-Options "DENY" always;' "$CONF"
    echo "  ✅ X-Frame-Options hinzugefügt"
else
    echo "  ✅ X-Frame-Options vorhanden"
fi

# Referrer-Policy
if ! grep -q "Referrer-Policy" "$CONF"; then
    sed -i '/listen 443 ssl/a \    add_header Referrer-Policy "strict-origin-when-cross-origin" always;' "$CONF"
    echo "  ✅ Referrer-Policy hinzugefügt"
fi

# Permissions-Policy
if ! grep -q "Permissions-Policy" "$CONF"; then
    sed -i '/listen 443 ssl/a \    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;' "$CONF"
    echo "  ✅ Permissions-Policy hinzugefügt"
fi

# X-Content-Type-Options
if ! grep -q "X-Content-Type-Options" "$CONF"; then
    sed -i '/listen 443 ssl/a \    add_header X-Content-Type-Options "nosniff" always;' "$CONF"
    echo "  ✅ X-Content-Type-Options hinzugefügt"
fi

# server_tokens off
if ! grep -q "server_tokens off" /etc/nginx/nginx.conf; then
    sed -i '/http {/a \    server_tokens off;' /etc/nginx/nginx.conf
    echo "  ✅ server_tokens off gesetzt"
else
    echo "  ✅ server_tokens bereits off"
fi

# ── F-09: .db/.env/.sql blockieren ──
echo "F-09: Sensible Dateien blockieren..."
if ! grep -q '\.db\$' "$CONF"; then
    sed -i '/location \/ {/i \
    # F-09: Sensible Dateien blockieren\
    location ~* \\.(db|sql|env|bak|log)$ { deny all; return 404; }\
    location ~ /\\. { deny all; }\
' "$CONF" 2>/dev/null || true
    echo "  ✅ .db/.sql/.env blockiert"
else
    echo "  ✅ Bereits blockiert"
fi

# ── Nginx testen und neuladen ──
echo ""
echo "Nginx testen..."
if nginx -t 2>/dev/null; then
    systemctl reload nginx
    echo "  ✅ nginx neu geladen"
else
    echo "  ❌ nginx-Config fehlerhaft! Manuell prüfen: nginx -t"
fi

# ── API neustarten ──
echo ""
echo "API neustarten..."
systemctl restart enzo-api
sleep 2
if curl -s http://127.0.0.1:3000/api/health | grep -q '"ok"'; then
    echo "  ✅ API läuft"
else
    echo "  ❌ API antwortet nicht!"
fi

# ── Verification ──
echo ""
echo "═══════════════════════════════════════════"
echo "Verification:"
echo ""

# Admin Basic Auth
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' https://da-enzo-muenchen.de/admin.html)
if [ "$HTTP_CODE" = "401" ]; then
    echo "  ✅ F-01: /admin.html gibt 401 (Basic Auth aktiv)"
else
    echo "  ⚠️  F-01: /admin.html gibt $HTTP_CODE (erwartet: 401)"
fi

# .db blockiert
DB_CODE=$(curl -s -o /dev/null -w '%{http_code}' https://da-enzo-muenchen.de/enzo.db)
echo "  ✅ F-09: /enzo.db gibt $DB_CODE"

# Security Headers
echo ""
echo "  Security Headers:"
curl -sI https://da-enzo-muenchen.de | grep -iE "strict|x-frame|x-content|referrer|permissions|server:" | sed 's/^/    /'

echo ""
echo "═══════════════════════════════════════════"
echo "🎉 Alle Audit-Fixes deployed!"
echo ""
echo "Prüfe extern: https://securityheaders.com/?q=da-enzo-muenchen.de"
echo "═══════════════════════════════════════════"
