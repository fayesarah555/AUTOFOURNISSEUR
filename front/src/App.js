import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Login from './components/login/Login';
import Dashboard from './components/dashboard/Dashboard';
import AdminProviders from './components/admin/AdminProviders';
import apiClient from './utils/apiClient';

const App = () => {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await apiClient.get('/auth/session');
        if (data?.user) {
          setUser(data.user);
          setStatus('authenticated');
        } else {
          setStatus('anonymous');
        }
      } catch (error) {
        setStatus('anonymous');
      }
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (userInfo) => {
    setUser(userInfo);
    setStatus('authenticated');
    navigate('/admin', { replace: true });
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Ignore errors on logout; session will be cleared locally.
    } finally {
      setUser(null);
      setStatus('anonymous');
      navigate('/', { replace: true });
    }
  };

  const handleLoginRequest = () => {
    navigate('/login', { state: { from: location.pathname } });
  };

  const isAdmin = status === 'authenticated' && Array.isArray(user?.roles) && user.roles.includes('admin');

  useEffect(() => {
    if (status === 'authenticated' && isAdmin && !location.pathname.startsWith('/admin')) {
      navigate('/admin', { replace: true });
    }
  }, [status, isAdmin, location.pathname, navigate]);

  if (status === 'loading') {
    return (
      <div className="layout">
        <main style={{ margin: 'auto', textAlign: 'center' }}>
          <p>Chargement de la session...</p>
        </main>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          status === 'authenticated' ? (
            <Navigate to="/admin" replace />
          ) : (
            <Login onAuthenticated={handleLoginSuccess} />
          )
        }
      />
      <Route
        path="/"
        element={
          <Dashboard
            user={status === 'authenticated' ? user : null}
            onLogout={status === 'authenticated' ? handleLogout : undefined}
            onLoginRequest={status === 'authenticated' ? undefined : handleLoginRequest}
            isAdmin={isAdmin}
          />
        }
      />
      <Route
        path="/admin"
        element={
          isAdmin ? <AdminProviders /> : <Navigate to={status === 'authenticated' ? '/' : '/login'} replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
