/**
 * AuthContext provides authentication state (user, tokens, loading, error)
 * and actions (login, register, logout, refresh) to the entire application.
 * Tokens are persisted in localStorage for session recovery.
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import * as authApi from '../api/auth';
import { setAccessToken, setRefreshCallback } from '../api/client';

// ── Types ─────────────────────────────────────────────────────────────────

interface User {
  id: number;
  username: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; accessToken: string; refreshToken: string } }
  | { type: 'REGISTER_SUCCESS'; payload: { user: User; accessToken: string; refreshToken: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESHED'; payload: { accessToken: string; refreshToken: string } }
  | { type: 'INIT_COMPLETE' };

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'task_board_access_token',
  REFRESH_TOKEN: 'task_board_refresh_token',
  USER: 'task_board_user',
} as const;

function decodeTokenPayload(token: string): { sub: string } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function persistTokens(accessToken: string, refreshToken: string, user: User): void {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

function clearPersistedTokens(): void {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

function handleAuthSuccess(
  dispatch: React.Dispatch<AuthAction>,
  actionType: 'LOGIN_SUCCESS' | 'REGISTER_SUCCESS',
  result: { access_token: string; refresh_token: string },
  username: string,
): void {
  const user: User = { id: 0, username };
  persistTokens(result.access_token, result.refresh_token, user);
  dispatch({
    type: actionType,
    payload: { user, accessToken: result.access_token, refreshToken: result.refresh_token },
  });
}

function loadPersistedState(): Partial<AuthState> {
  try {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const userJson = localStorage.getItem(STORAGE_KEYS.USER);
    const user: User | null = userJson ? JSON.parse(userJson) : null;

    if (accessToken && refreshToken && user) {
      return { user, accessToken, refreshToken, loading: true };
    }
  } catch {
    clearPersistedTokens();
  }
  return { user: null, accessToken: null, refreshToken: null, loading: false };
}

// ── Reducer ───────────────────────────────────────────────────────────────

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        loading: false,
        error: null,
      };
    case 'REGISTER_SUCCESS':
      return {
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        loading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'LOGOUT':
      return { user: null, accessToken: null, refreshToken: null, loading: false, error: null };
    case 'TOKEN_REFRESHED':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
      };
    case 'INIT_COMPLETE':
      return { ...state, loading: false };
    default:
      return state;
  }
}

// ── useAuthService hook (actions) ───────────────────────────────────────
// Extracted so AuthProvider composes state + service + context dispatch.

function useAuthService(dispatch: React.Dispatch<AuthAction>) {
  const login = useCallback(async (username: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const result = await authApi.login(username, password);
      handleAuthSuccess(dispatch, 'LOGIN_SUCCESS', result, username);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw err;
    }
  }, [dispatch]);

  const register = useCallback(async (username: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      await authApi.register(username, password);
      // Auto-login after registration
      const result = await authApi.login(username, password);
      handleAuthSuccess(dispatch, 'REGISTER_SUCCESS', result, username);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw err;
    }
  }, [dispatch]);

  const logout = useCallback(() => {
    clearPersistedTokens();
    setAccessToken(null);
    dispatch({ type: 'LOGOUT' });
  }, [dispatch]);

  return { login, register, logout };
}

// ── Context ───────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const persisted = loadPersistedState();
  const [state, dispatch] = useReducer(authReducer, {
    user: persisted.user ?? null,
    accessToken: persisted.accessToken ?? null,
    refreshToken: persisted.refreshToken ?? null,
    loading: persisted.loading ?? false,
    error: null,
  });

  // Sync tokens to client module so api/client.ts uses them
  useEffect(() => {
    setAccessToken(state.accessToken);
  }, [state.accessToken]);

  // Setup refresh callback so client can auto-refresh on 401
  useEffect(() => {
    setRefreshCallback(async () => {
      const storedRefreshToken =
        state.refreshToken ?? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!storedRefreshToken) return null;

      try {
        const result = await authApi.refreshToken(storedRefreshToken);
        const payload = decodeTokenPayload(result.access_token);
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        const existingUser: User | null = storedUser ? JSON.parse(storedUser) : null;
        const user: User = { id: existingUser?.id ?? 0, username: payload?.sub ?? 'unknown' };
        persistTokens(result.access_token, result.refresh_token, user);
        dispatch({
          type: 'TOKEN_REFRESHED',
          payload: { accessToken: result.access_token, refreshToken: result.refresh_token },
        });
        return result.access_token;
      } catch {
        dispatch({ type: 'LOGOUT' });
        clearPersistedTokens();
        return null;
      }
    });
  }, [state.refreshToken]);

  // Initial validation: verify persisted tokens are valid
  useEffect(() => {
    if (state.accessToken && state.loading) {
      // Try a lightweight check — just validate the token is registered with client
      // If refresh is needed, the first 401 will trigger it
      dispatch({ type: 'INIT_COMPLETE' });
    }
  }, [state.accessToken, state.loading]);

  const { login, register, logout } = useAuthService(dispatch);

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, logout, isAuthenticated: !!state.accessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
