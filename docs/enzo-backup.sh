#!/bin/bash
# ═══════════════════════════════════════════
# Da Enzo – Backup Script
# Cronjob: täglich um 3:00 Uhr
#
# Sichert: SQLite-DB, Rechnungs-PDFs, nginx-Config, .env
# Rotation: 30 Tage lokal, ältere werden gelöscht
# ═══════════════════════════════════════════

BACKUP_DIR="/opt/backups"
DB="/opt/enzo-api/data/enzo.db"
INVOICES="/opt/enzo-api/data/invoices"
DATE=$(date '+%Y%m%d_%H%M')
BACKUP_NAME="enzo-backup-$DATE"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
LOG="/var/log/enzo-backup.log"

mkdir -p "$BACKUP_DIR" "$BACKUP_PATH"

echo "[$(date)] Backup gestartet" >> "$LOG"

# 1. SQLite-Backup (konsistent, nicht einfach cp)
sqlite3 "$DB" ".backup '$BACKUP_PATH/enzo.db'"
echo "  ✅ Datenbank" >> "$LOG"

# 2. Rechnungs-PDFs
if [ -d "$INVOICES" ] && [ "$(ls -A $INVOICES 2>/dev/null)" ]; then
    cp -r "$INVOICES" "$BACKUP_PATH/invoices"
    echo "  ✅ Rechnungen ($(ls $INVOICES | wc -l) PDFs)" >> "$LOG"
fi

# 3. Konfiguration
mkdir -p "$BACKUP_PATH/config"
cp /opt/enzo-api/.env "$BACKUP_PATH/config/.env" 2>/dev/null
cp /etc/nginx/sites-enabled/enzo-temp.conf "$BACKUP_PATH/config/nginx.conf" 2>/dev/null
cp /etc/nginx/sites-enabled/n8n-temp.conf "$BACKUP_PATH/config/nginx-n8n.conf" 2>/dev/null
echo "  ✅ Konfiguration" >> "$LOG"

# 4. Komprimieren
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_PATH"
echo "  ✅ Komprimiert: $(du -h $BACKUP_NAME.tar.gz | cut -f1)" >> "$LOG"

# 5. Alte Backups rotieren (>30 Tage löschen)
DELETED=$(find "$BACKUP_DIR" -name "enzo-backup-*.tar.gz" -mtime +30 -delete -print | wc -l)
echo "  ✅ Alte Backups gelöscht: $DELETED" >> "$LOG"

echo "[$(date)] Backup abgeschlossen: $BACKUP_NAME.tar.gz" >> "$LOG"
echo "---" >> "$LOG"
