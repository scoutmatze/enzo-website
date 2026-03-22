import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings').then(s => { setSettings(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const handleSave = async () => {
    try {
      await api.put('/settings', settings);
      setMsg('Einstellungen gespeichert.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setMsg('Fehler: ' + e.message); }
  };

  if (loading) return <p>Laden...</p>;

  return (
    <>
      {msg && <div className={`alert ${msg.startsWith('Fehler') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

      <div className="card">
        <div className="card-header">
          <h3>Restaurant-Einstellungen</h3>
          <button className="btn btn-primary" onClick={handleSave}>Speichern</button>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Restaurant-Name</label>
            <input value={settings.restaurant_name || ''} onChange={e => update('restaurant_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Adresse</label>
            <input value={settings.address || ''} onChange={e => update('address', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Telefon</label>
            <input value={settings.phone || ''} onChange={e => update('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label>E-Mail</label>
            <input value={settings.email || ''} onChange={e => update('email', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label>Booking E-Mail</label>
          <input value={settings.booking_email || ''} onChange={e => update('booking_email', e.target.value)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Sitzplätze gesamt</label>
            <input type="number" value={settings.total_seats || ''} onChange={e => update('total_seats', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Max. Personenzahl pro Reservierung</label>
            <input type="number" value={settings.max_party_size || ''} onChange={e => update('max_party_size', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Speisekarten-Texte</h3></div>
        <div className="form-group">
          <label>Einleitungstext (auf der Website)</label>
          <textarea value={settings.menu_intro || ''} onChange={e => update('menu_intro', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Allergen-Hinweis</label>
          <textarea value={settings.allergen_note || ''} onChange={e => update('allergen_note', e.target.value)} style={{ minHeight: 100 }} />
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Website aktualisieren</h3></div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Wenn du Einstellungen, Speisekarte oder Wochenkarte geändert hast, klicke hier um die JSON-Dateien auf der Website zu aktualisieren.
        </p>
        <div className="btn-group">
          <button className="btn btn-success" onClick={async () => {
            try {
              const r = await api.post('/export/all');
              setMsg(r.message);
              setTimeout(() => setMsg(''), 3000);
            } catch (e) { setMsg('Fehler: ' + e.message); }
          }}>🔄 Speisekarte + Wochenkarte exportieren</button>
        </div>
      </div>
    </>
  );
}
