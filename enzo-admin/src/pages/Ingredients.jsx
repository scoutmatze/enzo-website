import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', allergen_ids: [] });
  const [msg, setMsg] = useState('');

  const load = () => {
    api.get('/ingredients').then(setIngredients).catch(() => {});
    api.get('/ingredients/allergens').then(setAllergens).catch(() => {});
  };
  useEffect(load, []);

  const openNew = () => { setEditing(null); setForm({ name: '', allergen_ids: [] }); setShowModal(true); };

  const openEdit = (ing) => {
    setEditing(ing);
    setForm({ name: ing.name, allergen_ids: ing.allergens ? ing.allergens.split(', ').filter(Boolean) : [] });
    setShowModal(true);
  };

  const toggleAllergen = (id) => {
    setForm(f => ({
      ...f,
      allergen_ids: f.allergen_ids.includes(id) ? f.allergen_ids.filter(a => a !== id) : [...f.allergen_ids, id]
    }));
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/ingredients/${editing.id}`, form);
        setMsg('Zutat aktualisiert.');
      } else {
        await api.post('/ingredients', form);
        setMsg('Zutat erstellt.');
      }
      setShowModal(false);
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setMsg('Fehler: ' + e.message); }
  };

  return (
    <>
      {msg && <div className={`alert ${msg.startsWith('Fehler') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

      <div className="card">
        <div className="card-header">
          <h3>Zutaten & Allergene – {ingredients.length} Einträge</h3>
          <button className="btn btn-primary" onClick={openNew}>+ Neue Zutat</button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Jede Zutat wird einmal mit ihren Allergenen angelegt. Wenn du die Zutat dann einem Gericht zuweist, werden die Allergene automatisch berechnet.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Zutat</th>
                <th>Allergene</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {ingredients.length === 0 ? (
                <tr><td colSpan={3}>
                  <div className="empty-state">
                    <div className="icon">🧂</div>
                    <p>Noch keine Zutaten angelegt.</p>
                    <p style={{ fontSize: '0.8rem' }}>Starte mit häufigen Zutaten wie Mehl, Ei, Milch, Olivenöl...</p>
                  </div>
                </td></tr>
              ) : ingredients.map(ing => (
                <tr key={ing.id}>
                  <td><strong>{ing.name}</strong></td>
                  <td>
                    {ing.allergens ? (
                      <div className="allergen-chips">
                        {ing.allergens.split(', ').map(a => (
                          <span key={a} className="allergen-chip active" title={allergens.find(al => al.id === a)?.name_de}>{a}</span>
                        ))}
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Keine Allergene</span>}
                  </td>
                  <td><button className="btn btn-sm btn-secondary" onClick={() => openEdit(ing)}>✏️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allergen-Legende */}
      <div className="card">
        <div className="card-header"><h3>Allergen-Legende</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {allergens.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
              <span className="allergen-chip active">{a.id}</span>
              <span>{a.name_de}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Zutat bearbeiten' : 'Neue Zutat'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Weizenmehl, Parmesan, Ei..." autoFocus />
              </div>
              <div className="form-group">
                <label>Enthält diese Allergene:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 6 }}>
                  {allergens.map(a => (
                    <div key={a.id} className="form-check">
                      <input type="checkbox" id={`al-${a.id}`} checked={form.allergen_ids.includes(a.id)} onChange={() => toggleAllergen(a.id)} />
                      <label htmlFor={`al-${a.id}`}><span className="allergen-chip active" style={{ marginRight: 4, width: 20, height: 20, fontSize: '0.6rem' }}>{a.id}</span> {a.name_de}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.name}>
                {editing ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
