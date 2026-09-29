/**
 * Server-backed admin session.
 * A staff member is signed in only when the backend has issued a token;
 * every admin API call authenticates with that token alone.
 */

export const ADMIN_TOKEN_KEY = 'admin_token';
export const ADMIN_USER_KEY = 'admin_user';

export interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export function getAdminAuthHeaders(storage: SessionStorageLike): Record<string, string> {
  const token = storage.getItem(ADMIN_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clearServerSession(storage: SessionStorageLike): void {
  storage.removeItem(ADMIN_TOKEN_KEY);
  storage.removeItem(ADMIN_USER_KEY);
}

export async function loginWithServer<U>(
  fetchFn: FetchLike,
  storage: SessionStorageLike,
  email: string,
  password: string,
): Promise<{ user: U | null; error: string }> {
  let res: Response;
  try {
    res = await fetchFn('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { user: null, error: 'Unable to reach the server. Check your connection and try again.' };
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {}

  if (res.ok && data?.success && data.user && data.token) {
    storage.setItem(ADMIN_TOKEN_KEY, data.token);
    storage.setItem(ADMIN_USER_KEY, JSON.stringify(data.user));
    return { user: data.user as U, error: '' };
  }

  clearServerSession(storage);
  return { user: null, error: data?.error || 'Invalid email or password.' };
}

export async function restoreServerSession<U>(
  fetchFn: FetchLike,
  storage: SessionStorageLike,
): Promise<U | null> {
  const headers = getAdminAuthHeaders(storage);
  if (!headers.Authorization) return null;

  let res: Response;
  try {
    res = await fetchFn('/api/auth/me', { headers });
  } catch {
    // Server unreachable: keep the token so the session survives a brief outage.
    return null;
  }

  const data: any = await res.json().catch(() => null);
  if (res.ok && data?.success && data.user) {
    storage.setItem(ADMIN_USER_KEY, JSON.stringify(data.user));
    return data.user as U;
  }

  clearServerSession(storage);
  return null;
}
