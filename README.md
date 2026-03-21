# da Enzo – Caffé & Ristorante

Statische Website + n8n Automatisierung für [da Enzo](https://www.da-enzo-muenchen.de) in München-Laim.

## Projektstruktur

```
enzo-website/
├── website/                    # Alle Dateien die auf den Webserver kommen
│   ├── index.html              # Hauptseite
│   ├── i18n.js                 # Mehrsprachigkeit (DE/EN/IT/Leichte Sprache)
│   ├── impressum.html
│   ├── datenschutz.html
│   ├── barrierefreiheit.html
│   ├── 404.html
│   ├── speisekarte.json        # Speisekarte (wird von index.html geladen)
│   ├── wochenkarte.json        # Wochenkarte (wird von n8n aktualisiert)
│   ├── fonts/                  # Lokale Google Fonts (DSGVO)
│   │   └── fonts.css
│   └── img/                    # Bilder
│       ├── hero.jpg
│       ├── about.jpg
│       ├── og-image.jpg
│       ├── logo-header.webp
│       ├── logo-footer.webp
│       └── favicon.ico
│
├── server/                     # Server-Konfiguration (Hetzner CX22)
│   ├── docker-compose.yml      # n8n Container
│   ├── nginx/
│   │   ├── da-enzo-muenchen.de.conf
│   │   └── n8n.da-enzo-muenchen.de.conf
│   └── scripts/
│       ├── setup-server.sh     # Ersteinrichtung (einmal ausfuehren)
│       └── deploy.sh           # Website deployen (bei Aenderungen)
│       └── deploy.ps1          # Deploy fuer Windows
│
├── workflows/                  # n8n Workflow-JSONs
│   ├── workflow-reservierung.json
│   └── workflow-wochenkarte-ftp.json
│
├── docs/                       # Konzepte & Dokumentation
│   ├── projektstatus.md
│   ├── konzept-1-speisekarte-mobile.md
│   ├── konzept-2-n8n-migration.md
│   ├── barrierefreiheit-audit.md
│   └── firefly-prompts.md
│
└── README.md
```

## Tech Stack

| Komponente | Technologie |
|---|---|
| Website | Statisches HTML + CSS + JS |
| Speisekarte | JSON (client-side fetch) |
| Mehrsprachigkeit | i18n.js (DE/EN/IT/Leichte Sprache) |
| Hosting | Hetzner Cloud CX22 (Ubuntu 24.04) |
| Webserver | nginx |
| Automatisierung | n8n (Docker, self-hosted) |
| SSL | Let's Encrypt (Certbot) |
| Domain | da-enzo-muenchen.de |
| Fonts | Lokal gehostet (DSGVO-konform) |

## Deployment

```bash
# Windows (PowerShell)
.\server\scripts\deploy.ps1

# Linux/macOS
bash server/scripts/deploy.sh
```

## Server-Ersteinrichtung

```bash
ssh root@SERVER_IP
# setup-server.sh hochladen und ausfuehren
bash setup-server.sh
```

Danach SSL-Zertifikate holen (erst wenn DNS zeigt):
```bash
certbot --nginx -d da-enzo-muenchen.de -d www.da-enzo-muenchen.de
certbot --nginx -d n8n.da-enzo-muenchen.de
```
