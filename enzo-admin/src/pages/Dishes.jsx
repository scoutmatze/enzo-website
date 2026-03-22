import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function Dishes() {
  const [dishes, setDishes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', description: '', name_it: '', category: 'antipasti', base_price: '', is_vegetarian: false, is_vegan: false, notes: '', ingredient_ids: [] });

  const load = () => {
    api.get('/dishes').then(setDishes).catch(() => {});
    api.get('/ingredients').then(setIngredients).catch(() => {});
    api.get('/dishes/categories').then(setCategories).catch(() => {});
  };
  useEffect(load, []);

  const filtered = dishes.filter(d => {
    if (filterCat && d.category !== filterCat) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !(d.description || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', description: '', name_it: '', category: 'antipasti', base_price: '', is_vegetarian: false, is_vegan: false, notes: '', ingredient_ids: [] });
    setShowModal(true);
  };

  const openEdit = async (dish) => {
    const full = await api.get(`/dishes/${dish.id}`);
    setEditing(full);
    setForm({
      name: full.name,
      description: full.description || '',
      name_it: full.name_it || '',
      category: full.category,
      base_price: full.base_price || '',
      is_vegetarian: !!full.is_vegetarian,
      is_vegan: !!full.is_vegan,
      notes: full.notes || '',
      ingredient_ids: (full.ingredients || []).map(i => i.id),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const data = { ...form, base_price: form.base_price ? parseFloat(form.base_price) : null };
      if (editing) {
        await api.put(`/dishes/${editing.id}`, data);
        setMsg('Gericht aktualisiert.');
      } else {
        await api.post('/dishes', data);
        setMsg('Gericht erstellt.');
      }
      setShowModal(false);
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setMsg('Fehler: ' + e.message); }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Gericht deaktivieren?')) return;
    await api.delete(`/dishes/${id}`);
    load();
    setMsg('Gericht deaktiviert.');
    setTimeout(() => setMsg(''), 3000);
  };

  const toggleIngredient = (id) => {
    setForm(f => ({
      ...f,
      ingredient_ids: f.ingredient_ids.includes(id) ? f.ingredient_ids.filter(i => i !== id) : [...f.ingredient_ids, id]
    }));
  };

  // Berechne Allergene aus gewaehlten Zutaten
  const selectedAllergens = [...new Set(
    form.ingredient_ids.flatMap(id => {
      const ing = ingredients.find(i => i.id === id);
      return ing?.allergens ? ing.allergens.split(', ').filter(Boolean) : [];
    })
  )].sort();

  return (
    <>
      {msg && <div className={`alert ${msg.startsWith('Fehler') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

      <div className="card">
        <div className="card-header">
          <h3>Kochbuch – {filtered.length} Gerichte</h3>
          <button className="btn btn-primary" onClick={openNew}>+ Neues Gericht</button>
        </div>

        <div className="search-bar">
          <input placeholder="Suche nach Name oder Beschreibung..." value={search} onChange={e => setSearch(e.target.value)} />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 180 }}>
            <option value="">Alle Kategorien</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Kategorie</th>
                <th>Preis</th>
                <th>Allergene</th>
                <th style={{ width: 60 }}>V</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="empty-state"><p>Keine Gerichte gefunden.</p></td></tr>
              ) : filtered.map(dish => (
                <tr key={dish.id} style={{ opacity: dish.is_active ? 1 : 0.4 }}>
                  <td>
                    <strong>{dish.name}</strong>
                    {dish.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dish.description}</div>}
                  </td>
                  <td><span className="badge badge-muted">{categories.find(c => c.id === dish.category)?.name || dish.category}</span></td>
                  <td>{dish.base_price ? `${dish.base_price.toFixed(2).replace('.', ',')} €` : '–'}</td>
                  <td>
                    {dish.allergens ? (
                      <div className="allergen-chips">
                        {dish.allergens.split(', ').map(a => <span key={a} className="allergen-chip active">{a}</span>)}
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>–</span>}
                  </td>
                  <td>
                    {dish.is_vegan ? <span className="badge badge-olive">🌱</span> : dish.is_vegetarian ? <span className="badge badge-olive">🥚</span> : ''}
                  </td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(dish)}>✏️</button>
                      {dish.is_active ? <button className="btn btn-sm btn-icon" onClick={() => handleDeactivate(dish.id)} title="Deaktivieren">🗑</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ MODAL: Gericht erstellen/bearbeiten ═══ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Gericht bearbeiten' : 'Neues Gericht'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Spaghetti Carbonara" autoFocus />
                </div>
                <div className="form-group">
                  <label>Ital. Name</label>
                  <input value={form.name_it} onChange={e => setForm(f => ({ ...f, name_it: e.target.value }))} placeholder="Optional" />
                </div>
              </div>

              <div className="form-group">
                <label>Beschreibung</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Mit Guanciale, Ei und Pecorino" />
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label>Kategorie *</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Grundpreis (€)</label>
                  <input type="number" step="0.10" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} placeholder="12.90" />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 4 }}>
                  <div className="form-check">
                    <input type="checkbox" id="veg" checked={form.is_vegetarian} onChange={e => setForm(f => ({ ...f, is_vegetarian: e.target.checked }))} />
                    <label htmlFor="veg">Vegetarisch</label>
                  </div>
                  <div className="form-check">
                    <input type="checkbox" id="vegan" checked={form.is_vegan} onChange={e => setForm(f => ({ ...f, is_vegan: e.target.checked }))} />
                    <label htmlFor="vegan">Vegan</label>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Zutaten auswählen → Allergene werden automatisch berechnet</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, maxHeight: 180, overflowY: 'auto', padding: '8px', background: 'var(--cream)', borderRadius: 4, border: '1px solid var(--cream-dark)' }}>
                  {ingredients.map(ing => (
                    <button key={ing.id} type="button" className={`btn btn-sm ${form.ingredient_ids.includes(ing.id) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggleIngredient(ing.id)} style={{ fontSize: '0.75rem' }}>
                      {ing.name} {ing.allergens && `(${ing.allergens})`}
                    </button>
                  ))}
                  {ingredients.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Noch keine Zutaten angelegt. Erstelle zuerst Zutaten unter "Zutaten & Allergene".</span>}
                </div>
              </div>

              {selectedAllergens.length > 0 && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(184,90,58,0.08)', borderRadius: 4 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--terra)' }}>Berechnete Allergene: </span>
                  <div className="allergen-chips" style={{ marginTop: 4 }}>
                    {selectedAllergens.map(a => <span key={a} className="allergen-chip active">{a}</span>)}
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Interne Notizen</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Nur intern sichtbar..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.name || !form.category}>
                {editing ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
