# ═══════════════════════════════════════════════════════
# Enzo Website – Deploy auf Hetzner Server (Windows)
# Ausfuehren in PowerShell
#
# Voraussetzung: ssh muss verfuegbar sein (Windows 10+ hat es)
# ═══════════════════════════════════════════════════════

# --- KONFIGURATION ---
$SERVER = "root@DEINE_SERVER_IP"
# HIER DEINE SERVER-IP EINSETZEN

$WEB_ROOT = "/var/www/enzo"

Write-Host "Enzo Website Deploy" -ForegroundColor Cyan

# --- 1. Website-Dateien hochladen ---
Write-Host "[1/3] Website-Dateien hochladen..." -ForegroundColor Yellow
scp -r website/* "${SERVER}:${WEB_ROOT}/"

# --- 2. Server-Configs hochladen ---
Write-Host "[2/3] Server-Configs hochladen..." -ForegroundColor Yellow
scp server/nginx/da-enzo-muenchen.de.conf "${SERVER}:/etc/nginx/sites-available/"
scp server/nginx/n8n.da-enzo-muenchen.de.conf "${SERVER}:/etc/nginx/sites-available/"
scp server/docker-compose.yml "${SERVER}:/opt/n8n/"

# --- 3. Server-Dienste neuladen ---
Write-Host "[3/3] Server-Dienste neuladen..." -ForegroundColor Yellow
ssh $SERVER "ln -sf /etc/nginx/sites-available/da-enzo-muenchen.de.conf /etc/nginx/sites-enabled/ && ln -sf /etc/nginx/sites-available/n8n.da-enzo-muenchen.de.conf /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx && cd /opt/n8n && docker compose up -d && chown -R www-data:www-data /var/www/enzo"

Write-Host ""
Write-Host "Deploy abgeschlossen!" -ForegroundColor Green
Write-Host "Website: https://www.da-enzo-muenchen.de" -ForegroundColor Cyan
Write-Host "n8n:     https://n8n.da-enzo-muenchen.de" -ForegroundColor Cyan
