/**
 * Header component — sticky top bar with logo, locale toggle,
 * theme toggle, username, and logout button.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../i18n';
import { useTheme } from '../contexts/ThemeContext';
import styles from './Header.module.css';

export function Header() {
  const intl = useIntl();
  const { user, logout } = useAuth();
  const { locale, toggleLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.logo}>
          <span className={styles.logoText}>{intl.formatMessage({ id: 'app.title' })}</span>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.actionBtn}
            onClick={toggleLocale}
            title={intl.formatMessage({ id: 'header.switch_lang' })}
            type="button"
          >
            {locale === 'zh-CN' ? 'EN' : '中'}
          </button>
          <button
            className={styles.actionBtn}
            onClick={toggleTheme}
            title={intl.formatMessage({ id: theme === 'light' ? 'header.switch_to_dark' : 'header.switch_to_light' })}
            type="button"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {user && (
            <span className={styles.username}>{user.username}</span>
          )}
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            type="button"
          >
            {intl.formatMessage({ id: 'header.logout' })}
          </button>
        </div>
      </div>
    </header>
  );
}
