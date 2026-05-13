/**
 * Internationalization setup using react-intl.
 * Provides locale detection (navigator.language), manual locale switching,
 * and a useLocale hook for consuming translations.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import zhCN from './zh-CN';
import enUS from './en-US';

type Locale = 'zh-CN' | 'en-US';

const LOCALE_STORAGE_KEY = 'task_board_locale';

const messagesMap: Record<Locale, Record<string, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function detectInitialLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === 'zh-CN' || saved === 'en-US') return saved;
  return navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
}

export function IntlProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_STORAGE_KEY, l);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN');
  }, [locale, setLocale]);

  const contextValue = useMemo(() => ({ locale, setLocale, toggleLocale }), [locale, setLocale, toggleLocale]);

  return (
    <LocaleContext.Provider value={contextValue}>
      <ReactIntlProvider locale={locale} messages={messagesMap[locale]}>
        {children}
      </ReactIntlProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within IntlProvider');
  return ctx;
}
