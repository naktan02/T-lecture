const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const DEFAULT_REFRESH_TIMEOUT_MS = 10000;
const AUTH_STORAGE_MODE_KEY = 'authStorageMode';
const AUTH_STORAGE_KEYS = [
  'accessToken',
  'userRole',
  'currentUser',
  'isInstructor',
  'instructorProfileCompleted',
] as const;

type AuthStorageMode = 'local' | 'session';

interface PersistedAuthState {
  currentUser: unknown;
  userRole: string;
  isInstructor: boolean;
  instructorProfileCompleted: boolean;
  rememberMe: boolean;
}

if (typeof window !== 'undefined') {
  localStorage.removeItem('accessToken');
  sessionStorage.removeItem('accessToken');
}

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

const getStorageByMode = (mode: AuthStorageMode): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return mode === 'local' ? window.localStorage : window.sessionStorage;
};

const getActiveStorageMode = (): AuthStorageMode => {
  if (typeof window === 'undefined') {
    return 'local';
  }

  if (window.sessionStorage.getItem(AUTH_STORAGE_MODE_KEY) === 'session') {
    return 'session';
  }

  if (window.localStorage.getItem(AUTH_STORAGE_MODE_KEY) === 'local') {
    return 'local';
  }

  return 'local';
};

const getActiveStorage = (): Storage | null => getStorageByMode(getActiveStorageMode());

export function getStoredAuthValue(key: (typeof AUTH_STORAGE_KEYS)[number]): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
}

export function getStoredCurrentUser<T = Record<string, unknown>>(): T | null {
  const raw = getStoredAuthValue('currentUser');

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getStoredUserRole(): string | null {
  return getStoredAuthValue('userRole');
}

export function getStoredIsInstructor(): boolean {
  return getStoredAuthValue('isInstructor') === 'true';
}

export function getStoredInstructorProfileCompleted(): boolean {
  return getStoredAuthValue('instructorProfileCompleted') !== 'false';
}

export function persistAuthState({
  currentUser,
  userRole,
  isInstructor,
  instructorProfileCompleted,
  rememberMe,
}: PersistedAuthState): void {
  clearAuthStorage();

  const storage = getStorageByMode(rememberMe ? 'local' : 'session');
  if (!storage) {
    return;
  }

  storage.setItem(AUTH_STORAGE_MODE_KEY, rememberMe ? 'local' : 'session');
  storage.setItem('currentUser', JSON.stringify(currentUser));
  storage.setItem('userRole', userRole);
  storage.setItem('isInstructor', String(isInstructor));
  storage.setItem('instructorProfileCompleted', String(instructorProfileCompleted));
}

export function updateStoredCurrentUser(
  updater: (currentUser: Record<string, unknown> | null) => Record<string, unknown> | null,
): void {
  const storage = getActiveStorage();
  if (!storage) {
    return;
  }

  const nextUser = updater(getStoredCurrentUser<Record<string, unknown>>());

  if (!nextUser) {
    storage.removeItem('currentUser');
    return;
  }

  storage.setItem('currentUser', JSON.stringify(nextUser));
}

export function setStoredInstructorProfileCompleted(value: boolean): void {
  const storage = getActiveStorage();
  if (!storage) {
    return;
  }

  storage.setItem('instructorProfileCompleted', String(value));
  updateStoredCurrentUser((currentUser) =>
    currentUser
      ? {
          ...currentUser,
          instructorProfileCompleted: value,
        }
      : currentUser,
  );
}

export function clearAuthStorage(): void {
  accessToken = null;

  if (typeof window === 'undefined') {
    return;
  }

  for (const key of AUTH_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }

  window.localStorage.removeItem(AUTH_STORAGE_MODE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_MODE_KEY);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('accessToken');
    window.sessionStorage.removeItem('accessToken');
  }
}

export function redirectToLogin(delayMs = 0): void {
  const redirect = () => window.location.replace('/login');

  if (delayMs > 0) {
    window.setTimeout(redirect, delayMs);
    return;
  }

  redirect();
}

export async function refreshAccessToken(timeoutMs = DEFAULT_REFRESH_TIMEOUT_MS): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const data = await response.json();
      const newAccessToken = data?.accessToken;

      if (!newAccessToken) {
        throw new Error('Refresh response missing accessToken');
      }

      setAccessToken(newAccessToken);
      return newAccessToken;
    } finally {
      clearTimeout(timeoutId);
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
