# Enzo Website – Projektstatus
## Stand: 20. März 2026

---

## ✅ ERLEDIGT

- ✅ **Website erstellt** – Statische HTML/JSON-Seite, kein WordPress
- ✅ **Hosting auf Hetzner Webhosting** – Website ist live
- ✅ **Speisekarte aus JSON** – Alle 10 Kategorien aus Enzos echter Karte
- ✅ **Allergene pro Gericht** – Badges hinter dem Preis + Legende unten
- ✅ **Wochenkarte aus JSON** – Dynamisch geladen
- ✅ **Reservierungsformular** – Funktioniert, postet an n8n Webhook
- ✅ **n8n Reservierungs-Workflow** – Läuft auf n8n Cloud
- ✅ **Firefly-Bilder** – Hero, About, OG-Image generiert und eingesetzt
- ✅ **Logo** – Header + Footer mit echtem da-Enzo-Logo
- ✅ **Favicon** – Eingebunden
- ✅ **Google Fonts lokal** – DSGVO-konform, keine externen Requests
- ✅ **Google Maps Embed** – Echte Adresse (ENZO CAFFE BAR)
- ✅ **Öffnungszeiten** – Enzos echte Zeiten (Mo 9-17, Di-Fr 9-18, Sa 10-14)
- ✅ **WhatsApp-Button** – Floating Button + Reservierungs-Link mit echter Nummer
- ✅ **Über-Enzo-Text** – Enzos eigener Begrüßungstext + "Enzo Curatolo"
- ✅ **Spam-Schutz** – Honeypot im Formular + E-Mail-Obfuskation
- ✅ **Cloudflare-Artefakte entfernt** – Kein email-decode Script mehr
- ✅ **Datenschutzerklärung** – Hetzner Hosting, lokale Fonts, kein Netlify
- ✅ **OG Meta Tags** – Title + Description optimiert (richtige Länge)
- ✅ **.htaccess** – Security Headers, HTTPS-Redirect, 404-Seite
- ✅ **404-Seite** – "Ops, sbagliato!" im Enzo-Design

---

## ⚠️ OFFEN – Kleine Fixes (schnell erledigt)

### 1. OG-Image URL zeigt noch auf Netlify
**Problem:** `og:image` zeigt auf `https://enzo-website.netlify.app/img/og-image.jpg`
**Fix:** In index.html ändern zu: `https://www.enzo-muenchen.de/img/og-image.jpg`

### 2. Webhook-URL zeigt noch auf n8n Cloud
**Problem:** `webhookUrl` zeigt auf `enzo-website.app.n8n.cloud`
**Fix:** Nach n8n-Migration ändern zu `https://n8n.dpsg13.de/webhook/enzo-reservierung`
(erst ändern wenn Self-Hosted n8n steht!)

### 3. WhatsApp Floating Button hat noch Platzhalter-Nummer
**Problem:** `wa.me/49XXXXXXXXXXX` (der Floating Button unten rechts)
**Fix:** In index.html ersetzen durch: `wa.me/491795456396`
(Die Reservierungs-Section hat schon die richtige Nummer)

### 4. Impressum finalisieren
**Problem:** Enthält noch ⚠️-Platzhalter und Hinweis-Boxen
**Fix:** Enzos Name (Enzo Curatolo) einsetzen, USt-IdNr. klären,
Hinweis-Boxen entfernen, auf Hetzner hochladen

---

## 🔨 OFFEN – Größere Aufgaben

### 5. Mobile Speisekarte Akkordeon
**Status:** Konzept erstellt, noch nicht umgesetzt
**Was:** Auf Mobile (<900px) klappbare Kategorien statt endlosem Scroll
**Aufwand:** ~30 Min (CSS + JS Änderung, Konzept liegt vor)

### 6. n8n Migration: Cloud → Self-Hosted
**Status:** Konzept erstellt, noch nicht umgesetzt
**Was:** Workflows von enzo-website.app.n8n.cloud → n8n.dpsg13.de
**Aufwand:** ~50 Min (Konzept liegt vor)
**Danach:** Webhook-URL in index.html anpassen (siehe Punkt 2)

### 7. Wochenkarte FTP-Workflow
**Status:** Workflow-JSON erstellt, Credentials fehlen noch
**Was:** WhatsApp-Nachricht → n8n → FTP → wochenkarte.json auf Hetzner
**Abhängigkeit:** n8n Self-Hosted muss laufen + WhatsApp Business API

### 8. WhatsApp Business API einrichten
**Status:** Noch nicht begonnen
**Was:** Meta Business Account + Developer App + Nummer verifizieren
**Aufwand:** 1-3 Tage (Meta-Verifizierung dauert)
**Danach:** WhatsApp-Nodes in n8n aktivieren

### 9. Google My Business
**Status:** Noch nicht begonnen
**Was:** Profil für "Da Enzo" anlegen, Fotos hochladen
**Wichtigkeit:** HOCH – ohne GMB erscheint Enzo nicht in der Google Maps Suche

---

## 💡 NICE-TO-HAVE (irgendwann)

- [ ] OG-Image mit CTA/Headline aufhübschen (Canva)
- [ ] Hetzner Cloud VPS statt Webhosting (Website + n8n auf einem Server)
- [ ] Wochenkarte auch als Instagram/Facebook Post teilen
- [ ] Google-Bewertungs-Link per WhatsApp nach Besuch
- [ ] Cookie-Consent für Google Maps (Zwei-Klick-Lösung)
- [ ] Speisekarte-PDF automatisch generieren

---

## Empfohlene Reihenfolge der offenen Punkte

1. **Fix OG-Image URL + WhatsApp Floating Button** (5 Min, sofort)
2. **Impressum finalisieren** (15 Min)
3. **Google My Business einrichten** (30 Min, größter SEO-Impact)
4. **Mobile Akkordeon** (30 Min, Enzo hat danach gefragt)
5. **n8n Migration** (50 Min)
6. **Wochenkarte FTP-Workflow** (nach n8n Migration)
7. **WhatsApp Business API** (wenn Zeit ist)
