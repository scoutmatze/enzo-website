# Konzept 2: n8n Migration – Cloud → Self-Hosted
## Von n8n.cloud auf den eigenen Hetzner-Server (n8n.dpsg13.de)

---

## Ausgangslage

| | Aktuell (Cloud) | Ziel (Self-Hosted) |
|---|---|---|
| URL | enzo-website.app.n8n.cloud | n8n.dpsg13.de (läuft bereits) |
| Server | n8n Cloud (EU/Frankfurt) | Hetzner Cloud 46.225.209.59 |
| Stack | Managed | Docker + Nginx + Let's Encrypt |
| Kosten | Free Tier (5 Workflows) | 0 € (Server läuft sowieso) |
| Webhooks | *.app.n8n.cloud/webhook/* | n8n.dpsg13.de/webhook/* |
| FTP-Zugriff | Nein (externer Call nötig) | Ja (lokaler Zugriff möglich) |

### Vorteile der Migration:
- Keine Workflow-Limits (Cloud Free = max 5 aktive Workflows)
- FTP-Upload kann lokal statt über Internet laufen (schneller, sicherer)
- Alle Daten bleiben auf deinem Server (DSGVO-optimal)
- WhatsApp Business API Webhooks zeigen auf deine eigene Domain
- Langfristig billiger (kein n8n Cloud Abo nötig falls du skalierst)

---

## Schritt 1: Workflows aus n8n Cloud exportieren

1. Öffne **n8n Cloud** (enzo-website.app.n8n.cloud)
2. Gehe zu jedem Workflow:
   - **Enzo – Reservierung zu WhatsApp**
   - (und weitere falls vorhanden)
3. In jedem Workflow: **Menü (⋮)** → **"Export"** → **"Download as JSON"**
4. Die JSON-Dateien sicher speichern

---

## Schritt 2: Workflows in Self-Hosted n8n importieren

1. Öffne dein self-hosted n8n: **https://n8n.dpsg13.de**
2. Pro Workflow: **"Add Workflow"** → **Menü (⋮)** → **"Import from File"**
3. JSON-Datei auswählen → Workflow erscheint auf dem Canvas

---

## Schritt 3: Credentials neu anlegen

Credentials werden NICHT mitexportiert (Sicherheitsfeature). 
Du musst sie auf dem neuen Server neu erstellen:

### Credential 1: Hetzner FTP (für Wochenkarte-Upload)

```
Typ:       FTP
Name:      Hetzner FTP Enzo
Host:      [dein Hetzner Webhosting FTP-Host]
Port:      21
Username:  [dein FTP-Benutzername]
Password:  [dein FTP-Passwort]
```

### Credential 2: WhatsApp API (wenn Business API eingerichtet)

```
Typ:       WhatsApp Business Cloud (OAuth)
Name:      WhatsApp Enzo
Client ID: [Meta App ID]
Secret:    [Meta App Secret]
```

→ Den OAuth-Flow durchlaufen und autorisieren.

### Credential 3 (optional): WHAPI.cloud (falls statt Meta API)

```
Typ:       Header Auth
Name:      WHAPI Token Enzo
Header:    Authorization
Value:     Bearer [dein WHAPI Token]
```

### Nach dem Anlegen:
In jedem importierten Workflow → jeden Node öffnen →
das neue Credential auswählen → speichern.

---

## Schritt 4: Webhook-URLs aktualisieren

Die Webhook-URLs ändern sich! Das ist der kritischste Schritt.

### Reservierungs-Webhook:

| | Alt (Cloud) | Neu (Self-Hosted) |
|---|---|---|
| Production URL | https://enzo-website.app.n8n.cloud/webhook/enzo-reservierung | https://n8n.dpsg13.de/webhook/enzo-reservierung |

**In der Enzo-Website (index.html) ändern:**

Suche:
```javascript
webhookUrl: 'https://enzo-website.app.n8n.cloud/webhook/enzo-reservierung',
```

Ersetze durch:
```javascript
webhookUrl: 'https://n8n.dpsg13.de/webhook/enzo-reservierung',
```

Dann Datei auf den Hetzner Webhosting-Server hochladen.

### WhatsApp Webhook (wenn API eingerichtet):

In der **Meta Developer Console** → WhatsApp → Configuration:
- Callback URL ändern auf: `https://n8n.dpsg13.de/webhook/...`
  (die exakte URL steht im WhatsApp Trigger Node)
- Verify Token bleibt gleich

---

## Schritt 5: FTP-Workflow optimieren (lokaler Zugriff)

Da n8n und die Website jetzt potenziell auf dem gleichen Server
laufen könnten (oder zumindest im gleichen Hetzner-Netz), gibt es
eine noch einfachere Alternative zum FTP-Upload:

### Option A: FTP bleibt (einfachste Umstellung)
Der FTP-Node funktioniert identisch – nur das Credential muss
neu angelegt werden. Keine Code-Änderung nötig.

### Option B: SSH/SCP statt FTP (sicherer, wenn gleicher Server)
Falls n8n und das Webhosting auf demselben Hetzner-Account laufen,
kannst du per SSH die Datei direkt schreiben:

```
Node:      Execute Command (oder SSH Node)
Command:   echo '{{ $json.jsonString }}' > /pfad/zum/webroot/wochenkarte.json
```

→ Kein FTP nötig, kein Netzwerk-Overhead, sofort geschrieben.

### Option C: HTTP PUT auf einen einfachen Upload-Endpoint
Du könntest auf dem Webserver ein kleines PHP-Script ablegen,
das per Token-Auth eine JSON-Datei entgegennimmt und speichert.
Dann braucht n8n nur einen HTTP Request Node.

**Empfehlung:** Starte mit Option A (FTP), das funktioniert sofort
und du kannst später auf B oder C optimieren.

---

## Schritt 6: Testen

### Reservierungsformular:
- [ ] Website öffnen → Formular ausfüllen → Absenden
- [ ] In n8n.dpsg13.de → Executions → neuer Eintrag sichtbar?
- [ ] Grüne Erfolgsmeldung auf der Website?

### Wochenkarte (wenn FTP-Workflow steht):
- [ ] Workflow manuell triggern mit Test-Daten
- [ ] wochenkarte.json auf dem Webserver aktualisiert?
- [ ] Website neu laden → neue Wochenkarte sichtbar?

### WhatsApp (wenn API steht):
- [ ] Testnachricht an die Business-Nummer senden
- [ ] Kommt sie im n8n Trigger an?
- [ ] Bestätigungsnachricht zurück empfangen?

---

## Schritt 7: Cloud-Workflows deaktivieren

Erst NACHDEM alles auf Self-Hosted funktioniert:

1. In n8n Cloud → jeden Workflow **"Unpublish"**
2. Damit werden die alten Webhook-URLs inaktiv
3. n8n Cloud Account kannst du behalten (als Backup)
   oder löschen

**Wichtig:** Nicht vorher deaktivieren! Solange die Website noch
auf die Cloud-URL zeigt, würden Reservierungen verloren gehen.

---

## Schritt 8: Absicherung des Self-Hosted n8n

Da dein n8n jetzt Produktions-Webhooks empfängt (echte
Kundenreservierungen!), ein paar Sicherheitsmaßnahmen:

### Basic Auth aktivieren (falls nicht schon):
In der Docker Compose oder Umgebungsvariablen:
```yaml
environment:
  - N8N_BASIC_AUTH_ACTIVE=true
  - N8N_BASIC_AUTH_USER=admin
  - N8N_BASIC_AUTH_PASSWORD=ein-sicheres-passwort
```

### Automatische Backups:
```bash
# Cronjob auf dem Server (täglich um 3 Uhr)
0 3 * * * docker exec n8n n8n export:workflow --all --output=/backup/workflows.json
```

### Monitoring:
Falls n8n abstürzt, bemerkt das niemand – und Reservierungen
gehen verloren. Einfachste Lösung:

```bash
# Health-Check Script (per Cronjob alle 5 Minuten)
#!/bin/bash
if ! curl -sf https://n8n.dpsg13.de/healthz > /dev/null; then
  docker restart n8n
  echo "n8n wurde neu gestartet" | mail -s "n8n Restart" deine@email.de
fi
```

### Docker Auto-Restart:
```yaml
services:
  n8n:
    restart: unless-stopped
```

---

## Zusammenfassung – Reihenfolge

```
1. Workflows aus Cloud exportieren (JSON)         [5 Min]
2. In Self-Hosted importieren                      [5 Min]
3. Credentials neu anlegen + zuweisen              [10 Min]
4. FTP-Credential für Hetzner Webhosting anlegen   [5 Min]
5. Webhook-URL in der Website ändern               [2 Min]
   → Website auf Hetzner Webhosting hochladen
6. Workflows publishen                             [2 Min]
7. Testen (Formular absenden)                      [5 Min]
8. Cloud-Workflows deaktivieren                    [2 Min]
9. Absicherung (Backups, Monitoring)               [15 Min]
                                            ───────────────
                                            Gesamt: ~50 Min
```

---

## Architektur nach Migration

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   Hetzner Cloud Server (46.225.209.59)              │
│   └── Docker: n8n (n8n.dpsg13.de)                   │
│       ├── Workflow: Reservierung                     │
│       │   └── Webhook empfängt POST vom Formular    │
│       │   └── (→ WhatsApp Gruppe, wenn API steht)   │
│       ├── Workflow: Wochenkarte                      │
│       │   └── WhatsApp Trigger (wenn API steht)     │
│       │   └── FTP Upload zu Hetzner Webhosting      │
│       └── Workflow: (zukünftig weitere)              │
│                │                                    │
│                │ FTP / SSH                           │
│                ▼                                    │
│   Hetzner Webhosting                                │
│   └── enzo-muenchen.de (oder aktuelle Domain)       │
│       ├── index.html (→ fetch webhook POST)         │
│       ├── speisekarte.json                          │
│       ├── wochenkarte.json (← von n8n aktualisiert) │
│       └── img/, fonts/, etc.                        │
│                                                     │
│   Enzos iPhone                                      │
│   └── WhatsApp Business App                         │
│       └── Gruppe "Enzo – Küche"                     │
│           └── "Wochenkarte Mo: ..." → n8n Trigger   │
│       └── Gruppe "Enzo – Reservierungen"            │
│           └── ← Automatische Benachrichtigung       │
│                                                     │
└─────────────────────────────────────────────────────┘
```
