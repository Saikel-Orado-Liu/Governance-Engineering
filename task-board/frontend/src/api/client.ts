/**
 * Centralized fetch wrapper with automatic JWT Bearer injection,
 * 401-triggered token refresh with request replay, and refresh concurrency lock.
 */

let accessToken: string | null = null;
let refreshCallback: (() => Promise<string | null>) | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setRefreshCallback(cb: () => Promise<string | null>): void {
  refreshCallback = cb;
}

async function performRefresh(): Promise<string | null> {
  if (!refreshCallback) return null;
  if (refreshPromise) return refreshPromise;
  refreshPromise = refreshCallback().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function _fetchWithAuth<T>(
  url: string,
  options: RequestInit = {},
  returnHeaders?: boolean,
): Promise<T | { data: T; headers: Headers }> {
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let res = await fetch(url, { ...options, headers });

  // On 401, attempt token refresh once and replay the request
  if (res.status === 401 && accessToken) {
    const newToken = await performRefresh();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(url, { ...options, headers });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? res.statusText);
  }

  if (returnHeaders) {
    if (res.status === 204) return { data: undefined as T, headers: res.headers };
    const data = (await res.json()) as T;
    return { data, headers: res.headers };
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const client = {
  get: <T>(url: string): Promise<T> =>
    _fetchWithAuth<T>(url) as Promise<T>,
  post: <T>(url: string, body?: unknown): Promise<T> =>
    _fetchWithAuth<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }) as Promise<T>,
  patch: <T>(url: string, body?: unknown): Promise<T> =>
    _fetchWithAuth<T>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }) as Promise<T>,
  delete: <T>(url: string): Promise<T> =>
    _fetchWithAuth<T>(url, {
      method: 'DELETE',
    }) as Promise<T>,
  paginatedGet: <T>(url: string): Promise<{ data: T; total: number }> =>
    (_fetchWithAuth<T>(url, {}, true) as Promise<{ data: T; headers: Headers }>).then(
      ({ data, headers }) => ({
        data,
        total: parseInt(headers.get('X-Total-Count') ?? '0', 10),
      }),
    ),
};
