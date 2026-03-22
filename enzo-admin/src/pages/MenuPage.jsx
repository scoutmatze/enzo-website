import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [msg, setMsg] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [addingTo, setAddingTo] = useState(null); // category id
  const [selectedDish, setSelectedDish] = useState('');
  const [selectedPrice, setSelectedPrice] = useState('');

  const load = () => {
    api.get('/menu').then(setCategories).catch(() => {});
    api.get('/dishes?active=true').then(setDishes).catch(() => {});
  };
  useEffect(load, []);

  const addCategory = async () => {
    if (!newCatName) return;
    await api.post('/menu/categories', { name: newCatName, sort_order: categories.length * 10 });
    setNewCatName('');
    load();
  };

  const addItem = async (categoryId) => {
    if (!selectedDish || !selectedPrice) return;
    await api.post('/menu/items', { category_id: categoryId, dish_id: parseInt(selectedDish), price: parseFloat(selectedPrice) });
    setAddingTo(null);
    setSelectedDish('');
    setSelectedPrice('');
    load();
  };

  const removeItem = async (itemId) => {
    if (!confirm('Von der Karte entfernen?')) return;
    await api.delete(`/menu/items/${itemId}`);
    load();
  };

  const exportMenu = async () => {
    try {
      const r = await api.post('/export/speisekarte');
      setMsg(r.message);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setMsg('Fehler: ' + e.message); }
  };

  return (
    <>
      {msg && <div className={`alert ${msg.startsWith('Fehler') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

      <div className="card">
        <div className="card-header">
          <h3>Speisekarte verwalten</h3>
          <div className="btn-group">
            <button className="btn btn-success" onClick={exportMenu}>🔄 Auf Website exportieren</button>
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Kategorien und Gerichte hier zusammenstellen. Nach Änderungen auf "Exportieren" klicken – dann wird die Website automatisch aktualisiert.
        </p>
      </div>

      {categories.map(cat => (
        <div className="card" key={cat.id}>
          <div className="card-header">
            <h3>{cat.name} ({cat.items?.length || 0} Gerichte)</h3>
            <button className="btn btn-sm btn-primary" onClick={() => setAddingTo(addingTo === cat.id ? null : cat.id)}>+ Gericht hinzufügen</button>
          </div>

          {addingTo === cat.id && (
            <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                <label>Gericht aus Kochbuch</label>
                <select value={selectedDish} onChange={e => {
                  setSelectedDish(e.target.value);
                  const d = dishes.find(d => d.id === parseInt(e.target.value));
                  if (d?.base_price) setSelectedPrice(d.base_price.toString());
                }}>
                  <option value="">Wählen...</option>
                  {dishes.map(d => <option key={d.id} value={d.id}>{d.name} {d.base_price ? `(${d.base_price.toFixed(2)} €)` : ''}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Preis (€)</label>
                <input type="number" step="0.10" value={selectedPrice} onChange={e => setSelectedPrice(e.target.value)} placeholder="12.90" />
              </div>
              <button className="btn btn-success btn-sm" onClick={() => addItem(cat.id)} disabled={!selectedDish || !selectedPrice}>Hinzufügen</button>
            </div>
          )}

          <table>
            <thead>
              <tr>
                <th>Gericht</th>
                <th>Beschreibung</th>
                <th>Preis</th>
                <th>Allergene</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {(cat.items || []).map(item => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.description || '–'}</td>
                  <td>{item.price?.toFixed(2).replace('.', ',')} €</td>
                  <td>
                    {item.allergens ? (
                      <div className="allergen-chips">
                        {item.allergens.split(', ').map(a => <span key={a} className="allergen-chip active">{a}</span>)}
                      </div>
                    ) : '–'}
                  </td>
                  <td><button className="btn btn-sm btn-icon" onClick={() => removeItem(item.id)} title="Entfernen">✕</button></td>
                </tr>
              ))}
              {(cat.items || []).length === 0 && <tr><td colSpan={5} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Keine Gerichte in dieser Kategorie.</td></tr>}
            </tbody>
          </table>
        </div>
      ))}

      <div className="card" style={{ borderStyle: 'dashed' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Neue Kategorie hinzufügen</label>
            <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="z.B. Vorspeisen, Hauptgerichte, Wein..." onKeyDown={e => e.key === 'Enter' && addCategory()} />
          </div>
          <button className="btn btn-primary" onClick={addCategory} disabled={!newCatName}>Erstellen</button>
        </div>
      </div>
    </>
  );
}
