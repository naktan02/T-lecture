const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const WARMUP_TTL_MS = 60 * 1000;
const WARMUP_STORAGE_KEY = 'apiWarmupAt';

let warmupPromise: Promise<void> | null = null;

function getLastWarmupAt(): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  const raw = window.sessionStorage.getItem(WARMUP_STORAGE_KEY);
  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : 0;
}

function setLastWarmupAt(value: number): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(WARMUP_STORAGE_KEY, String(value));
}

function shouldSkipWarmup(): boolean {
  if (!API_BASE_URL || typeof window === 'undefined') {
    return true;
  }

  return Date.now() - getLastWarmupAt() < WARMUP_TTL_MS;
}

export async function warmUpApi(): Promise<void> {
  if (shouldSkipWarmup()) {
    return;
  }

  if (warmupPromise) {
    return warmupPromise;
  }

  warmupPromise = fetch(`${API_BASE_URL}/healthz`, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      'Cache-Control': 'no-store',
    },
  })
    .then(() => {
      setLastWarmupAt(Date.now());
    })
    .catch(() => undefined)
    .finally(() => {
      warmupPromise = null;
    });

  return warmupPromise;
}
