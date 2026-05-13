/**
 * ThemeContext provides light/dark theme toggling with localStorage persistence.
 * The current theme is applied to document.documentElement.dataset.theme.
 *
 * Theme preference has two modes:
 * - 'auto': follows system preference (prefers-color-scheme)
 * - 'manual': uses the last manually selected theme stored in localStorage
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

type Theme = 'light' | 'dark';
type ThemePreference = 'auto' | 'manual';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  resetToAuto: () => void;
  themePreference: ThemePreference;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): Theme {
  const saved = localStorage.getItem('task_board_theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return getSystemTheme();
}

function getInitialPreference(): ThemePreference {
  const saved = localStorage.getItem('task_board_theme');
  return saved ? 'manual' : 'auto';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [themePreference, setThemePreference] = useState<ThemePreference>(getInitialPreference);

  // Apply theme attribute to document
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Listen for system preference changes — only applies when preference is 'auto'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (themePreference === 'auto') {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themePreference]);

  // Persist to localStorage only when preference is manual
  useEffect(() => {
    if (themePreference === 'manual') {
      localStorage.setItem('task_board_theme', theme);
    }
  }, [theme, themePreference]);

  const toggleTheme = useCallback(() => {
    setThemePreference('manual');
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemePreference('manual');
    setThemeState(t);
  }, []);

  const resetToAuto = useCallback(() => {
    localStorage.removeItem('task_board_theme');
    setThemePreference('auto');
    setThemeState(getSystemTheme());
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, resetToAuto, themePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
