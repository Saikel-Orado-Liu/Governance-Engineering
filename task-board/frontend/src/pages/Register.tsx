/**
 * Register page — displays a registration form and creates a new account.
 * Redirects to / on success.
 */

import { useState, useCallback, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useIntl, FormattedMessage } from 'react-intl';
import authStyles from '../styles/Auth.module.css';

export function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const intl = useIntl();

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!username.trim() || !password) return;
      if (password !== confirmPassword) {
        setError(intl.formatMessage({ id: 'auth.passwords_mismatch' }));
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        await register(username.trim(), password);
        navigate('/', { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Registration failed');
        setSubmitting(false);
      }
    },
    [username, password, confirmPassword, register, navigate],
  );

  return (
    <div className={authStyles.authPage}>
      <div className={authStyles.authContainer}>
        <h1 className={authStyles.title}><FormattedMessage id="auth.register_title" defaultMessage="Create Account" /></h1>
        <form onSubmit={handleSubmit}>
          <div className={authStyles.field}>
            <label htmlFor="reg-username" className={authStyles.label}>
              <FormattedMessage id="auth.username" defaultMessage="Username" />
            </label>
            <input
              id="reg-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              className={authStyles.input}
              autoFocus
            />
          </div>
          <div className={authStyles.field}>
            <label htmlFor="reg-password" className={authStyles.label}>
              <FormattedMessage id="auth.password" defaultMessage="Password" />
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className={authStyles.input}
            />
          </div>
          <div className={authStyles.field}>
            <label htmlFor="reg-confirm" className={authStyles.label}>
              {intl.formatMessage({ id: 'auth.confirm_password' })}
            </label>
            <input
              id="reg-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
              className={authStyles.input}
            />
          </div>
          {error && <p className={authStyles.error}>{error}</p>}
          <button
            type="submit"
            disabled={submitting || !username.trim() || !password || !confirmPassword}
            className={authStyles.submitBtn}
          >
            {submitting ? '...' : <FormattedMessage id="auth.register_btn" defaultMessage="Sign Up" />}
          </button>
        </form>
        <div className={authStyles.footer}>
          <Link to="/login" className={authStyles.link}>
            <FormattedMessage id="auth.has_account" defaultMessage="Already have an account? Login" />
          </Link>
        </div>
      </div>
    </div>
  );
}
