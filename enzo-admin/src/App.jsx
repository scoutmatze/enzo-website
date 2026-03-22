import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { api } from './utils/api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Dishes from './pages/Dishes';
import Ingredients from './pages/Ingredients';
import MenuPage from './pages/MenuPage';
import WeeklyMenu from './pages/WeeklyMenu';
import Settings from './pages/Settings';
import Layout from './components/Layout';

// Auth Context
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (api.token) {
      api.getMe()
        .then(setUser)
        .catch(() => api.setToken(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const u = await api.login(email, password);
    setUser(u);
    return u;
  };

  const logout = () => {
    setUser(null);
    api.logout();
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', color:'#635850' }}>Laden...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dishes" element={<Dishes />} />
                  <Route path="/ingredients" element={<Ingredients />} />
                  <Route path="/menu" element={<MenuPage />} />
                  <Route path="/weekly-menu" element={<WeeklyMenu />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
