# Barrierefreiheits-Audit: Da Enzo Website
## Prüfung nach WCAG 2.1 Level AA (≈ BITV 2.0 / EN 301 549)
### Stand: 20. März 2026

---

## Rechtliche Einordnung

**BITV 2.0** gilt für öffentliche Stellen – Da Enzo als privates
Restaurant ist davon nicht direkt betroffen.

**BFSG** (seit 28.06.2025) gilt für private Unternehmen, aber
**Kleinunternehmen (< 10 Mitarbeiter, < 2 Mio. € Umsatz) sind
ausgenommen**. Enzo fällt unter diese Ausnahme.

**Empfehlung:** Trotzdem WCAG 2.1 AA anstreben – es verbessert SEO,
Usability und schließt niemanden aus. Und falls sich die Ausnahme
ändert, ist die Website schon vorbereitet.

---

## Ergebnis-Übersicht

| Kategorie | Status | Probleme |
|---|---|---|
| Sprache & Dokument | ✅ OK | – |
| Seitenstruktur | ⚠️ Probleme | 3 Punkte |
| Navigation & Tastatur | ❌ Kritisch | 4 Punkte |
| Farbe & Kontrast | ⚠️ Probleme | 3 Punkte |
| Bilder & Medien | ⚠️ Probleme | 2 Punkte |
| Formulare | ⚠️ Probleme | 3 Punkte |
| Animationen | ⚠️ Probleme | 1 Punkt |
| ARIA & Semantik | ⚠️ Probleme | 3 Punkte |

**19 Punkte gefunden, davon 5 kritisch (A-Level Verletzung)**

---

## Detaillierte Prüfung

### 1. Sprache & Dokument-Grundlagen

✅ **1.1 Seitensprache** (WCAG 3.1.1)
`<html lang="de">` ist korrekt gesetzt.

✅ **1.2 Zeichensatz**
`<meta charset="UTF-8">` vorhanden.

✅ **1.3 Viewport**
`<meta name="viewport" ...>` korrekt, kein `maximum-scale=1`
oder `user-scalable=no` (beides wäre ein A-Level-Verstoß).

✅ **1.4 Seitentitel**
`<title>` ist beschreibend und einzigartig.

---

### 2. Seitenstruktur & Landmarks

❌ **2.1 Kein `<main>` Landmark** (WCAG 1.3.1 – Level A)
Der Seiteninhalt ist nicht in ein `<main>`-Element eingeschlossen.
Screenreader können nicht direkt zum Hauptinhalt springen.

**Fix:** Nach `</nav>` ein `<main>` öffnen, vor `<footer>` schließen:
```html
</nav>
<main>
  <!-- Hero, Sections, etc. -->
</main>
<footer>
```

⚠️ **2.2 Sections ohne zugänglichen Namen** (WCAG 1.3.1)
Die `<section>`-Elemente haben keine `aria-labelledby` Attribute.
Screenreader listen sie als "Section" ohne Kontext auf.

**Fix:** Jede Section mit ihrer Überschrift verknüpfen:
```html
<section id="ueber" aria-labelledby="ueber-title">
  ...
  <h2 id="ueber-title" class="section-title">...</h2>
```

⚠️ **2.3 Überschriften-Hierarchie**
Die `section-label` Elemente (z.B. "Benvenuti", "La Carta") sind
`<div>`s. Inhaltlich sind sie Deko, kein Problem. Aber die
Überschriftenreihenfolge springt von `<h1>` im Hero direkt zu
`<h2>` in den Sections – das ist korrekt. `<h3>` in Kontakt und
Speisekarte-Kategorien ebenfalls korrekt.
→ **OK, kein Handlungsbedarf.**

---

### 3. Navigation & Tastatur-Bedienbarkeit

❌ **3.1 Kein Skip-Link** (WCAG 2.4.1 – Level A)
Es gibt keinen "Zum Inhalt springen" Link. Tastatur-Nutzer müssen
durch die gesamte Navigation tabben bevor sie zum Content kommen.

**Fix:** Als erstes Element im `<body>`:
```html
<a href="#main-content" class="skip-link">Zum Inhalt springen</a>
```
CSS:
```css
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 10000;
  background: var(--col-espresso);
  color: var(--col-cream);
  padding: 12px 24px;
  font-size: 1rem;
}
.skip-link:focus {
  left: 0;
}
```

❌ **3.2 Burger-Menü nicht tastatur-bedienbar** (WCAG 2.1.1 – Level A)
Das Burger-Menü ist ein `<div>` mit `onclick`. Es ist:
- Nicht per Tab erreichbar (kein `tabindex`)
- Nicht per Enter/Space aktivierbar (kein `keydown` Handler)
- Nicht als Button erkennbar für Screenreader (kein `role`)
- Kein Zustandsindikator (offen/geschlossen)

**Fix:**
```html
<button class="nav-burger" id="navBurger"
        aria-label="Menü öffnen"
        aria-expanded="false"
        onclick="toggleNav()">
  <span></span><span></span><span></span>
</button>
```
Und in `toggleNav()` den aria-expanded Zustand aktualisieren:
```javascript
function toggleNav() {
  document.getElementById('navLinks').classList.toggle('open');
  const burger = document.getElementById('navBurger');
  burger.classList.toggle('open');
  const isOpen = burger.classList.contains('open');
  burger.setAttribute('aria-expanded', isOpen);
  burger.setAttribute('aria-label', isOpen ? 'Menü schließen' : 'Menü öffnen');
}
```

❌ **3.3 Akkordeon-Header nicht tastatur-bedienbar** (WCAG 2.1.1 – Level A)
Die neuen Akkordeon-Header in der Speisekarte sind `<div>`s mit
`onclick`. Gleiche Probleme wie beim Burger-Menü.

**Fix:** In loadSpeisekarte() ändern:
```javascript
html += `<div class="menu-category-header" role="button" tabindex="0"
          aria-expanded="${isFirst}" onclick="toggleMenuCategory(this)"
          onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleMenuCategory(this)}">`;
```

⚠️ **3.4 Focus-Styles auf Links/Buttons** (WCAG 2.4.7)
Nur Formularfelder haben einen custom Focus-Style. Links, Buttons
und der Burger haben keinen sichtbaren Focus-Indikator.

**Fix:** Globalen Focus-Style ergänzen:
```css
*:focus-visible {
  outline: 2px solid var(--col-terra);
  outline-offset: 2px;
}
```

---

### 4. Farbe & Kontrast

❌ **4.1 Muted-Text zu wenig Kontrast** (WCAG 1.4.3 – Level AA)
`--col-text-muted: #7A6E62` auf `--col-cream: #FAF5EE`
→ Kontrastverhältnis: ca. **4.0:1** (Minimum: 4.5:1 für Normtext)

Betrifft: Alle Absatztexte `<p>`, Allergen-Texte, Öffnungszeiten,
Gerichtsbeschreibungen, Footer-Text.

**Fix:** Muted-Farbe abdunkeln:
```css
--col-text-muted: #635850; /* ca. 5.5:1 auf Cream */
```

⚠️ **4.2 Terra auf Cream – knapp** (WCAG 1.4.3)
`--col-terra: #B85A3A` auf `#FAF5EE`
→ Kontrastverhältnis: ca. **3.9:1** – knapp unter 4.5:1 für
Normtext, aber OK für großen Text (≥ 18pt/14pt bold).

Betrifft: Section-Labels (0.7rem = ca. 11px → zählt als Normtext!)

**Fix für Section-Labels:**
```css
.section-label {
  color: var(--col-espresso); /* statt terra, 15:1 Kontrast */
}
```
Oder die Labels auf mindestens 14px bold / 18px regular setzen.

⚠️ **4.3 Terra-Light als Hover-Farbe** (WCAG 1.4.3)
`--col-terra-light: #D4845E` auf `#FAF5EE`
→ Kontrastverhältnis: ca. **2.9:1** – FAIL auch für großen Text.

Betrifft: Link-Hover-State, Button-Hover.

**Fix:**
```css
--col-terra-light: #A8613E; /* ca. 4.8:1 auf Cream */
```

---

### 5. Bilder & Medien

✅ **5.1 Alt-Texte auf allen `<img>` Elementen**
- Logo Header: `alt="da Enzo"` ✅
- About-Bild: `alt="Frische Pasta wird zubereitet"` ✅
- Logo Footer: `alt="da Enzo"` ✅

⚠️ **5.2 Hero-Hintergrundbild ohne Alternative** (WCAG 1.1.1)
Das Hero-Bild ist ein CSS `background-image`. Falls es dekorativer
Natur ist (was es hier ist – es zeigt Atmosphäre), ist das OK.
Aber die Hero-Section hat kein `role="banner"` Attribut.
→ **Gering: kein Handlungsbedarf** (header-Element reicht).

⚠️ **5.3 Emojis ohne Textalternative** (WCAG 1.1.1)
Die Highlight-Icons (🍝 ☕ 📋 🍰) und der WhatsApp-Button (💬)
sind reine Emojis ohne `aria-label` auf dem Container.

**Fix – Highlight-Cards:**
```html
<span class="highlight-icon" role="img" aria-hidden="true">🍝</span>
```
(`aria-hidden` weil die Überschrift daneben den Kontext gibt)

**Fix – WhatsApp Float:** Hat bereits `aria-label="WhatsApp"` ✅

---

### 6. Formulare

✅ **6.1 Labels korrekt verknüpft**
Alle `<label for="...">` matchen die `id` der Inputs. ✅

✅ **6.2 Required-Attribute**
Pflichtfelder haben `required` und visuelles `*`. ✅

⚠️ **6.3 Pflichtfeld-Kennzeichnung nur visuell** (WCAG 1.3.1)
Das `*` hinter dem Label zeigt Pflichtfelder an, aber Screenreader
lesen es als "Sternchen". `aria-required` fehlt.

**Fix:** An alle Pflicht-Inputs `aria-required="true"` ergänzen.
Oder einen Hinweis "* = Pflichtfeld" vor dem Formular.

⚠️ **6.4 Formular-Feedback nicht als Live-Region** (WCAG 4.1.3)
Die Erfolgs-/Fehlermeldung (`#formStatus`) wird per JS eingeblendet,
aber ohne `role="alert"` oder `aria-live`. Screenreader bemerken
die Meldung nicht.

**Fix:**
```html
<div class="form-status" id="formStatus" role="alert" aria-live="polite"></div>
```

⚠️ **6.5 Formular-Validierung nur nativ** (WCAG 3.3.1)
Bei Fehleingaben zeigt der Browser die nativen Validierungs-Popups.
Das ist funktional OK, aber nicht ideal. Für WCAG AA reicht es.

---

### 7. Animationen

⚠️ **7.1 Kein `prefers-reduced-motion`** (WCAG 2.3.3 – Level AAA, aber Best Practice)
Die Website hat scroll-basierte Reveal-Animationen und CSS
Transitions. Nutzer die Bewegung reduziert haben möchten,
werden nicht berücksichtigt.

**Fix:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .reveal {
    opacity: 1 !important;
    transform: none !important;
  }
}
```

---

### 8. ARIA & Semantik

⚠️ **8.1 Links mit `target="_blank"` ohne Hinweis** (WCAG 3.2.5)
WhatsApp-Links öffnen in neuem Tab ohne Warnung.

**Fix:** `aria-label` erweitern oder visuellen Hinweis:
```html
<a href="https://wa.me/..." target="_blank"
   rel="noopener noreferrer"
   aria-label="Per WhatsApp reservieren (öffnet neues Fenster)">
```

⚠️ **8.2 Doppeltes Logo-Link-Element** (WCAG 2.4.4)
In der Navigation gibt es zwei `<a>` Links nacheinander die
zum gleichen Ziel führen (Logo-Bild + "da Enzo" Text).
Screenreader lesen zwei separate Links.

**Fix:** In ein einziges `<a>` zusammenfassen:
```html
<a href="#" class="nav-logo">
  <img src="./img/logo-header.webp" alt="da Enzo – Zurück zum Anfang" class="nav-logo-img">
</a>
```
(Zweiten `<a>` entfernen)

⚠️ **8.3 Google Maps iframe** (WCAG 1.3.1)
Der iframe hat einen `title` ✅, aber keine Alternative für Nutzer
die den iframe nicht sehen/laden können.

**Fix:** Unter dem iframe eine Textadresse als Fallback:
```html
<noscript>
  <p>Da Enzo – Zschokkestraße 34, 80686 München.
  <a href="https://goo.gl/maps/...">In Google Maps öffnen</a></p>
</noscript>
```

---

## Zusammenfassung: Was muss gemacht werden?

### Kritisch (WCAG A – sollte gefixt werden)

| # | Problem | Aufwand |
|---|---------|---------|
| 1 | `<main>` Landmark fehlt | 1 Min |
| 2 | Skip-Link fehlt | 5 Min |
| 3 | Burger-Menü: `<div>` → `<button>` + aria | 5 Min |
| 4 | Akkordeon: Tastatur + aria-expanded | 5 Min |
| 5 | Farbkontrast text-muted (#7A6E62) zu niedrig | 1 Min |

### Wichtig (WCAG AA – empfohlen)

| # | Problem | Aufwand |
|---|---------|---------|
| 6 | Focus-visible Style global | 2 Min |
| 7 | Section-Labels Kontrast (Terra auf Cream) | 1 Min |
| 8 | Terra-Light Hover-Farbe Kontrast | 1 Min |
| 9 | Formular-Status als `role="alert"` | 1 Min |
| 10 | Doppeltes Logo-Link bereinigen | 2 Min |
| 11 | target="_blank" Hinweis | 2 Min |

### Nice-to-have (Best Practice / AAA)

| # | Problem | Aufwand |
|---|---------|---------|
| 12 | `prefers-reduced-motion` | 3 Min |
| 13 | Sections aria-labelledby | 5 Min |
| 14 | Emojis aria-hidden | 2 Min |
| 15 | Pflichtfeld-Hinweis | 2 Min |
| 16 | Maps noscript-Fallback | 2 Min |

### Geschätzter Gesamtaufwand: ~40 Minuten

---

## Was die Website schon richtig macht

- `lang="de"` auf HTML-Element
- Saubere Überschriften-Hierarchie (h1 → h2 → h3)
- Semantisches HTML (nav, header, section, footer)
- Alle Bilder haben Alt-Texte
- Formulare haben korrekte Label-Verknüpfungen
- Required-Attribute auf Pflichtfeldern
- iframe hat title-Attribut
- WhatsApp-Float hat aria-label
- Kein user-scalable=no (Zoom bleibt erlaubt)
- Responsive Design funktioniert
- Lokale Fonts (kein Flash of Unstyled Text)
