# Enzo Website – Verbleibende Aufgaben
## Alles was noch offen ist, Schritt für Schritt

---

## 1. Wochenkarte-Workflow (FTP statt GitHub)

### FTP-Zugangsdaten bei Hetzner finden:

1. Hetzner konsoleH einloggen → https://konsoleh.your-server.de
2. Dein Webhosting-Produkt auswählen
3. Unter "FTP-Accounts" oder "Zugangsdaten" findest du:
   - **Host:** z.B. `ftp.deine-domain.de` oder eine IP
   - **Benutzername:** z.B. `ftpuser` oder dein Hauptaccount
   - **Passwort:** das FTP-Passwort
   - **Port:** 21 (Standard-FTP) oder 22 (SFTP)

### In n8n Credential anlegen:

1. n8n → Settings → Credentials → Add Credential
2. Typ: **FTP** (oder SFTP falls Port 22)
3. Ausfüllen:
   - Host: dein Hetzner FTP-Host
   - Port: 21 (oder 22 für SFTP)
   - Username: dein FTP-Benutzername
   - Password: dein FTP-Passwort
4. Test → sollte "Connection successful" zeigen

### Workflow importieren:

1. In n8n → Import → `workflow-wochenkarte-ftp.json`
2. FTP-Node öffnen → Credential auswählen "Hetzner FTP Enzo"
3. **FTP-Pfad anpassen:** Der `path` im FTP-Node muss auf das
   Document Root deiner Website zeigen. Beispiele:
   - `/wochenkarte.json` (wenn FTP direkt ins Root geht)
   - `/htdocs/wochenkarte.json` (häufig bei Hetzner)
   - `/public_html/wochenkarte.json` (manchmal)
   → Teste mit dem Hetzner Dateimanager wo deine Dateien liegen
4. WhatsApp-Node erstmal deaktivieren (wie beim Reservierungs-Workflow)
5. Publishen

### Testen (ohne WhatsApp):

Da der WhatsApp-Trigger noch nicht geht, teste den Workflow manuell:
1. Öffne den Workflow in n8n
2. Klick auf "WhatsApp Text → JSON" Node
3. Klick "Execute Node" und gib als Input ein:
```json
{
  "messages": [{
    "text": {
      "body": "Wochenkarte 17.–21. März\nMo: Testgericht – 9,99\nDi: Zweites Gericht – 10,99"
    }
  }]
}
```
4. Wenn der Code-Node grün wird, klick weiter durch die Kette
5. Prüfe ob wochenkarte.json auf dem Server aktualisiert wurde
6. Website neu laden → neue Wochenkarte sichtbar?

---

## 2. Google Fonts lokal hosten

### Font-Dateien herunterladen:

1. Öffne https://gwfh.mranftl.com/fonts
   (google-webfonts-helper)

2. Suche **"Cormorant Garamond"**
   - Charsets: ✅ latin (reicht für Deutsch)
   - Styles: ✅ 400 ✅ 400italic ✅ 600 ✅ 600italic ✅ 700
   - Unten: "Customize folder prefix" → eingeben: `./`
   - Copy CSS → in eine Datei `fonts.css` speichern
   - Download ZIP → entpacken

3. Suche **"DM Sans"**
   - Charsets: ✅ latin
   - Styles: ✅ 300 ✅ 400 ✅ 500 ✅ 600
   - "Customize folder prefix" → `./`
   - CSS an die gleiche `fonts.css` ANHÄNGEN
   - Download ZIP → entpacken

### Dateistruktur:

```
fonts/
├── fonts.css
├── cormorant-garamond-v16-latin-regular.woff2
├── cormorant-garamond-v16-latin-italic.woff2
├── cormorant-garamond-v16-latin-600.woff2
├── cormorant-garamond-v16-latin-600italic.woff2
├── cormorant-garamond-v16-latin-700.woff2
├── dm-sans-v15-latin-300.woff2
├── dm-sans-v15-latin-regular.woff2
├── dm-sans-v15-latin-500.woff2
├── dm-sans-v15-latin-600.woff2
```

(Die exakten Dateinamen können leicht variieren)

### Hochladen:

1. Kompletten `fonts/` Ordner per FTP/Dateimanager auf Hetzner hochladen
2. Muss im gleichen Verzeichnis wie die index.html liegen
3. Testen: Website öffnen → Schriften sollten korrekt laden
4. F12 → Network → nach "woff2" filtern → Dateien sollten
   von deiner Domain kommen, NICHT von fonts.googleapis.com

### Datenschutzerklärung anpassen:

Sobald Fonts lokal laufen, in der datenschutz.html:
- "Variante B" (externe Einbindung) komplett LÖSCHEN
- Nur "Variante A" (lokale Einbindung) stehen lassen
- Die H3-Überschrift "Variante A:..." ändern zu einfach "Schriftarten"

---

## 3. Impressum & Datenschutz finalisieren

### Im Impressum ersetzen:

| Platzhalter | Ersetzen durch |
|---|---|
| ⚠️ Vorname Nachname (2×) | Enzo Curatolo |
| ⚠️ E-Mail | booking@da-enzo-muenchen.de (oder info@...) |
| ⚠️ USt-IdNr. | Enzos USt-IdNr. ODER gesamten Abschnitt löschen |

### In der Datenschutzerklärung ersetzen:

| Platzhalter | Ersetzen durch |
|---|---|
| ⚠️ Vorname Nachname | Enzo Curatolo |
| ⚠️ E-Mail | booking@da-enzo-muenchen.de |
| Netlify-Hosting-Abschnitt | Anpassen auf Hetzner (siehe unten) |

### Hosting-Abschnitt in Datenschutz auf Hetzner ändern:

Ersetze den gesamten Absatz unter "3. Hosting und Server-Logfiles" mit:

"Diese Website wird bei der Hetzner Online GmbH (Industriestr. 25,
91710 Gunzenhausen, Deutschland) gehostet. Beim Aufruf unserer Website
werden durch den Hosting-Anbieter automatisch Informationen in
sogenannten Server-Logfiles erfasst. [... restlicher Text bleibt gleich,
aber den USA-Drittland-Transfer-Hinweis LÖSCHEN – Hetzner ist in
Deutschland, kein Drittland-Transfer nötig!]"

Link zur Hetzner-Datenschutzerklärung:
https://www.hetzner.com/de/legal/privacy-policy/

### Alle ⚠️-Hinweisboxen und grüne Empfehlungs-Boxen entfernen!

Suche nach allen `<div class="hinweis">` und `<div class="empfehlung">`
Blöcken und lösche sie komplett.

---

## 4. Logo vektorisieren + Favicon

### Logo:
1. https://vectorizer.ai → `logo-da-enzo.jpg` hochladen
2. SVG herunterladen
3. https://remove.bg → JPG hochladen → PNG mit transparentem Hintergrund
4. Speichern als `img/logo.png`

### Invertiertes Logo für Footer:
1. Logo in Canva öffnen (oder beliebiger Bildeditor)
2. Farben invertieren: dunkler Stein → heller Stein, dunkle Schrift → helle Schrift
3. Oder: einfach das normale Logo verwenden – auf dem dunklen
   Footer-Hintergrund funktioniert das olivfarbene Logo oft auch so

### Favicon:
1. Nur den Stein (ohne "da Enzo" Text) als 512×512 PNG erstellen
2. https://favicon.io → PNG hochladen → generiert alle Größen
3. Dateien ins Root-Verzeichnis hochladen
4. Im <head> der index.html einfügen:

```html
<link rel="icon" type="image/png" sizes="32x32" href="./favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="./favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png">
```

---

## 5. Google Maps Embed korrigieren

1. Öffne https://www.google.com/maps
2. Suche: "Zschokkestraße 34, 80686 München"
   (oder "da Enzo München" falls das Restaurant schon auf Maps ist)
3. Klick auf "Teilen" → "Karte einbetten"
4. Kopiere die neue iframe-URL
5. In der index.html → suche das `<iframe src="..."` im Kontakt-Bereich
6. Ersetze die alte src-URL durch die neue

---

## 6. WhatsApp Business API

Das ist der größte offene Punkt. Kurzfassung:

1. Meta Business Suite Account: https://business.facebook.com
2. Meta Developer App erstellen: https://developers.facebook.com
3. WhatsApp als Produkt hinzufügen
4. Geschäftsnummer verifizieren
5. Permanenten Access Token generieren
6. In n8n als WhatsApp Credential anlegen
7. WhatsApp-Nodes in beiden Workflows aktivieren + Publishen

→ Das ist ein eigener Nachmittag. Die Website funktioniert auch
   ohne WhatsApp-Integration – n8n Executions als Posteingang
   reichen erstmal.

---

## 7. Google My Business

1. https://business.google.com → "Unternehmen hinzufügen"
2. Name: Da Enzo – Caffé & Ristorante
3. Kategorie: Italienisches Restaurant
4. Adresse: Zschokkestraße 34, 80686 München
5. Telefon: +49 89 9443 2100
6. Website: https://enzo-muenchen.de (oder deine Hetzner-Domain)
7. Öffnungszeiten eintragen
8. Fotos hochladen (die gleichen wie auf der Website)
9. Verifizierung per Postkarte oder Telefon

→ Das ist der wichtigste SEO-Schritt für ein lokales Restaurant.
   Ohne Google My Business erscheint Enzo nicht in der Maps-Suche.

---

## Reihenfolge-Empfehlung

1. ✅ Google Fonts lokal hosten (DSGVO-Risiko beseitigen)
2. ✅ Impressum/Datenschutz finalisieren (rechtliches Risiko)
3. ✅ Google Maps Embed korrigieren
4. ✅ Logo + Favicon
5. ✅ Google My Business einrichten
6. Wochenkarte FTP-Workflow testen
7. WhatsApp Business API (wenn Zeit ist)
8. OG-Image aufhübschen (nice-to-have)
