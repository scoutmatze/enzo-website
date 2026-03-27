// ═══════════════════════════════════════════
// WOCHENKARTE (Kategorie-basiert, 2-Wochen-Menü)
// ═══════════════════════════════════════════

let wkItems = []; // Temporäre Items für Modal
let wkCategories = []; // Verfügbare Kategorien

async function renderWeekly() {
  try {
    CACHE.weeklyMenus = await api('GET', '/weekly-menu');
    CACHE.dishes = await api('GET', '/dishes?active=true');
  } catch (e) { msg(e.message, false); return; }

  // Kategorien aus Gerichten ableiten
  const catSet = new Set();
  (CACHE.dishes || []).forEach(d => { if (d.category) catSet.add(d.category); });
  wkCategories = [...catSet].sort();

  const catLabels = { antipasti: 'Antipasti', primi: 'Primi Piatti', secondi: 'Secondi', pinse: 'Pinse & Pizza', dolci: 'Dolci', caffe: 'Caffè', alkoholfrei: 'Alkoholfrei', bier: 'Birra', aperitivi: 'Aperitivi', wein: 'Vino', digestivi: 'Digestivi', sonstiges: 'Sonstiges' };

  document.getElementById('page-content').innerHTML = `
    <div class="card">
      <div class="card-h">
        <h3>Le specialità dello Chef</h3>
        <div class="btns">
          <button class="btn btn-p" onclick="openWeeklyModal()">+ Neue Wochenkarte</button>
          <button class="btn btn-s" onclick="printMenuPdf('wochenkarte')">🖨️ Drucken</button>
        </div>
      </div>
      <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.8rem">2-Wochen-Menü nach Kategorien – wird auf der Website und als Druck-PDF angezeigt.</p>
      <table>
        <thead><tr><th>Gültig</th><th>Gerichte</th><th>Status</th><th style="width:140px"></th></tr></thead>
        <tbody>${CACHE.weeklyMenus.length === 0 ? '<tr><td colspan="4" class="empty">Noch keine Wochenkarten.</td></tr>' :
    CACHE.weeklyMenus.map(m => {
      const start = new Date(m.week_start).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      const end = m.week_end ? new Date(m.week_end).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';

      // Items nach Kategorie gruppieren
      const grouped = {};
      (m.items || []).forEach(i => {
        const cat = i.category || i.dish_category || 'Sonstiges';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(i);
      });

      const itemsHtml = Object.entries(grouped).map(([cat, items]) => {
        const label = catLabels[cat] || cat;
        return `<strong style="color:var(--terra)">${esc(label)}:</strong> ` + items.map(i => {
          const name = i.dish_name || i.custom_name || '?';
          const price = i.price ? ' (' + parseFloat(i.price).toFixed(2).replace('.', ',') + ' €)' : '';
          const all = i.allergens ? ' <span style="color:var(--terra);font-size:0.68rem">[' + i.allergens + ']</span>' : '';
          return esc(name) + price + all;
        }).join(', ');
      }).join('<br>') || '–';

      return `<tr>
        <td><strong>${start} – ${end}</strong></td>
        <td style="font-size:0.78rem">${itemsHtml}</td>
        <td>${m.is_published ? '<span class="badge b-ok">Veröffentlicht</span>' : '<span class="badge b-gold">Entwurf</span>'}</td>
        <td>
          <div class="btns">
            ${!m.is_published ? `<button class="btn btn-sm btn-ok" onclick="publishWeekly(${m.id})">Veröffentlichen</button>` : ''}
            <button class="btn btn-sm btn-s" onclick="deleteWeekly(${m.id})">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('')}</tbody>
      </table>
    </div>
    <div id="weekly-modal"></div>
  `;
}

function getNextMonday() {
  const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? 1 : 8 - day));
  return d.toISOString().split('T')[0];
}

function getTwoWeeksLater(startStr) {
  const d = new Date(startStr);
  d.setDate(d.getDate() + 13);
  return d.toISOString().split('T')[0];
}

function openWeeklyModal() {
  const nextMon = getNextMonday();
  wkItems = [];

  const catLabels = { antipasti: 'Antipasti', primi: 'Primi Piatti', secondi: 'Secondi', pinse: 'Pinse & Pizza', dolci: 'Dolci', caffe: 'Caffè', alkoholfrei: 'Alkoholfrei', bier: 'Birra', aperitivi: 'Aperitivi', wein: 'Vino', digestivi: 'Digestivi' };

  $('weekly-modal').innerHTML = `
    <div class="modal-bg" onclick="this.remove()">
      <div class="modal" style="max-width:700px;max-height:90vh;overflow-y:auto" onclick="event.stopPropagation()">
        <div class="modal-h"><h3>Le specialità dello Chef</h3><button class="modal-close" onclick="this.closest('.modal-bg').remove()">×</button></div>
        <div class="modal-b">
          <div class="row">
            <div class="fg"><label>Gültig ab</label><input id="wk-start" type="date" value="${nextMon}" onchange="$('wk-end').value=getTwoWeeksLater(this.value)"></div>
            <div class="fg"><label>Gültig bis</label><input id="wk-end" type="date" value="${getTwoWeeksLater(nextMon)}"></div>
          </div>

          <h4 style="margin:1rem 0 0.5rem;color:var(--terra)">Gerichte hinzufügen</h4>
          <div style="display:flex;gap:6px;align-items:end;flex-wrap:wrap;margin-bottom:0.5rem">
            <div class="fg" style="flex:1;min-width:120px">
              <label>Kategorie</label>
              <select id="wk-add-cat">
                ${wkCategories.map(c => `<option value="${c}">${catLabels[c] || c}</option>`).join('')}
              </select>
            </div>
            <div class="fg" style="flex:2;min-width:200px">
              <label>Gericht</label>
              <select id="wk-add-dish" onchange="wkDishSelected()">
                <option value="">Gericht wählen...</option>
              </select>
            </div>
            <div class="fg" style="width:80px">
              <label>Preis €</label>
              <input id="wk-add-price" type="number" step="0.10" placeholder="€">
            </div>
            <button class="btn btn-p btn-sm" onclick="wkAddDish()" style="height:38px">+ Hinzufügen</button>
          </div>

          <div style="display:flex;gap:6px;margin-bottom:0.8rem">
            <button class="btn btn-s btn-sm" onclick="wkShowFreitext()" style="font-size:0.75rem">📝 Freitext hinzufügen</button>
          </div>

          <div id="wk-freitext-row" class="hidden" style="padding:8px;background:var(--cream);border-radius:4px;margin-bottom:0.8rem">
            <div class="row">
              <div class="fg" style="flex:1"><label>Kategorie</label>
                <select id="wk-ft-cat">
                  ${wkCategories.map(c => `<option value="${c}">${catLabels[c] || c}</option>`).join('')}
                </select>
              </div>
              <div class="fg" style="flex:2"><label>Name</label><input id="wk-ft-name" placeholder="Gerichtname"></div>
              <div class="fg" style="width:80px"><label>Preis €</label><input id="wk-ft-price" type="number" step="0.10"></div>
            </div>
            <div class="row" style="margin-top:4px">
              <div class="fg" style="flex:2"><label>Beschreibung</label><input id="wk-ft-desc" placeholder="optional"></div>
              <div class="fg" style="flex:1"><label>Allergene</label><input id="wk-ft-allergens" placeholder="z.B. A,C,G"></div>
            </div>
            <button class="btn btn-p btn-sm" onclick="wkAddFreitext()" style="margin-top:6px">Freitext übernehmen</button>
          </div>

          <div id="wk-items-list" style="margin-bottom:0.8rem"></div>

          <div class="fg"><label>Fußnote (optional)</label><input id="wk-note" placeholder="z.B. Alle Gerichte auch zum Mitnehmen"></div>
        </div>
        <div class="modal-f">
          <button class="btn btn-s" onclick="this.closest('.modal-bg').remove()">Abbrechen</button>
          <button class="btn btn-p" onclick="saveWeekly()">Erstellen</button>
        </div>
      </div>
    </div>
  `;

  // Gericht-Dropdown aktualisieren wenn Kategorie sich ändert
  $('wk-add-cat').addEventListener('change', wkUpdateDishDropdown);
  wkUpdateDishDropdown();
}

function wkUpdateDishDropdown() {
  const cat = $('wk-add-cat').value;
  const dishes = (CACHE.dishes || []).filter(d => d.category === cat);
  $('wk-add-dish').innerHTML = '<option value="">Gericht wählen...</option>' +
    dishes.map(d => `<option value="${d.id}" data-price="${d.base_price || 0}" data-allergens="${d.allergens || ''}">${esc(d.name)}${d.base_price ? ' (' + d.base_price.toFixed(2) + ' €)' : ''}</option>`).join('');
  $('wk-add-price').value = '';
}

function wkDishSelected() {
  const sel = $('wk-add-dish');
  const opt = sel.selectedOptions[0];
  if (opt && opt.value) {
    const price = opt.dataset.price;
    if (price && price !== '0') $('wk-add-price').value = price;
  }
}

function wkAddDish() {
  const dishId = parseInt($('wk-add-dish').value);
  if (!dishId) { msg('Bitte ein Gericht wählen.', false); return; }
  const dish = CACHE.dishes.find(d => d.id === dishId);
  if (!dish) return;

  wkItems.push({
    dish_id: dishId,
    category: $('wk-add-cat').value,
    price: parseFloat($('wk-add-price').value) || dish.base_price || 0,
    dish_name: dish.name,
    allergens: dish.allergens || '',
  });

  wkRenderItems();
  $('wk-add-dish').value = '';
  $('wk-add-price').value = '';
}

function wkShowFreitext() {
  $('wk-freitext-row').classList.toggle('hidden');
}

function wkAddFreitext() {
  const name = $('wk-ft-name').value.trim();
  if (!name) { msg('Bitte Gerichtname eingeben.', false); return; }

  wkItems.push({
    category: $('wk-ft-cat').value,
    custom_name: name,
    custom_description: $('wk-ft-desc').value.trim() || null,
    custom_allergens: $('wk-ft-allergens').value.trim() || null,
    price: parseFloat($('wk-ft-price').value) || 0,
    dish_name: name,
    allergens: $('wk-ft-allergens').value.trim() || '',
  });

  wkRenderItems();
  $('wk-ft-name').value = '';
  $('wk-ft-desc').value = '';
  $('wk-ft-allergens').value = '';
  $('wk-ft-price').value = '';
  $('wk-freitext-row').classList.add('hidden');
}

function wkRemoveItem(idx) {
  wkItems.splice(idx, 1);
  wkRenderItems();
}

function wkRenderItems() {
  const catLabels = { antipasti: 'Antipasti', primi: 'Primi Piatti', secondi: 'Secondi', pinse: 'Pinse & Pizza', dolci: 'Dolci', caffe: 'Caffè', alkoholfrei: 'Alkoholfrei', bier: 'Birra', aperitivi: 'Aperitivi', wein: 'Vino', digestivi: 'Digestivi' };

  if (wkItems.length === 0) {
    $('wk-items-list').innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem">Noch keine Gerichte hinzugefügt.</p>';
    return;
  }

  // Nach Kategorie gruppieren
  const grouped = {};
  wkItems.forEach((item, idx) => {
    const cat = item.category || 'sonstiges';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ ...item, _idx: idx });
  });

  let html = '';
  for (const [cat, items] of Object.entries(grouped)) {
    html += `<div style="margin-bottom:8px">`;
    html += `<div style="font-weight:600;font-size:0.82rem;color:var(--terra);margin-bottom:3px">${catLabels[cat] || cat}</div>`;
    for (const item of items) {
      html += `<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:var(--cream);border-radius:3px;margin-bottom:2px;font-size:0.82rem">`;
      html += `<span style="flex:1">${esc(item.dish_name || item.custom_name)}`;
      if (item.allergens) html += ` <span style="color:var(--terra);font-size:0.68rem">[${item.allergens}]</span>`;
      html += `</span>`;
      html += `<span style="font-weight:600">${item.price ? parseFloat(item.price).toFixed(2).replace('.', ',') + ' €' : ''}</span>`;
      html += `<button class="btn btn-sm" onclick="wkRemoveItem(${item._idx})" style="padding:2px 6px;font-size:0.7rem">✕</button>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  $('wk-items-list').innerHTML = html;
}

async function saveWeekly() {
  if (wkItems.length === 0) { msg('Bitte mindestens ein Gericht hinzufügen.', false); return; }

  const items = wkItems.map(item => ({
    dish_id: item.dish_id || null,
    category: item.category || null,
    price: item.price || 0,
    custom_name: item.custom_name || null,
    custom_description: item.custom_description || null,
    custom_allergens: item.custom_allergens || null,
  }));

  try {
    await api('POST', '/weekly-menu', {
      week_start: $('wk-start').value,
      week_end: $('wk-end').value,
      note: $('wk-note').value,
      items,
    });
    renderWeekly();
    msg('Wochenkarte erstellt.');
  } catch (e) { msg(e.message, false); }
}

async function publishWeekly(id) {
  try { const r = await api('POST', '/weekly-menu/' + id + '/publish'); msg(r.message); renderWeekly(); } catch (e) { msg(e.message, false); }
}

async function deleteWeekly(id) {
  if (!confirm('Wochenkarte wirklich löschen?')) return;
  try { await api('DELETE', '/weekly-menu/' + id); msg('Gelöscht.'); renderWeekly(); } catch (e) { msg(e.message, false); }
}
