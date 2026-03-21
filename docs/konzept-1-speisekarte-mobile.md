# Konzept 1: Mobile Speisekarte – Akkordeon-Navigation
## Enzo Website – Mobile UX Redesign

---

## Problem

Die Speisekarte hat 10 Kategorien mit 50+ Einträgen. Auf dem Handy
bedeutet das endloses Scrollen. Ein Gast der nur die Pinse sehen will,
muss an Antipasti, Primi Piatti und Secondi vorbei.

## Entscheidung

**Akkordeon (aufklappbare Kategorien)** – jede Kategorie ist ein
Balken, der sich per Tap öffnet und die Gerichte zeigt. Nur eine
Kategorie ist gleichzeitig offen (die andere klappt zu). Auf dem
Desktop bleibt das 2-Spalten-Grid wie bisher – das Akkordeon greift
nur auf Mobilgeräten (unter 900px).

Warum Akkordeon statt Tabs: Bei 10 Kategorien passen Tabs nicht in
eine Zeile auf dem Handy. Man müsste horizontal scrollen, was auf
Mobil schlecht funktioniert. Akkordeon skaliert mit beliebig vielen
Kategorien und ist das bewährte Pattern für Restaurant-Speisekarten.

---

## Änderungen

### 1. CSS ergänzen (im <style>-Block einfügen)

Suche den Kommentar:
```css
/* ═══════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════ */
```

Füge DAVOR diesen Block ein:

```css
  /* ═══════════════════════════════════════════
     SPEISEKARTE AKKORDEON (Mobile)
     ═══════════════════════════════════════════ */
  .menu-category-header {
    display: none; /* Versteckt auf Desktop */
  }

  @media (max-width: 900px) {
    .menu-categories {
      display: flex !important;
      flex-direction: column;
      gap: 0;
    }

    .menu-category {
      border-bottom: 1px solid var(--col-cream-dark);
    }

    .menu-category h3 {
      display: none; /* Original h3 verstecken auf Mobil */
    }

    .menu-category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0.5rem;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }

    .menu-category-header span {
      font-family: var(--font-display);
      font-size: 1.3rem;
      font-weight: 600;
      color: var(--col-espresso);
    }

    .menu-category-header .accordion-icon {
      font-size: 1.4rem;
      color: var(--col-terra);
      transition: transform 0.3s ease;
      line-height: 1;
    }

    .menu-category.open .accordion-icon {
      transform: rotate(45deg);
    }

    .menu-category-items {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.4s ease, padding 0.3s ease;
      padding: 0 0.5rem;
    }

    .menu-category.open .menu-category-items {
      max-height: 2000px; /* Groß genug für jede Kategorie */
      padding: 0 0.5rem 1rem;
    }

    .menu-item {
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.25s ease, transform 0.25s ease;
    }

    .menu-category.open .menu-item {
      opacity: 1;
      transform: translateY(0);
    }

    /* Stagger-Animation für Menüpunkte */
    .menu-category.open .menu-item:nth-child(1) { transition-delay: 0.05s; }
    .menu-category.open .menu-item:nth-child(2) { transition-delay: 0.1s; }
    .menu-category.open .menu-item:nth-child(3) { transition-delay: 0.15s; }
    .menu-category.open .menu-item:nth-child(4) { transition-delay: 0.2s; }
    .menu-category.open .menu-item:nth-child(5) { transition-delay: 0.25s; }
    .menu-category.open .menu-item:nth-child(6) { transition-delay: 0.3s; }

    /* Erste Kategorie standardmäßig offen */
    .menu-category:first-child {
      /* wird per JS gesteuert */
    }
  }
```


### 2. JavaScript anpassen – loadSpeisekarte() ersetzen

Ersetze die gesamte `loadSpeisekarte` Funktion durch:

```javascript
/* ── SPEISEKARTE LADEN ───────────────────── */
async function loadSpeisekarte() {
  const container = document.getElementById('menuContent');
  const introEl = document.getElementById('menuIntro');
  const allergensEl = document.getElementById('menuAllergens');

  try {
    const res = await fetch(CONFIG.speisekarteUrl);
    if (!res.ok) throw new Error('Nicht gefunden');
    const data = await res.json();

    if (data.intro && introEl) {
      introEl.textContent = data.intro;
    }

    if (data.allergenNote && allergensEl) {
      allergensEl.textContent = data.allergenNote;
    }

    let html = '';
    for (let i = 0; i < (data.categories || []).length; i++) {
      const cat = data.categories[i];
      const isFirst = i === 0;

      html += `<div class="menu-category reveal${isFirst ? ' open' : ''}">`;

      // Akkordeon-Header (nur auf Mobile sichtbar per CSS)
      html += `<div class="menu-category-header" onclick="toggleMenuCategory(this)">`;
      html += `<span>${cat.name}</span>`;
      html += `<span class="accordion-icon">+</span>`;
      html += `</div>`;

      // Originale h3 (nur auf Desktop sichtbar per CSS)
      html += `<h3>${cat.name}</h3>`;

      // Items-Container (auf Mobile animiert)
      html += `<div class="menu-category-items">`;

      for (const item of (cat.items || [])) {
        html += `<div class="menu-item">`;
        html += `<div><span class="menu-item-name">${item.name}</span>`;
        if (item.desc) {
          html += `<br><span class="menu-item-desc">${item.desc}</span>`;
        }
        html += `</div>`;
        html += `<span class="menu-item-dots"></span>`;
        html += `<span class="menu-item-price">${item.price}`;
        if (item.allergens) {
          html += `<span class="menu-item-allergens"> (${item.allergens})</span>`;
        }
        html += `</span>`;
        html += `</div>`;
      }

      html += `</div>`; // /menu-category-items
      html += `</div>`; // /menu-category
    }

    container.innerHTML = html;
    container.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  } catch (e) {
    console.error('Speisekarte konnte nicht geladen werden:', e);
    if (introEl) {
      introEl.textContent = 'Die Speisekarte konnte leider nicht geladen werden.';
    }
  }
}

function toggleMenuCategory(header) {
  const category = header.parentElement;
  const allCategories = category.parentElement.querySelectorAll('.menu-category');

  // Alle anderen schließen
  allCategories.forEach(cat => {
    if (cat !== category) cat.classList.remove('open');
  });

  // Aktuelle togglen
  category.classList.toggle('open');

  // Sanft zum geöffneten Element scrollen
  if (category.classList.contains('open')) {
    setTimeout(() => {
      category.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

loadSpeisekarte();
```


### 3. Keine Änderung an speisekarte.json nötig

Die JSON-Struktur bleibt identisch. Das Akkordeon wird rein
durch CSS + JS gesteuert.

---

## Verhalten

### Desktop (> 900px):
- Keine Änderung – 2-Spalten-Grid wie bisher
- Akkordeon-Header sind per CSS versteckt
- Alle Kategorien sind sichtbar

### Mobile (< 900px):
- Jede Kategorie wird zu einem aufklappbaren Balken
- Erste Kategorie (Antipasti) ist standardmäßig offen
- Tap auf eine Kategorie → öffnet sie, schließt alle anderen
- Sanfte Slide-Animation + Stagger-Effekt auf den Einträgen
- Auto-Scroll zur geöffneten Kategorie

### Scrollersparnis:
- Vorher: ~3500px Scrollhöhe auf Mobile (alles offen)
- Nachher: ~800px + jeweils die offene Kategorie (~300-500px)
- Enzo's Gast findet seine Pinse in 2 Taps statt endlosem Scrollen
