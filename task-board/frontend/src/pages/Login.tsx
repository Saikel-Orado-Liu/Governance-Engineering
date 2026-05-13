/**
 * Login page — displays a username/password form and authenticates via AuthContext.
 * Redirects to / on success.
 */

import { useState, useCallback, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FormattedMessage } from 'react-intl';
import authStyles from '../styles/Auth.module.css';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!username.trim() || !password) return;
      setSubmitting(true);
      setError(null);
      try {
        await login(username.trim(), password);
        navigate('/', { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed');
        setSubmitting(false);
      }
    },
    [username, password, login, navigate],
  );

  return (
    <div className={authStyles.authPage}>
      <div className={authStyles.authContainer}>
        <h1 className={authStyles.title}><FormattedMessage id="auth.login_title" defaultMessage="Login to Task Board" /></h1>
        <form onSubmit={handleSubmit}>
          <div className={authStyles.field}>
            <label htmlFor="login-username" className={authStyles.label}>
              <FormattedMessage id="auth.username" defaultMessage="Username" />
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              className={authStyles.input}
              autoFocus
            />
          </div>
          <div className={authStyles.field}>
            <label htmlFor="login-password" className={authStyles.label}>
              <FormattedMessage id="auth.password" defaultMessage="Password" />
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className={authStyles.input}
            />
          </div>
          {error && <p className={authStyles.error}>{error}</p>}
          <button
            type="submit"
            disabled={submitting || !username.trim() || !password}
            className={authStyles.submitBtn}
          >
            {submitting ? '...' : <FormattedMessage id="auth.login_btn" defaultMessage="Sign In" />}
          </button>
        </form>
        <div className={authStyles.footer}>
          <Link to="/register" className={authStyles.link}>
            <FormattedMessage id="auth.no_account" defaultMessage="Don't have an account? Register" />
          </Link>
        </div>
      </div>
    </div>
  );
}
