#!/bin/bash
# ═══════════════════════════════════════════════════════
# Enzo Website – Deploy auf Hetzner Server
# Ausfuehren lokal (Git Bash / WSL / macOS Terminal)
#
# Nutzung:
#   bash deploy.sh
#
# Voraussetzung: SSH-Zugang zum Server
# ═══════════════════════════════════════════════════════

# --- KONFIGURATION ---
SERVER="root@DEINE_SERVER_IP"
# ↑↑↑ HIER DEINE SERVER-IP EINSETZEN ↑↑↑

WEB_ROOT="/var/www/enzo"
N8N_DIR="/opt/n8n"

echo "═══════════════════════════════════════════"
echo "  Enzo Website Deploy"
echo "═══════════════════════════════════════════"

# --- 1. Website-Dateien hochladen ---
echo "[1/4] Website-Dateien hochladen..."
scp -r website/* $SERVER:$WEB_ROOT/
echo "  Fertig"

# --- 2. nginx-Configs hochladen ---
echo "[2/4] nginx-Configs hochladen..."
scp server/nginx/*.conf $SERVER:/etc/nginx/sites-available/
ssh $SERVER "ln -sf /etc/nginx/sites-available/da-enzo-muenchen.de.conf /etc/nginx/sites-enabled/ && \
             ln -sf /etc/nginx/sites-available/n8n.da-enzo-muenchen.de.conf /etc/nginx/sites-enabled/ && \
             nginx -t && systemctl reload nginx"
echo "  Fertig"

# --- 3. Docker Compose hochladen ---
echo "[3/4] Docker Compose hochladen..."
scp server/docker-compose.yml $SERVER:$N8N_DIR/
ssh $SERVER "cd $N8N_DIR && docker compose up -d"
echo "  Fertig"

# --- 4. Rechte setzen ---
echo "[4/4] Dateiberechtigungen setzen..."
ssh $SERVER "chown -R www-data:www-data $WEB_ROOT && chmod -R 755 $WEB_ROOT"
echo "  Fertig"

echo ""
echo "═══════════════════════════════════════════"
echo "  Deploy abgeschlossen!"
echo ""
echo "  Website: https://www.da-enzo-muenchen.de"
echo "  n8n:     https://n8n.da-enzo-muenchen.de"
echo "═══════════════════════════════════════════"
