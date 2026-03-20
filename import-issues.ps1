# ═══════════════════════════════════════════════════════
# Enzo Website – GitHub Issues Import (PowerShell)
# ═══════════════════════════════════════════════════════
#
# ANLEITUNG:
# 1. GitHub Personal Access Token erstellen:
#    → https://github.com/settings/tokens
#    → "Generate new token (classic)"
#    → Berechtigung: repo (alles darunter)
#    → Token kopieren
#
# 2. Script ausführen:
#    Rechtsklick → "Mit PowerShell ausführen"
#    ODER: PowerShell öffnen → cd zum Ordner → .\import-issues.ps1
#
#    Falls Fehler "Skript kann nicht ausgeführt werden":
#    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
#
# ═══════════════════════════════════════════════════════

# --- KONFIGURATION ---
$REPO = "scoutmatze/enzo-website"
# ↑↑↑ HIER DEINEN GITHUB USERNAME EINSETZEN ↑↑↑

# --- TOKEN ABFRAGEN ---
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Enzo Website - GitHub Issues Import" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Repo: $REPO"
Write-Host ""
$TOKEN = Read-Host "GitHub Personal Access Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($TOKEN)
$TOKEN_PLAIN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$API = "https://api.github.com/repos/$REPO"
$HEADERS = @{
    "Authorization" = "token $TOKEN_PLAIN"
    "Accept" = "application/vnd.github.v3+json"
    "Content-Type" = "application/json; charset=utf-8"
}

# Prüfe Verbindung
Write-Host "Pruefe GitHub-Verbindung..."
try {
    $null = Invoke-RestMethod -Uri $API -Headers $HEADERS -Method Get
    Write-Host "OK - Verbindung steht" -ForegroundColor Green
} catch {
    Write-Host "FEHLER: GitHub API nicht erreichbar. Pruefe Token und Repo-Name ($REPO)" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Read-Host "Enter zum Beenden"
    exit 1
}

# --- HELPER FUNKTIONEN ---
function New-Label($Name, $Color, $Description) {
    $body = @{ name=$Name; color=$Color; description=$Description } | ConvertTo-Json -Compress
    try {
        $null = Invoke-RestMethod -Uri "$API/labels" -Headers $HEADERS -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
    } catch {
        # Label existiert bereits - kein Problem
    }
}

function New-Issue($Title, $Body, $Labels, $State) {
    $issueBody = @{
        title = $Title
        body = $Body
        labels = $Labels
    } | ConvertTo-Json -Depth 3
    
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($issueBody)
    
    try {
        $result = Invoke-RestMethod -Uri "$API/issues" -Headers $HEADERS -Method Post -Body $bytes
        $num = $result.number
        
        if ($State -eq "closed") {
            $closeBody = '{"state":"closed","state_reason":"completed"}'
            $null = Invoke-RestMethod -Uri "$API/issues/$num" -Headers $HEADERS -Method Patch -Body $closeBody
            Write-Host "  [erledigt] #$num $Title" -ForegroundColor DarkGray
        } else {
            Write-Host "  [offen]    #$num $Title" -ForegroundColor Yellow
        }
        
        Start-Sleep -Milliseconds 800
    } catch {
        Write-Host "  FEHLER bei: $Title" -ForegroundColor Red
        Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ═══════════════════════════════════════════════════════
# LABELS ERSTELLEN
# ═══════════════════════════════════════════════════════

Write-Host ""
Write-Host "Erstelle Labels..." -ForegroundColor Cyan

New-Label "erledigt" "0e8a16" "Abgeschlossene Aufgabe"
New-Label "quick-fix" "fbca04" "Schnell erledigt (unter 15 Min)"
New-Label "feature" "1d76db" "Groessere Aufgabe"
New-Label "nice-to-have" "d4c5f9" "Optional, irgendwann"
New-Label "bug" "d73a4a" "Fehler / Fix noetig"
New-Label "rechtlich" "c2e0c6" "DSGVO, Impressum, Datenschutz"
New-Label "infrastruktur" "bfdadc" "Server, Hosting, n8n"
New-Label "design" "f9d0c4" "UI, UX, Bilder"
New-Label "mobile" "0075ca" "Mobile-spezifisch"
New-Label "whatsapp" "25d366" "WhatsApp Integration"

Write-Host "Labels erstellt" -ForegroundColor Green

# ═══════════════════════════════════════════════════════
# ERLEDIGTE ISSUES
# ═══════════════════════════════════════════════════════

Write-Host ""
Write-Host "Erstelle erledigte Issues..." -ForegroundColor Cyan

New-Issue `
    "Website erstellen (statisches HTML/JSON statt WordPress)" `
    "Entscheidung: Kein WordPress, stattdessen statische HTML-Seite mit JSON-Dateien fuer Speisekarte und Wochenkarte. Hosting auf Hetzner Webhosting.`n`n**Ergebnis:** index.html + speisekarte.json + wochenkarte.json" `
    @("erledigt","infrastruktur") `
    "closed"

New-Issue `
    "Speisekarte aus JSON laden mit Allergenen" `
    "Komplette Speisekarte von Enzo (10 Kategorien, 50+ Gerichte) als speisekarte.json. Wird per fetch() geladen und dynamisch gerendert. Allergene erscheinen als Badges hinter dem Preis.`n`n**Kategorien:** Antipasti, Primi Piatti, Pinse, Secondi, Dessert, Illy Cafe, Tee & Schokolade, Alkoholfreie Getraenke, Bier, Aperitivi & Longdrinks" `
    @("erledigt","design") `
    "closed"

New-Issue `
    "Wochenkarte aus JSON laden" `
    "wochenkarte.json wird per fetch() geladen und in der Wochenkarten-Section gerendert. Fallback auf Demo-Daten falls Datei nicht erreichbar." `
    @("erledigt","design") `
    "closed"

New-Issue `
    "Reservierungsformular mit n8n Webhook" `
    "Kontaktformular mit Name, Telefon, E-Mail, Datum, Uhrzeit, Personen, Sonderwuensche. Postet per fetch() an n8n Webhook.`n`n**Webhook:** https://enzo-website.app.n8n.cloud/webhook/enzo-reservierung" `
    @("erledigt","infrastruktur") `
    "closed"

New-Issue `
    "n8n Reservierungs-Workflow einrichten" `
    "Workflow in n8n Cloud: Webhook empfaengt Formulardaten, formatiert sie, sendet OK-Antwort an Website. Aktuell auf n8n Cloud, Migration auf Self-Hosted geplant." `
    @("erledigt","infrastruktur") `
    "closed"

New-Issue `
    "Firefly-Bilder generieren und einsetzen" `
    "Hero-Bild, About-Bild und OG-Image mit Adobe Firefly generiert. Prompts dokumentiert.`n`n**Dateien:** img/hero.jpg, img/about.jpg, img/og-image.jpg" `
    @("erledigt","design") `
    "closed"

New-Issue `
    "Logo einbinden (Header + Footer)" `
    "Enzos handgeschriebenes da Enzo Logo aus der Pages-Datei extrahiert. Als WebP im Header und Footer eingebunden.`n`n**Dateien:** img/logo-header.webp, img/logo-footer.webp" `
    @("erledigt","design") `
    "closed"

New-Issue `
    "Favicon einrichten" `
    "Favicon aus dem Logo-Stein erstellt und im HTML-Head eingebunden." `
    @("erledigt","design") `
    "closed"

New-Issue `
    "Google Fonts lokal hosten (DSGVO)" `
    "Schriftarten Cormorant Garamond und DM Sans lokal gehostet. Keine externen Requests mehr.`n`n**Hintergrund:** LG Muenchen Urteil 20.01.2022 - dynamisches Laden von Google Fonts ohne Einwilligung ist DSGVO-widrig.`n`n**Dateien:** fonts/fonts.css + woff2 Dateien" `
    @("erledigt","rechtlich") `
    "closed"

New-Issue `
    "Google Maps Embed mit echtem Standort" `
    "Google Maps iframe zeigt jetzt den echten Standort ENZO CAFFE BAR in Muenchen an." `
    @("erledigt","design") `
    "closed"

New-Issue `
    "Oeffnungszeiten, Telefonnummer, WhatsApp einsetzen" `
    "Echte Daten eingetragen:`n- Oeffnungszeiten: Mo 9-17, Di-Fr 9-18, Sa 10-14`n- Telefon: +49 (0)89 9443 2100`n- WhatsApp: 491795456396" `
    @("erledigt") `
    "closed"

New-Issue `
    "Ueber-Enzo-Text mit echtem Begruessungstext" `
    "Enzos eigener Text aus der Pages-Speisekarte uebernommen. Signatur: Enzo Curatolo" `
    @("erledigt","design") `
    "closed"

New-Issue `
    "Spam-Schutz: Honeypot + E-Mail-Obfuskation" `
    "Drei Schutzmassnahmen implementiert:`n`n1. **Honeypot-Feld** im Formular: unsichtbares Feld, Bots fuellen es aus, Anfrage wird nicht an n8n gesendet`n2. **E-Mail per JavaScript** zusammengesetzt: Im HTML steht nur Platzhalter, JS setzt info@enzo-muenchen.de zusammen`n3. **Honeypot-Daten bereinigen**: delete data.website vor dem Absenden" `
    @("erledigt","bug") `
    "closed"

New-Issue `
    "Datenschutzerklaerung erstellen und finalisieren" `
    "DSGVO-konforme Datenschutzerklaerung:`n- Hetzner Hosting (Deutschland, kein Drittland-Transfer)`n- Lokale Google Fonts`n- Google Maps Embed (DPF)`n- Kontaktformular / n8n`n- WhatsApp Kontakt`n- Keine Cookies, kein Tracking`n`nAufsichtsbehoerde: BayLDA Ansbach" `
    @("erledigt","rechtlich") `
    "closed"

New-Issue `
    ".htaccess + Security Headers + 404-Seite" `
    ".htaccess: Security Headers, HTTPS-Redirect, www zu non-www, no-cache fuer JSON.`n404.html: Fehlerseite im Enzo-Design." `
    @("erledigt","infrastruktur") `
    "closed"

New-Issue `
    "OG Meta Tags optimieren" `
    "Title auf 55 Zeichen erweitert, Description auf 139 Zeichen. Vorher zu kurz (25 bzw. 78 Zeichen)." `
    @("erledigt","design") `
    "closed"

New-Issue `
    "Cloudflare-Artefakte entfernen" `
    "Cloudflare email-decode Script und verschluesselte E-Mail-Adressen von Netlify-Hosting entfernt. Auf Hetzner nicht noetig." `
    @("erledigt","bug") `
    "closed"

# ═══════════════════════════════════════════════════════
# OFFENE ISSUES - Quick Fixes
# ═══════════════════════════════════════════════════════

Write-Host ""
Write-Host "Erstelle offene Issues..." -ForegroundColor Cyan

New-Issue `
    "FIX: OG-Image URL zeigt noch auf Netlify" `
    "## Problem`nog:image zeigt auf alte Netlify-URL:`n``````html`n<meta property=""og:image"" content=""https://enzo-website.netlify.app/img/og-image.jpg"">`n```````n`n## Fix`nIn index.html aendern zu:`n``````html`n<meta property=""og:image"" content=""https://www.enzo-muenchen.de/img/og-image.jpg"">`n```````n`n## Testen`nNach dem Fix auf https://www.opengraph.xyz testen." `
    @("quick-fix","bug") `
    "open"

New-Issue `
    "FIX: WhatsApp Floating Button hat Platzhalter-Nummer" `
    "## Problem`nDer WhatsApp Floating Button (unten rechts) hat noch die Platzhalter-Nummer 49XXXXXXXXXXX.`nDie Reservierungs-Section hat schon die richtige Nummer.`n`n## Fix`nIn index.html suchen und ersetzen:`n49XXXXXXXXXXX -> 491795456396" `
    @("quick-fix","bug") `
    "open"

New-Issue `
    "FIX: Impressum finalisieren" `
    "## Problem`nDas Impressum enthaelt noch Platzhalter und Hinweis-Boxen.`n`n## Fix`n1. Enzos Name einsetzen: **Enzo Curatolo**`n2. E-Mail einsetzen`n3. USt-IdNr. klaeren: Falls vorhanden einsetzen, sonst Abschnitt loeschen`n4. Alle Hinweis-Boxen entfernen`n5. Hosting-Abschnitt auf Hetzner aendern`n6. Auf Hetzner hochladen" `
    @("quick-fix","rechtlich") `
    "open"

# ═══════════════════════════════════════════════════════
# OFFENE ISSUES - Features
# ═══════════════════════════════════════════════════════

New-Issue `
    "Mobile Speisekarte: Akkordeon statt endloser Scroll" `
    "## Problem`nDie Speisekarte hat 10 Kategorien mit 50+ Eintraegen. Auf dem Handy ~3500px Scrollhoehe. Enzo hat nach einer besseren Loesung gefragt.`n`n## Loesung`nAkkordeon auf Mobile (<900px):`n- Jede Kategorie ist ein aufklappbarer Balken`n- Nur eine Kategorie gleichzeitig offen`n- Erste Kategorie standardmaessig offen`n- Sanfte Animation + Auto-Scroll`n- Desktop bleibt unveraendert`n`n## Konzept`nVollstaendiges Konzept mit CSS + JS liegt vor: konzept-1-speisekarte-mobile.md`n`n## Aufwand`n~30 Min" `
    @("feature","mobile","design") `
    "open"

New-Issue `
    "n8n Migration: Cloud zu Self-Hosted (n8n.dpsg13.de)" `
    "## Problem`nn8n laeuft auf Cloud Free Tier (max 5 Workflows). Langfristig brauchen wir mehr Flexibilitaet.`n`n## Loesung`nMigration auf Self-Hosted: n8n.dpsg13.de (Hetzner Cloud, Docker + Nginx + Let's Encrypt)`n`n## Schritte`n1. Workflows aus Cloud exportieren`n2. In Self-Hosted importieren`n3. Credentials neu anlegen`n4. Webhook-URL in index.html aendern`n5. Testen`n6. Cloud-Workflows deaktivieren`n7. Absicherung (Backups, Monitoring)`n`n## Konzept`nkonzept-2-n8n-migration.md`n`n## Aufwand`n~50 Min`n`n## ACHTUNG`nWebhook-URL erst aendern wenn Self-Hosted getestet ist!" `
    @("feature","infrastruktur") `
    "open"

New-Issue `
    "Wochenkarte-Workflow: WhatsApp zu FTP zu Hetzner" `
    "## Ziel`nEnzo schreibt Wochenkarte in WhatsApp-Gruppe, n8n updated die Website automatisch.`n`n## Abhaengigkeiten`n- n8n Self-Hosted muss laufen`n- WhatsApp Business API muss eingerichtet sein`n- FTP-Credentials fuer Hetzner in n8n anlegen`n`n## Status`nWorkflow-JSON liegt vor: workflow-wochenkarte-ftp.json`n`n## Aufwand`n~30 Min (nach Abhaengigkeiten)" `
    @("feature","infrastruktur","whatsapp") `
    "open"

New-Issue `
    "WhatsApp Business API einrichten" `
    "## Ziel`nWhatsApp Business API ueber Meta einrichten fuer n8n-Automatisierung.`n`n## Schritte`n1. Meta Business Suite Account erstellen`n2. Meta Developer App erstellen`n3. WhatsApp als Produkt hinzufuegen`n4. Geschaeftsnummer verifizieren`n5. Access Token generieren`n6. In n8n als Credential anlegen`n7. WhatsApp-Nodes aktivieren`n`n## Hinweise`n- Nummer kann nicht gleichzeitig in normaler WhatsApp-App aktiv sein`n- WhatsApp Business App (bis 5 Geraete) als Zwischenloesung moeglich`n- Meta-Verifizierung dauert 1-3 Tage`n`n## Aufwand`n1-3 Tage" `
    @("feature","whatsapp") `
    "open"

New-Issue `
    "Google My Business Profil einrichten" `
    "## Warum wichtig`nOhne Google My Business erscheint Da Enzo NICHT in der Google Maps Suche. Wichtigster SEO-Schritt fuer ein lokales Restaurant.`n`n## Schritte`n1. https://business.google.com`n2. Name: Da Enzo - Caffe & Ristorante`n3. Kategorie: Italienisches Restaurant`n4. Adresse: Zschokkestrasse 34, 80686 Muenchen`n5. Telefon: +49 89 9443 2100`n6. Website: https://www.enzo-muenchen.de`n7. Oeffnungszeiten eintragen`n8. Fotos hochladen`n9. Verifizierung`n`n## Aufwand`n~30 Min (+ Wartezeit Verifizierung)" `
    @("feature") `
    "open"

# ═══════════════════════════════════════════════════════
# NICE-TO-HAVE
# ═══════════════════════════════════════════════════════

New-Issue `
    "OG-Image mit Headline und CTA aufhuebschen" `
    "Aktuelles OG-Image ist ein reines Food-Foto. Optimal: Dunkles Overlay + Text 'Da Enzo' + 'Jetzt reservieren'. Am besten in Canva erstellen.`n`nMasse: 1200x630 px" `
    @("nice-to-have","design") `
    "open"

New-Issue `
    "Hetzner Cloud VPS: Website + n8n auf einem Server" `
    "Statt separates Webhosting + Cloud-Server: Alles auf einem Hetzner CX22 (2 vCPU, 4 GB RAM, ~3,56 EUR/Monat). nginx als Reverse Proxy, n8n in Docker, Website als statische Dateien.`n`nVorteil: Ein Server, eine Rechnung, Wochenkarte kann direkt ins Dateisystem geschrieben werden." `
    @("nice-to-have","infrastruktur") `
    "open"

New-Issue `
    "Cookie-Consent fuer Google Maps (Zwei-Klick-Loesung)" `
    "Google Maps Embed laedt sofort und uebertraegt IP-Adressen an Google. DSGVO-optimal: Erst statisches Bild zeigen, nach Klick iframe laden.`n`nAlternative: Google Maps durch Link oder OpenStreetMap ersetzen." `
    @("nice-to-have","rechtlich") `
    "open"

New-Issue `
    "Wochenkarte automatisch auf Social Media teilen" `
    "Wenn Wochenkarte per WhatsApp aktualisiert wird, automatisch Instagram/Facebook Post generieren. Moeglich ueber n8n + Meta Graph API." `
    @("nice-to-have","whatsapp") `
    "open"

# ═══════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Import abgeschlossen!" -ForegroundColor Green
Write-Host ""
Write-Host "  Oeffne: https://github.com/$REPO/issues" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Read-Host "Enter zum Beenden"
