import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) { navigate('/', { replace: true }); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>da Enzo</h1>
        <p>Restaurant Backend – bitte einloggen.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">E-Mail</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="deine@email.de" required autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="password">Passwort</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? 'Wird geprüft...' : 'Einloggen'}
          </button>
        </form>
      </div>
    </div>
  );
}
