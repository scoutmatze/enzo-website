#!/bin/bash
# ═══════════════════════════════════════════════════════
# Enzo Server – Ersteinrichtung
# Ausfuehren als root auf dem frischen Ubuntu 24.04 Server
#
# Nutzung:
#   ssh root@DEINE_SERVER_IP
#   bash setup-server.sh
#
# Was dieses Script macht:
#   1. System updaten
#   2. Docker + Docker Compose installieren
#   3. nginx + Certbot installieren
#   4. Firewall einrichten (UFW)
#   5. Website-Verzeichnis anlegen
#   6. n8n starten
#   7. SSL-Zertifikate holen (wenn Domain schon zeigt)
#   8. Automatische Backups einrichten
# ═══════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════════"
echo "  Enzo Server Setup"
echo "═══════════════════════════════════════════"
echo ""

# --- Variablen ---
DOMAIN="da-enzo-muenchen.de"
N8N_DOMAIN="n8n.da-enzo-muenchen.de"
EMAIL="info@da-enzo-muenchen.de"  # Fuer Let's Encrypt Benachrichtigungen
WEB_ROOT="/var/www/enzo"
N8N_DIR="/opt/n8n"

# ═══════════════════════════════════════════
# 1. SYSTEM UPDATE
# ═══════════════════════════════════════════
echo "[1/8] System updaten..."
apt update && apt upgrade -y
apt install -y curl wget git ufw software-properties-common

# ═══════════════════════════════════════════
# 2. DOCKER INSTALLIEREN
# ═══════════════════════════════════════════
echo "[2/8] Docker installieren..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "  Docker installiert: $(docker --version)"
else
    echo "  Docker bereits vorhanden: $(docker --version)"
fi

# Docker Compose Plugin (ist in neueren Docker-Versionen dabei)
if ! docker compose version &> /dev/null; then
    apt install -y docker-compose-plugin
fi
echo "  Docker Compose: $(docker compose version)"

# ═══════════════════════════════════════════
# 3. NGINX + CERTBOT INSTALLIEREN
# ═══════════════════════════════════════════
echo "[3/8] nginx + Certbot installieren..."
apt install -y nginx certbot python3-certbot-nginx
systemctl enable nginx

# Certbot Challenge-Verzeichnis
mkdir -p /var/www/certbot

# ═══════════════════════════════════════════
# 4. FIREWALL (UFW)
# ═══════════════════════════════════════════
echo "[4/8] Firewall einrichten..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
echo "  UFW aktiv: SSH + HTTP/HTTPS erlaubt"

# ═══════════════════════════════════════════
# 5. WEBSITE-VERZEICHNIS ANLEGEN
# ═══════════════════════════════════════════
echo "[5/8] Website-Verzeichnis anlegen..."
mkdir -p $WEB_ROOT
chown -R www-data:www-data $WEB_ROOT

# Platzhalter-Seite (bis die echte Website hochgeladen wird)
cat > $WEB_ROOT/index.html << 'PLACEHOLDER'
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>da Enzo – Kommt bald</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#FAF5EE;color:#2A1F17;}
h1{font-size:2rem;}</style></head>
<body><h1>da Enzo – Caffé & Ristorante 🇮🇹</h1></body></html>
PLACEHOLDER

echo "  Website-Root: $WEB_ROOT"

# ═══════════════════════════════════════════
# 6. N8N STARTEN
# ═══════════════════════════════════════════
echo "[6/8] n8n einrichten..."
mkdir -p $N8N_DIR

# n8n Passwort generieren
N8N_PASS=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)

# .env Datei fuer Docker Compose
cat > $N8N_DIR/.env << EOF
N8N_USER=admin
N8N_PASSWORD=$N8N_PASS
EOF

echo "  n8n Zugangsdaten gespeichert in $N8N_DIR/.env"
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║  n8n Login:                          ║"
echo "  ║  User:     admin                     ║"
echo "  ║  Passwort: $N8N_PASS  ║"
echo "  ║                                      ║"
echo "  ║  BITTE NOTIEREN!                     ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Docker Compose starten (Datei muss vorher nach $N8N_DIR kopiert werden)
if [ -f "$N8N_DIR/docker-compose.yml" ]; then
    cd $N8N_DIR
    docker compose up -d
    echo "  n8n laeuft!"
else
    echo "  HINWEIS: docker-compose.yml fehlt noch in $N8N_DIR"
    echo "  Bitte kopiere sie dorthin und starte mit: cd $N8N_DIR && docker compose up -d"
fi

# ═══════════════════════════════════════════
# 7. NGINX KONFIGURIEREN
# ═══════════════════════════════════════════
echo "[7/8] nginx konfigurieren..."

# Default-Config deaktivieren
rm -f /etc/nginx/sites-enabled/default

# Konfigurationen muessen vorher nach /etc/nginx/sites-available/ kopiert werden
if [ -f "/etc/nginx/sites-available/$DOMAIN.conf" ]; then
    ln -sf /etc/nginx/sites-available/$DOMAIN.conf /etc/nginx/sites-enabled/
    echo "  Website-Config aktiviert"
else
    echo "  HINWEIS: $DOMAIN.conf fehlt noch in /etc/nginx/sites-available/"
fi

if [ -f "/etc/nginx/sites-available/$N8N_DOMAIN.conf" ]; then
    ln -sf /etc/nginx/sites-available/$N8N_DOMAIN.conf /etc/nginx/sites-enabled/
    echo "  n8n-Config aktiviert"
else
    echo "  HINWEIS: $N8N_DOMAIN.conf fehlt noch in /etc/nginx/sites-available/"
fi

nginx -t && systemctl reload nginx || echo "  nginx Config-Test fehlgeschlagen – bitte pruefen"

# ═══════════════════════════════════════════
# 8. AUTOMATISCHE BACKUPS
# ═══════════════════════════════════════════
echo "[8/8] Backups einrichten..."

mkdir -p /opt/backups

cat > /opt/backups/backup.sh << 'BACKUP'
#!/bin/bash
# Taegliches Backup: n8n Daten + Website
TIMESTAMP=$(date +%Y%m%d_%H%M)
BACKUP_DIR="/opt/backups"

# n8n Workflows exportieren
docker exec n8n-enzo n8n export:workflow --all --output="/home/node/.n8n/backups/workflows_${TIMESTAMP}.json" 2>/dev/null

# n8n Datenbank + Website sichern
tar -czf "${BACKUP_DIR}/enzo_backup_${TIMESTAMP}.tar.gz" \
    /var/www/enzo \
    /opt/n8n/.env \
    -C / var/lib/docker/volumes/n8n_n8n_data 2>/dev/null

# Alte Backups loeschen (aelter als 14 Tage)
find $BACKUP_DIR -name "enzo_backup_*.tar.gz" -mtime +14 -delete

echo "Backup erstellt: enzo_backup_${TIMESTAMP}.tar.gz"
BACKUP

chmod +x /opt/backups/backup.sh

# Cronjob: Taeglich um 3 Uhr morgens
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/backups/backup.sh >> /var/log/enzo-backup.log 2>&1") | crontab -

echo "  Taeglich um 3:00 Uhr Backup"

# ═══════════════════════════════════════════
# FERTIG
# ═══════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════"
echo "  Setup abgeschlossen!"
echo ""
echo "  Naechste Schritte:"
echo "  1. nginx-Configs kopieren:"
echo "     scp nginx/*.conf root@SERVER:/etc/nginx/sites-available/"
echo "  2. docker-compose.yml kopieren:"
echo "     scp docker-compose.yml root@SERVER:/opt/n8n/"
echo "  3. Website-Dateien kopieren:"
echo "     scp website/* root@SERVER:/var/www/enzo/"
echo "  4. DNS A-Records setzen:"
echo "     da-enzo-muenchen.de     → SERVER_IP"
echo "     www.da-enzo-muenchen.de → SERVER_IP"
echo "     n8n.da-enzo-muenchen.de → SERVER_IP"
echo "  5. SSL-Zertifikate holen (erst wenn DNS zeigt!):"
echo "     certbot --nginx -d da-enzo-muenchen.de -d www.da-enzo-muenchen.de"
echo "     certbot --nginx -d n8n.da-enzo-muenchen.de"
echo "═══════════════════════════════════════════"
