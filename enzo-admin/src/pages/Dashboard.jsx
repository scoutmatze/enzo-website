import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../App';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ dishes: 0, categories: 0, ingredients: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dishes?active=true').catch(() => []),
      api.get('/menu').catch(() => []),
      api.get('/ingredients').catch(() => []),
    ]).then(([dishes, menu, ingredients]) => {
      setStats({
        dishes: Array.isArray(dishes) ? dishes.length : 0,
        categories: Array.isArray(menu) ? menu.length : 0,
        ingredients: Array.isArray(ingredients) ? ingredients.length : 0,
      });
    }).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>
          Ciao {user?.display_name}! 👋
        </h3>
      </div>

      <div className="stats-grid">
        <Link to="/dishes" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-icon">📖</div>
            <div className="stat-value">{loading ? '...' : stats.dishes}</div>
            <div className="stat-label">Gerichte im Kochbuch</div>
          </div>
        </Link>
        <Link to="/menu" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-value">{loading ? '...' : stats.categories}</div>
            <div className="stat-label">Kategorien auf der Karte</div>
          </div>
        </Link>
        <Link to="/ingredients" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-icon">🧂</div>
            <div className="stat-value">{loading ? '...' : stats.ingredients}</div>
            <div className="stat-label">Zutaten erfasst</div>
          </div>
        </Link>
        <a href="https://www.da-enzo-muenchen.de" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-icon">🌐</div>
            <div className="stat-value" style={{ fontSize: '1rem' }}>Website</div>
            <div className="stat-label">da-enzo-muenchen.de öffnen</div>
          </div>
        </a>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Schnellaktionen</h3>
        </div>
        <div className="btn-group" style={{ flexWrap: 'wrap' }}>
          <Link to="/dishes" className="btn btn-primary">📖 Neues Gericht anlegen</Link>
          <Link to="/weekly-menu" className="btn btn-secondary">📅 Wochenkarte bearbeiten</Link>
          <button className="btn btn-success" onClick={async () => {
            try {
              const r = await api.post('/export/all');
              alert(r.message);
            } catch (e) { alert('Fehler: ' + e.message); }
          }}>🔄 Website aktualisieren</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Phase 1 – Status</h3>
        </div>
        <table>
          <tbody>
            <tr><td>✅</td><td>Kochbuch (Gerichte-Datenbank)</td><td className="badge badge-success">Bereit</td></tr>
            <tr><td>✅</td><td>Zutaten & automatische Allergene</td><td className="badge badge-success">Bereit</td></tr>
            <tr><td>✅</td><td>Speisekarte zusammenstellen</td><td className="badge badge-success">Bereit</td></tr>
            <tr><td>✅</td><td>Wochenkarte (täglich/wöchentlich)</td><td className="badge badge-success">Bereit</td></tr>
            <tr><td>✅</td><td>JSON-Export auf Website</td><td className="badge badge-success">Bereit</td></tr>
            <tr><td>⏳</td><td>Reservierungssystem</td><td className="badge badge-gold">Phase 2</td></tr>
            <tr><td>⏳</td><td>Kundendatenbank</td><td className="badge badge-gold">Phase 2</td></tr>
            <tr><td>⏳</td><td>Rechnungen</td><td className="badge badge-muted">Phase 3</td></tr>
            <tr><td>⏳</td><td>Schichtplanung</td><td className="badge badge-muted">Phase 4</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
