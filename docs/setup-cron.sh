#!/bin/bash
# ═══════════════════════════════════════════
# Da Enzo – Backup & DSGVO Cronjobs einrichten
# ═══════════════════════════════════════════

set -e
echo "🔧 Richte Backup & DSGVO Cronjobs ein..."

# Scripts installieren
cp /opt/enzo-backup.sh /opt/enzo-backup.sh 2>/dev/null || true
cp /opt/dsgvo-cleanup.sh /opt/dsgvo-cleanup.sh 2>/dev/null || true
chmod +x /opt/enzo-backup.sh /opt/dsgvo-cleanup.sh

# Backup-Verzeichnis
mkdir -p /opt/backups
chown enzo:enzo /opt/backups 2>/dev/null || true

# Crontab einrichten (als root, weil DB-Zugriff nötig)
EXISTING=$(crontab -l 2>/dev/null || true)

# Nur hinzufügen wenn noch nicht vorhanden
if echo "$EXISTING" | grep -q "enzo-backup"; then
    echo "  ✅ Backup-Cronjob existiert bereits"
else
    (echo "$EXISTING"; echo "0 3 * * * /opt/enzo-backup.sh") | crontab -
    echo "  ✅ Backup-Cronjob hinzugefügt (täglich 3:00)"
fi

EXISTING=$(crontab -l 2>/dev/null || true)
if echo "$EXISTING" | grep -q "dsgvo-cleanup"; then
    echo "  ✅ DSGVO-Cronjob existiert bereits"
else
    (echo "$EXISTING"; echo "0 4 * * * /opt/dsgvo-cleanup.sh") | crontab -
    echo "  ✅ DSGVO-Cronjob hinzugefügt (täglich 4:00)"
fi

echo ""
echo "Aktuelle Cronjobs:"
crontab -l | grep -v "^#" | grep -v "^$"
echo ""

# Einmal manuell testen
echo "Teste Backup..."
bash /opt/enzo-backup.sh
echo ""
echo "Teste DSGVO Cleanup..."
bash /opt/dsgvo-cleanup.sh

echo ""
echo "✅ Alles eingerichtet!"
echo "  Backup:  /opt/backups/ (täglich 3:00, 30 Tage Rotation)"
echo "  Cleanup: Reservierungen 30d, Bestellungen 90d, Audit 180d"
echo "  Logs:    /var/log/enzo-backup.log, /var/log/enzo-cleanup.log"
