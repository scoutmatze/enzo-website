# Enzo Server Launch – Schritt-für-Schritt

## Phase 1: Repo aufräumen & pushen (JETZT)

Öffne PowerShell, navigiere zu deinem lokalen Repo:

```powershell
cd C:\pfad\zu\enzo-website
```

### Ordnerstruktur anlegen:

```powershell
# Ordner erstellen
mkdir -p website, website\fonts, website\img
mkdir -p server, server\nginx, server\scripts
mkdir -p workflows, docs
```

### Dateien sortieren:

Die Dateien aus Claude's Outputs in die richtige Struktur verschieben:

```powershell
# Website-Dateien → website/
# (index.html, i18n.js, impressum.html, datenschutz.html,
#  barrierefreiheit.html, 404.html, speisekarte.json, wochenkarte.json)
# Plus: fonts/ und img/ Ordner die du schon hast

# Server-Configs → server/
# docker-compose.yml → server/
# nginx/*.conf → server/nginx/
# setup-server.sh, deploy.sh, deploy.ps1 → server/scripts/

# Workflows → workflows/
# workflow-reservierung.json, workflow-wochenkarte-ftp.json → workflows/

# Docs → docs/
# projektstatus.md, konzepte, audit → docs/

# README.md → Root
```

### Git pushen:

```powershell
git add .
git commit -m "feat: komplette Repo-Struktur (Website + Server + Workflows)"
git push origin main
```

---

## Phase 2: Server einrichten (sobald Server bestellt)

### 2.1 SSH-Verbindung testen

```powershell
ssh root@DEINE_SERVER_IP
# Beim ersten Mal: "yes" tippen um den Fingerprint zu akzeptieren
# Passwort eingeben (aus Hetzner Cloud Panel)
```

### 2.2 SSH-Key einrichten (optional aber empfohlen)

```powershell
# Lokal (PowerShell):
ssh-keygen -t ed25519 -C "enzo-server"
# Enter, Enter, Enter (Standard-Pfad, kein Passwort)

# Key auf Server kopieren:
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@SERVER_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# Testen (sollte jetzt ohne Passwort gehen):
ssh root@SERVER_IP
```

### 2.3 Setup-Script hochladen und ausführen

```powershell
# Lokal:
scp server/scripts/setup-server.sh root@SERVER_IP:/root/

# Auf dem Server:
ssh root@SERVER_IP
chmod +x setup-server.sh
bash setup-server.sh
```

**WICHTIG:** Das Script zeigt dir das n8n-Passwort an – NOTIEREN!

### 2.4 Configs hochladen

```powershell
# Lokal:
scp server/docker-compose.yml root@SERVER_IP:/opt/n8n/
scp server/nginx/da-enzo-muenchen.de.conf root@SERVER_IP:/etc/nginx/sites-available/
scp server/nginx/n8n.da-enzo-muenchen.de.conf root@SERVER_IP:/etc/nginx/sites-available/
```

### 2.5 n8n starten

```powershell
ssh root@SERVER_IP "cd /opt/n8n && docker compose up -d"
```

### 2.6 Website-Dateien hochladen

```powershell
scp website/* root@SERVER_IP:/var/www/enzo/
scp -r website/fonts root@SERVER_IP:/var/www/enzo/
scp -r website/img root@SERVER_IP:/var/www/enzo/
ssh root@SERVER_IP "chown -R www-data:www-data /var/www/enzo"
```

---

## Phase 3: DNS umstellen (sobald AuthCode da)

### 3.1 Domain zu Hetzner transferieren

- Hetzner Cloud Panel → DNS → Domain hinzufügen
- AuthCode eingeben
- Transfer dauert bis zu 5 Tage (oft schneller)

### 3.2 DNS-Records setzen

Sobald die Domain bei Hetzner ist:

| Typ | Name | Wert | TTL |
|-----|------|------|-----|
| A | @ | DEINE_SERVER_IP | 300 |
| A | www | DEINE_SERVER_IP | 300 |
| A | n8n | DEINE_SERVER_IP | 300 |
| AAAA | @ | DEINE_SERVER_IPv6 | 300 |
| AAAA | www | DEINE_SERVER_IPv6 | 300 |
| AAAA | n8n | DEINE_SERVER_IPv6 | 300 |

### 3.3 SSL-Zertifikate holen

Warte bis DNS propagiert ist (prüfe mit `nslookup da-enzo-muenchen.de`):

```bash
# Auf dem Server:
# WICHTIG: Erst die nginx SSL-Zeilen auskommentieren (sonst startet nginx nicht)
# weil die Zertifikate noch nicht existieren!

# Temporär ohne SSL starten:
# In beiden nginx-Configs die SSL-server-Blocks auskommentieren
# Nur den Port-80-Block aktiv lassen
nginx -t && systemctl reload nginx

# Zertifikate holen:
certbot --nginx -d da-enzo-muenchen.de -d www.da-enzo-muenchen.de --email info@da-enzo-muenchen.de --agree-tos
certbot --nginx -d n8n.da-enzo-muenchen.de --email info@da-enzo-muenchen.de --agree-tos

# Certbot aktualisiert die nginx-Configs automatisch mit SSL!
# Auto-Renewal testen:
certbot renew --dry-run
```

### 3.4 Webhook-URL in index.html umstellen

```
Alt:  https://enzo-website.app.n8n.cloud/webhook/enzo-reservierung
Neu:  https://n8n.da-enzo-muenchen.de/webhook/enzo-reservierung
```

Dann neu hochladen:
```powershell
scp website/index.html root@SERVER_IP:/var/www/enzo/
```

---

## Phase 4: n8n Workflows migrieren

1. Workflows aus n8n Cloud exportieren (JSON)
2. In n8n.da-enzo-muenchen.de importieren
3. Credentials neu anlegen
4. Workflows publishen + testen
5. Cloud-Workflows deaktivieren

---

## Checkliste

- [ ] Server bestellt (Hetzner CX22)
- [ ] SSH-Zugang funktioniert
- [ ] setup-server.sh ausgeführt
- [ ] docker-compose.yml + nginx-Configs hochgeladen
- [ ] n8n läuft (docker ps zeigt Container)
- [ ] Website-Dateien hochgeladen
- [ ] nginx zeigt Platzhalter-Seite auf Server-IP
- [ ] AuthCode erhalten
- [ ] Domain zu Hetzner transferiert
- [ ] DNS-Records gesetzt (A + AAAA)
- [ ] SSL-Zertifikate geholt (certbot)
- [ ] Website erreichbar unter https://www.da-enzo-muenchen.de
- [ ] n8n erreichbar unter https://n8n.da-enzo-muenchen.de
- [ ] Webhook-URL in index.html umgestellt
- [ ] Workflows migriert + getestet
- [ ] Cloud-Workflows deaktiviert
- [ ] Reservierungsformular getestet
