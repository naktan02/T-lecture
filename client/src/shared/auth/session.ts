const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const DEFAULT_REFRESH_TIMEOUT_MS = 10000;

let refreshPromise: Promise<string> | null = null;

export function clearAuthStorage(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('isInstructor');
  localStorage.removeItem('instructorProfileCompleted');
}

export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function setAccessToken(token: string): void {
  localStorage.setItem('accessToken', token);
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
