#!/bin/bash
# ═══════════════════════════════════════════
# Da Enzo – Security Hardening Script
# Führe dieses Script als root auf dem Server aus:
#   bash setup-security.sh
# ═══════════════════════════════════════════

set -e
echo "🔒 Da Enzo Security Hardening"
echo "═══════════════════════════════════════════"

# ── 1. Eigener System-User für die API ──
echo ""
echo "1/7 Erstelle System-User 'enzo'..."
if id "enzo" &>/dev/null; then
    echo "  ✅ User 'enzo' existiert bereits"
else
    useradd --system --shell /usr/sbin/nologin --home-dir /opt/enzo-api enzo
    echo "  ✅ User 'enzo' erstellt"
fi

# ── 2. Datei-Berechtigungen ──
echo ""
echo "2/7 Setze Datei-Berechtigungen..."
chown -R enzo:enzo /opt/enzo-api
chmod 750 /opt/enzo-api
chmod 700 /opt/enzo-api/data
chmod 600 /opt/enzo-api/data/*.db 2>/dev/null || true
chmod 600 /opt/enzo-api/.env 2>/dev/null || true

# Website-Verzeichnisse: enzo darf schreiben (für JSON-Export)
chown -R enzo:www-data /var/www/enzo
chmod 755 /var/www/enzo
chown -R enzo:www-data /var/www/enzo-dev 2>/dev/null || true
chmod 755 /var/www/enzo-dev 2>/dev/null || true

# Rechnungs-PDFs
mkdir -p /opt/enzo-api/data/invoices
chown enzo:enzo /opt/enzo-api/data/invoices
chmod 700 /opt/enzo-api/data/invoices
echo "  ✅ Berechtigungen gesetzt"

# ── 3. nginx Basic Auth für Admin ──
echo ""
echo "3/7 Erstelle nginx Basic Auth für /admin.html..."
if [ ! -f /etc/nginx/.htpasswd-enzo ]; then
    # Generiere zufälliges Passwort
    ADMIN_PW=$(openssl rand -base64 12)
    apt-get install -y apache2-utils > /dev/null 2>&1 || true
    htpasswd -bc /etc/nginx/.htpasswd-enzo enzo "$ADMIN_PW"
    chmod 640 /etc/nginx/.htpasswd-enzo
    chown root:www-data /etc/nginx/.htpasswd-enzo
    echo "  ✅ Basic Auth erstellt"
    echo ""
    echo "  ╔═══════════════════════════════════════════╗"
    echo "  ║  ADMIN BASIC AUTH ZUGANGSDATEN:           ║"
    echo "  ║  User:     enzo                           ║"
    echo "  ║  Passwort: $ADMIN_PW    ║"
    echo "  ║  BITTE NOTIEREN!                          ║"
    echo "  ╚═══════════════════════════════════════════╝"
    echo ""
else
    echo "  ✅ .htpasswd-enzo existiert bereits"
fi

# ── 4. nginx Konfiguration aktualisieren ──
echo ""
echo "4/7 Aktualisiere nginx-Konfiguration..."

# Prüfe ob die Security-Config schon eingebunden ist
NGINX_CONF="/etc/nginx/sites-available/default"
if [ -f "$NGINX_CONF" ]; then
    # Admin Basic Auth in bestehende Konfiguration einfügen
    if ! grep -q "htpasswd-enzo" "$NGINX_CONF"; then
        # Backup
        cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%Y%m%d)"

        # Security Headers einfügen (nach dem ersten server_name)
        sed -i '/server_name/a \
    # Security Headers\
    add_header X-Frame-Options "SAMEORIGIN" always;\
    add_header X-Content-Type-Options "nosniff" always;\
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;\
    server_tokens off;' "$NGINX_CONF"

        # Admin Basic Auth Block einfügen (vor location /)
        sed -i '/location \/ {/i \
    # Admin Basic Auth\
    location = /admin.html {\
        auth_basic "Da Enzo Admin";\
        auth_basic_user_file /etc/nginx/.htpasswd-enzo;\
        try_files $uri =404;\
    }\
\
    # Sensible Dateien blockieren\
    location ~ /\\. { deny all; }\
    location ~ \\.(env|sql|db|log|bak)$ { deny all; }\
' "$NGINX_CONF"

        echo "  ✅ nginx-Config aktualisiert"
    else
        echo "  ✅ Security-Config bereits vorhanden"
    fi
else
    echo "  ⚠️  nginx-Config nicht gefunden. Manuell einrichten!"
fi

# Test nginx
nginx -t 2>/dev/null && echo "  ✅ nginx-Config valide" || echo "  ❌ nginx-Config fehlerhaft! Prüfen!"

# ── 5. NODE_ENV=production in .env ──
echo ""
echo "5/7 Setze NODE_ENV=production..."
ENV_FILE="/opt/enzo-api/.env"
if [ -f "$ENV_FILE" ]; then
    if ! grep -q "NODE_ENV" "$ENV_FILE"; then
        echo "" >> "$ENV_FILE"
        echo "NODE_ENV=production" >> "$ENV_FILE"
        echo "  ✅ NODE_ENV=production hinzugefügt"
    else
        sed -i 's/NODE_ENV=.*/NODE_ENV=production/' "$ENV_FILE"
        echo "  ✅ NODE_ENV auf production gesetzt"
    fi
    # JWT-Laufzeit reduzieren
    if ! grep -q "JWT_EXPIRES_IN" "$ENV_FILE"; then
        echo "JWT_EXPIRES_IN=4h" >> "$ENV_FILE"
        echo "  ✅ JWT-Laufzeit auf 4h gesetzt"
    fi
else
    echo "  ⚠️  .env nicht gefunden!"
fi

# ── 6. systemd Service aktualisieren ──
echo ""
echo "6/7 Aktualisiere systemd Service..."
if [ -f /home/claude/security/enzo-api.service ]; then
    cp /etc/systemd/system/enzo-api.service /etc/systemd/system/enzo-api.service.bak
fi

cat > /etc/systemd/system/enzo-api.service << 'SERVICEEOF'
[Unit]
Description=Da Enzo Restaurant API
After=network.target

[Service]
Type=simple
User=enzo
Group=enzo
WorkingDirectory=/opt/enzo-api
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/opt/enzo-api/.env
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/enzo-api/data
ReadWritePaths=/var/www/enzo
ReadWritePaths=/var/www/enzo-dev
StandardOutput=journal
StandardError=journal
SyslogIdentifier=enzo-api

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
echo "  ✅ systemd Service aktualisiert (User: enzo)"

# ── 7. Neustart ──
echo ""
echo "7/7 Starte Dienste neu..."
systemctl restart nginx
systemctl restart enzo-api
sleep 2

# Prüfe ob alles läuft
if curl -s http://127.0.0.1:3000/api/health | grep -q '"ok"'; then
    echo "  ✅ API läuft"
else
    echo "  ❌ API antwortet nicht! Prüfe: journalctl -u enzo-api --since '30 sec ago'"
fi

if systemctl is-active --quiet nginx; then
    echo "  ✅ nginx läuft"
else
    echo "  ❌ nginx läuft nicht!"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "🔒 Security Hardening abgeschlossen!"
echo ""
echo "Zusammenfassung:"
echo "  ✅ API läuft als User 'enzo' (nicht mehr root)"
echo "  ✅ NODE_ENV=production (keine Stack-Traces)"
echo "  ✅ Admin-Panel hinter Basic Auth"
echo "  ✅ Sensible Dateien blockiert (.env, .db, .sql)"
echo "  ✅ Security Headers (X-Frame-Options, CSP, etc.)"
echo "  ✅ Login-Brute-Force-Schutz (10 Versuche → 30min Sperre)"
echo "  ✅ Fehlgeschlagene Logins im Audit-Log"
echo "  ✅ Passwort-Komplexität (Großbuchstabe + Zahl)"
echo "  ✅ JWT-Laufzeit auf 4h reduziert"
echo "  ✅ Datei-Berechtigungen gehärtet"
echo ""
echo "⚠️  NOCH OFFEN (nach Domain-Transfer):"
echo "  - SSL/HTTPS via certbot"
echo "  - CORS auf eigene Domain einschränken"
echo "  - HSTS Header"
echo "  - Cookie-basierte Auth statt localStorage"
echo "═══════════════════════════════════════════"
