#!/bin/bash
# ═══════════════════════════════════════════
# Da Enzo – DSGVO Daten-Bereinigung
# Cronjob: täglich um 4:00 Uhr
# 
# Löschfristen:
#   Reservierungen: 30 Tage
#   Bestellungen:   90 Tage
#   Audit-Log:      180 Tage
#   Rechnungen:     10 Jahre (HGB/AO) – NICHT löschen!
#   Kundendaten:    Nur auf Anfrage (Art. 17 DSGVO)
# ═══════════════════════════════════════════

DB="/opt/enzo-api/data/enzo.db"
LOG="/var/log/enzo-cleanup.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] DSGVO Cleanup gestartet" >> "$LOG"

# Reservierungen älter als 30 Tage anonymisieren
# (Nicht löschen – Statistik bleibt erhalten, personenbezogene Daten werden entfernt)
ANON_RES=$(sqlite3 "$DB" "
  UPDATE reservations SET
    guest_name = 'Gelöscht',
    guest_email = NULL,
    guest_phone = NULL,
    message = NULL,
    internal_notes = NULL
  WHERE created_at < datetime('now', '-30 days')
    AND guest_name != 'Gelöscht';
  SELECT changes();
")
echo "[$DATE]   Reservierungen anonymisiert: $ANON_RES" >> "$LOG"

# Bestellungen älter als 90 Tage anonymisieren
ANON_ORD=$(sqlite3 "$DB" "
  UPDATE orders SET
    guest_name = 'Gelöscht',
    guest_phone = NULL,
    notes = NULL
  WHERE created_at < datetime('now', '-90 days')
    AND guest_name != 'Gelöscht';
  SELECT changes();
")
echo "[$DATE]   Bestellungen anonymisiert: $ANON_ORD" >> "$LOG"

# Audit-Log älter als 180 Tage löschen
DEL_AUDIT=$(sqlite3 "$DB" "
  DELETE FROM audit_log
  WHERE created_at < datetime('now', '-180 days');
  SELECT changes();
")
echo "[$DATE]   Audit-Log gelöscht: $DEL_AUDIT Einträge" >> "$LOG"

# Fehlgeschlagene Login-Versuche älter als 30 Tage
DEL_LOGIN=$(sqlite3 "$DB" "
  DELETE FROM audit_log
  WHERE action IN ('login_failed', 'login_blocked')
    AND created_at < datetime('now', '-30 days');
  SELECT changes();
")
echo "[$DATE]   Login-Fehlversuche gelöscht: $DEL_LOGIN" >> "$LOG"

echo "[$DATE] DSGVO Cleanup abgeschlossen" >> "$LOG"
echo "---" >> "$LOG"
