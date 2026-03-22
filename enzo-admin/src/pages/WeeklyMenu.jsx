import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const DAYS = [
  { id: 1, name: 'Montag', short: 'Mo' },
  { id: 2, name: 'Dienstag', short: 'Di' },
  { id: 3, name: 'Mittwoch', short: 'Mi' },
  { id: 4, name: 'Donnerstag', short: 'Do' },
  { id: 5, name: 'Freitag', short: 'Fr' },
  { id: 6, name: 'Samstag', short: 'Sa' },
];

export default function WeeklyMenu() {
  const [menus, setMenus] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [msg, setMsg] = useState('');
  const [mode, setMode] = useState('daily');
  const [weekStart, setWeekStart] = useState(getNextMonday());
  const [note, setNote] = useState('');
  const [items, setItems] = useState({});

  const load = () => {
    api.get('/weekly-menu').then(setMenus).catch(() => {});
    api.get('/dishes?active=true').then(setDishes).catch(() => {});
  };
  useEffect(load, []);

  function getNextMonday() {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  }

  const openNew = () => {
    setMode('daily');
    setWeekStart(getNextMonday());
    setNote('');
    setItems({});
    setShowModal(true);
  };

  const setDayDish = (dayId, field, value) => {
    setItems(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], [field]: value },
    }));
  };

  const handleSave = async () => {
    const menuItems = [];
    if (mode === 'daily') {
      for (const day of DAYS) {
        if (items[day.id]?.dish_id) {
          menuItems.push({
            dish_id: parseInt(items[day.id].dish_id),
            day_of_week: day.id,
            price: parseFloat(items[day.id].price || 0),
          });
        }
      }
    } else {
      if (items[0]?.dish_id) {
        menuItems.push({
          dish_id: parseInt(items[0].dish_id),
          day_of_week: null,
          price: parseFloat(items[0].price || 0),
        });
      }
    }

    try {
      await api.post('/weekly-menu', { week_start: weekStart, mode, note, items: menuItems });
      setShowModal(false);
      setMsg('Wochenkarte erstellt.');
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setMsg('Fehler: ' + e.message); }
  };

  const publish = async (id) => {
    try {
      const r = await api.post(`/weekly-menu/${id}/publish`);
      setMsg(r.message);
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setMsg('Fehler: ' + e.message); }
  };

  return (
    <>
      {msg && <div className={`alert ${msg.startsWith('Fehler') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

      <div className="card">
        <div className="card-header">
          <h3>Wochenkarten</h3>
          <button className="btn btn-primary" onClick={openNew}>+ Neue Wochenkarte</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Woche</th>
              <th>Modus</th>
              <th>Gerichte</th>
              <th>Status</th>
              <th style={{ width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {menus.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <div className="icon">📅</div>
                  <p>Noch keine Wochenkarten angelegt.</p>
                </div>
              </td></tr>
            ) : menus.map(m => (
              <tr key={m.id}>
                <td><strong>KW {getKW(m.week_start)}</strong><br /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ab {formatDate(m.week_start)}</span></td>
                <td><span className="badge badge-muted">{m.mode === 'daily' ? 'Tagesgerichte' : 'Wochengericht'}</span></td>
                <td>{(m.items || []).map(i => i.dish_name).join(', ') || '–'}</td>
                <td>{m.is_published ? <span className="badge badge-success">Veröffentlicht</span> : <span className="badge badge-gold">Entwurf</span>}</td>
                <td>
                  {!m.is_published && <button className="btn btn-sm btn-success" onClick={() => publish(m.id)}>Veröffentlichen</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Neue Wochenkarte</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Woche ab (Montag)</label>
                  <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Modus</label>
                  <select value={mode} onChange={e => setMode(e.target.value)}>
                    <option value="daily">Jeden Tag ein anderes Gericht</option>
                    <option value="weekly">Die ganze Woche ein Gericht</option>
                  </select>
                </div>
              </div>

              {mode === 'daily' ? (
                DAYS.map(day => (
                  <div key={day.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ width: 30, fontWeight: 600, fontSize: '0.8rem', color: 'var(--terra)' }}>{day.short}</span>
                    <select style={{ flex: 2 }} value={items[day.id]?.dish_id || ''} onChange={e => {
                      setDayDish(day.id, 'dish_id', e.target.value);
                      const d = dishes.find(d => d.id === parseInt(e.target.value));
                      if (d?.base_price) setDayDish(day.id, 'price', d.base_price.toString());
                    }}>
                      <option value="">– kein Gericht –</option>
                      {dishes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <input type="number" step="0.10" style={{ width: 80 }} placeholder="€" value={items[day.id]?.price || ''} onChange={e => setDayDish(day.id, 'price', e.target.value)} />
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <select style={{ flex: 2 }} value={items[0]?.dish_id || ''} onChange={e => {
                    setDayDish(0, 'dish_id', e.target.value);
                    const d = dishes.find(d => d.id === parseInt(e.target.value));
                    if (d?.base_price) setDayDish(0, 'price', d.base_price.toString());
                  }}>
                    <option value="">Wochengericht wählen...</option>
                    {dishes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <input type="number" step="0.10" style={{ width: 80 }} placeholder="€" value={items[0]?.price || ''} onChange={e => setDayDish(0, 'price', e.target.value)} />
                </div>
              )}

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Fußnote (optional)</label>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="z.B. Alle Gerichte inkl. Salat" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={handleSave}>Erstellen</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getKW(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const yearStart = new Date(d.getFullYear(), 0, 4);
  return Math.ceil((((d - yearStart) / 86400000) + yearStart.getDay() + 1) / 7);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
