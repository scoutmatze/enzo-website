# Enzo Website – Adobe Firefly Prompts
## Platzhalter-Bilder für die Website

---

## Farbwelt als Referenz (für Firefly "Style Reference")

Die Website nutzt diese Palette – die Bilder sollten dazu passen:
- Terracotta / gebranntes Orange (#B85A3A)
- Espresso-Braun / warmes Dunkel (#2A1F17)
- Warmweiß / Crème (#FAF5EE)
- Olivgrün als Akzent (#5C6B4E)
- Goldtöne, warmes Holz, natürliches Licht

Allgemeine Firefly-Settings für alle Bilder:
- Style: Photo
- Lighting: Warm, Golden Hour oder Ambient
- Mood: Inviting, Cozy, Authentic
- NICHT: übersterilisiert, Food-Blogger-ästhetik, zu modern/minimalistisch

---

## Bild 1: HERO (Hauptbild oben)

**Verwendung:** Vollbild-Hintergrund, Hero-Section, wird dunkel überlagert
**Datei:** `img/hero.jpg`
**Maße:** 1600 × 1000 px (Querformat, wird zentriert/gecropt)
**Wichtig:** Das Bild wird mit einem dunklen Gradient überlagert –
also darf es ruhig detailreich sein, muss aber im unteren/linken
Bereich Platz für weißen Text lassen.

### Firefly Prompt:

```
Interior of a small, cozy Italian trattoria restaurant in the evening,
warm ambient lighting from hanging pendant lamps and candles on wooden
tables, exposed brick wall, rustic wooden furniture, wine bottles on
shelves in the background, a few plates of pasta and wine glasses on a
table in the foreground slightly out of focus, warm terracotta and brown
color tones, inviting atmosphere, no people visible, shot from a low
angle across a table, cinematic depth of field, editorial photography
style
```

### Negative Prompt (falls Firefly das unterstützt):
```
modern minimalist, bright white, neon lights, fast food, plastic
furniture, stock photo look, text, watermark
```

### Firefly Settings:
- Aspect Ratio: 16:10 (oder Widescreen)
- Content Type: Photo
- Visual Intensity: Medium-High
- Wenn verfügbar → Style: Warm Film Photography

---

## Bild 2: ÜBER ENZO (About-Section)

**Verwendung:** Hochformat-Bild neben dem "Willkommen bei Enzo"-Text
**Datei:** `img/about.jpg`
**Maße:** 800 × 1000 px (Hochformat / Portrait, 4:5)
**Wichtig:** Ein goldener Rahmen-Effekt liegt per CSS über dem Bild.
Das Motiv sollte also nicht bis zum äußersten Rand wichtig sein.

### Firefly Prompt:

```
Close-up of fresh handmade Italian pasta being prepared on a rustic
wooden countertop dusted with flour, hands of a chef rolling out
tagliatelle dough, warm golden side lighting from a window, a small
bowl of fresh eggs and a rolling pin visible in the background, shallow
depth of field, terracotta and warm brown tones, authentic artisan feel,
no face visible, food photography with natural light, vertical
composition
```

### Alternative (falls Enzo lieber Innenraum statt Pasta zeigen will):

```
View through the entrance of a small Italian café restaurant, warm
morning light streaming in, espresso machine on a marble counter,
chalkboard menu on the wall, fresh pastries in a glass display case,
wooden chairs and small round tables, potted herbs on the windowsill,
cozy neighborhood trattoria atmosphere, golden hour lighting, vertical
composition, editorial photography
```

### Firefly Settings:
- Aspect Ratio: 4:5 (Portrait)
- Content Type: Photo
- Visual Intensity: Medium

---

## Bild 3: OG-IMAGE (Social Media Preview)

**Verwendung:** Wird angezeigt wenn jemand den Link auf WhatsApp,
Facebook, Instagram, LinkedIn etc. teilt
**Datei:** `img/og-image.jpg`
**Maße:** 1200 × 630 px (exakt – das ist der OG-Standard)
**Wichtig:** Das Bild muss auch als kleines Thumbnail funktionieren.
Am besten ein klares, appetitliches Motiv ohne zu viele Details.

### Firefly Prompt:

```
A beautifully plated Italian pasta dish on a dark rustic wooden table,
tagliatelle with fresh basil and parmesan shavings, a glass of red wine
and a small espresso cup beside it, warm candlelight creating soft
golden highlights, shallow depth of field with the background softly
blurred showing a cozy restaurant interior, overhead angle slightly
tilted, warm terracotta and espresso brown tones, editorial food
photography, appetizing and inviting
```

### Firefly Settings:
- Aspect Ratio: Custom 1200×630 oder nächstes Querformat
- Content Type: Photo
- Visual Intensity: Medium-High

---

## Bild 4 (optional): SPEISEKARTEN-HEADER

**Verwendung:** Falls du einen visuellen Trenner zwischen Sections willst
**Datei:** `img/menu-bg.jpg`
**Maße:** 1600 × 400 px (extrem breites Querformat / Banner)

### Firefly Prompt:

```
Flat lay top-down view of Italian cooking ingredients on a dark wooden
surface, scattered fresh basil leaves, cherry tomatoes, olive oil in a
small ceramic bowl, dried pasta shapes, garlic cloves, a sprinkle of
flour, parmesan cheese wedge, warm directional lighting from the left
creating soft shadows, muted earthy color palette with terracotta and
olive green accents, food styling photography, negative space on the
right side for text overlay
```

### Firefly Settings:
- Aspect Ratio: Custom (very wide) oder 4:1
- Content Type: Photo

---

## Bild 5 (optional): 404-SEITE

**Verwendung:** Hintergrundbild für die Fehlerseite (aktuell nur Farbe)
**Datei:** `img/404.jpg`
**Maße:** 1200 × 800 px

### Firefly Prompt:

```
A single empty white plate on a dark wooden restaurant table, a few
breadcrumbs scattered around it, a folded linen napkin beside it, warm
moody lighting, as if the meal is already finished, melancholic but
beautiful atmosphere, shallow depth of field, muted warm tones, minimal
composition, editorial still life photography
```

---

## Allgemeine Tipps für Firefly

1. **Generiere mehrere Varianten** – Firefly gibt dir 4 auf einmal,
   nimm die natürlichste (nicht die "perfekteste").

2. **Nachbearbeitung:** Lade das Ergebnis auf https://squoosh.app
   hoch und komprimiere als JPEG mit Qualität 80. Ziel:
   - Hero: unter 300 KB
   - About: unter 200 KB
   - OG-Image: unter 150 KB

3. **Farbkorrektur:** Falls die Bilder zu kühl wirken, erhöhe
   in einem beliebigen Bildeditor leicht die Wärme / Farbtemperatur
   Richtung 6500K+. Die Website lebt von warmen Tönen.

4. **Konsistenz:** Generiere alle Bilder in einer Session und wähle
   Ergebnisse, die farblich zusammenpassen. Ein kühles Hero-Bild
   neben einem warmen About-Bild wirkt unstimmig.

5. **Firefly "Generative Fill":** Falls ein Bild fast perfekt ist
   aber z.B. ein störendes Element hat, nutze Generative Fill um
   es zu entfernen – funktioniert in Firefly sehr gut.

6. **Sobald Enzo echte Fotos hat → sofort ersetzen!** KI-Bilder
   sind Platzhalter. Echte Fotos vom tatsächlichen Restaurant
   schaffen Vertrauen und sind für lokales SEO (Google Bilder)
   deutlich besser.

---

## Dateien ins Repo

Nach dem Generieren und Komprimieren:

```
enzo-website/
├── img/
│   ├── hero.jpg         ← Bild 1 (1600×1000, <300KB)
│   ├── about.jpg        ← Bild 2 (800×1000, <200KB)
│   ├── og-image.jpg     ← Bild 3 (1200×630, <150KB)
│   ├── menu-bg.jpg      ← Bild 4 optional
│   └── 404.jpg          ← Bild 5 optional
```

Dann in der index.html die URLs ersetzen:

Hero (CSS background):
```css
/* Ersetze die Unsplash-URL durch: */
url('./img/hero.jpg') center/cover no-repeat;
```

About (img tag):
```html
<!-- Ersetze die Unsplash-URL durch: -->
<img src="./img/about.jpg" alt="Frische Pasta wird zubereitet" loading="lazy">
```
