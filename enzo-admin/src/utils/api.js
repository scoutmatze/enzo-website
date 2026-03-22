const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('enzo_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('enzo_token', token);
    else localStorage.removeItem('enzo_token');
  }

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json().catch(() => null);

    if (res.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Sitzung abgelaufen');
    }

    if (!res.ok) throw new Error(data?.error || `Fehler ${res.status}`);
    return data;
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  delete(path) { return this.request('DELETE', path); }

  // Auth
  async login(email, password) {
    const data = await this.post('/auth/login', { email, password });
    this.setToken(data.token);
    return data.user;
  }

  logout() {
    this.setToken(null);
    window.location.href = '/login';
  }

  getMe() { return this.get('/auth/me').then(d => d.user); }
}

export const api = new ApiClient();
