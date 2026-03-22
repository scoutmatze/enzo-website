import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../App';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const pageTitle = {
    '/': 'Dashboard',
    '/dishes': 'Kochbuch',
    '/ingredients': 'Zutaten & Allergene',
    '/menu': 'Speisekarte',
    '/weekly-menu': 'Wochenkarte',
    '/settings': 'Einstellungen',
  }[location.pathname] || 'da Enzo';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>da Enzo</h1>
          <small>Restaurant Backend</small>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section">Übersicht</div>
          <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} end>
            <span className="icon">📊</span> Dashboard
          </NavLink>

          <div className="sidebar-section">Küche</div>
          <NavLink to="/dishes" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="icon">📖</span> Kochbuch
          </NavLink>
          <NavLink to="/ingredients" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="icon">🧂</span> Zutaten
          </NavLink>

          <div className="sidebar-section">Karte</div>
          <NavLink to="/menu" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="icon">📋</span> Speisekarte
          </NavLink>
          <NavLink to="/weekly-menu" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="icon">📅</span> Wochenkarte
          </NavLink>

          {(user?.role === 'inhaber' || user?.role === 'admin') && (
            <>
              <div className="sidebar-section">System</div>
              <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <span className="icon">⚙️</span> Einstellungen
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div>{user?.display_name}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="badge badge-terra" style={{ fontSize: '0.6rem' }}>{user?.role}</span>
            <button onClick={logout}>Abmelden</button>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <div className="topbar">
          <h2>{pageTitle}</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="page">
          {children}
        </div>
      </div>
    </div>
  );
}
