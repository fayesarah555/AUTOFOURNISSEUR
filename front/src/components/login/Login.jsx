import React, { useState } from 'react';
import apiClient from '../../utils/apiClient';
import './login.css';

const Login = ({ onAuthenticated }) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!id || !password) {
      setError('Merci de saisir vos identifiants.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const { data } = await apiClient.post('/auth/login', { id, password });
      onAuthenticated?.(data.user);
    } catch (err) {
      setError("Identifiants incorrects (utilisez les identifiants de demo).");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">Connexion</h1>
        <p className="login-subtitle">Utilisez les identifiants de demo pour accéder au tableau de bord.</p>

        <label className="login-label" htmlFor="login-id">
          Identifiant
        </label>
        <input
          id="login-id"
          type="text"
          className="login-input"
          autoComplete="username"
          value={id}
          onChange={(event) => setId(event.target.value)}
        />

        <label className="login-label" htmlFor="login-password">
          Mot de passe
        </label>
        <input
          id="login-password"
          type="password"
          className="login-input"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button className="login-button" type="submit" disabled={submitting}>
          {submitting ? 'Connexion...' : 'Se connecter'}
        </button>

        {error ? <p className="login-error">{error}</p> : null}
      </form>
    </div>
  );
};

export default Login;
