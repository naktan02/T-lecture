// client/src/shared/apiClient.ts
import { showError } from './utils';
import {
  clearAuthStorage,
  getAccessToken,
  redirectToLogin,
  refreshAccessToken,
} from './auth/session';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const REQUEST_ID_HEADER = 'X-Request-Id';

export interface ApiClientOptions extends RequestInit {
  skipInterceptor?: boolean;
}

const createRequestId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `web_${crypto.randomUUID()}`;
  }

  return `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const appendRequestId = (message: string, requestId: string | null): string => {
  if (!requestId) return message;
  return `${message} (오류 ID: ${requestId})`;
};

const readErrorMessage = async (response: Response): Promise<string> => {
  const responseRequestId = response.headers.get(REQUEST_ID_HEADER);

  // 429 rate limit 초과 시 남은 시간 안내
  if (response.status === 429) {
    const resetHeader = response.headers.get('RateLimit-Reset');
    if (resetHeader) {
      const resetTime = Number(resetHeader) * 1000; // 초 → 밀리초
      const remainMs = resetTime - Date.now();
      if (remainMs > 0) {
        const remainMin = Math.ceil(remainMs / 60000);
        return appendRequestId(
          `요청이 너무 많습니다. ${remainMin}분 후 다시 시도해주세요.`,
          responseRequestId,
        );
      }
    }
    return appendRequestId('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', responseRequestId);
  }

  const ct = response.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const errorData = await response.json().catch(() => ({}) as any);
    const requestId = responseRequestId || errorData.requestId || null;
    const message = errorData.error || errorData.message || `Request failed: ${response.status}`;
    return appendRequestId(message, requestId);
  }
  const text = await response.text().catch(() => '');
  return appendRequestId(text || `Request failed: ${response.status}`, responseRequestId);
};

export const apiClient = async (url: string, options: ApiClientOptions = {}): Promise<Response> => {
  const token = getAccessToken();
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...((options.headers as Record<string, string>) || {}),
  };

  Object.keys(headers).forEach((key) => {
    if (headers[key] === undefined || headers[key] === 'undefined') delete headers[key];
  });

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!headers[REQUEST_ID_HEADER]) headers[REQUEST_ID_HEADER] = createRequestId();

  const config: RequestInit = {
    credentials: 'include', // ✅ 일반 요청도 쿠키 포함
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);

    if (response.status === 401 && !options.skipInterceptor) {
      let newAccessToken: string;

      try {
        newAccessToken = await refreshAccessToken();
      } catch (err) {
        clearAuthStorage();
        showError('세션이 만료되었습니다. 다시 로그인해주세요.');
        redirectToLogin(100);
        return Promise.reject(err);
      }

      headers['Authorization'] = `Bearer ${newAccessToken}`;
      const retryRes = await fetch(`${API_BASE_URL}${url}`, { ...config, headers });

      if (retryRes.status === 401) {
        clearAuthStorage();
        showError('세션이 만료되었습니다. 다시 로그인해주세요.');
        redirectToLogin(100);
        return Promise.reject(new Error('세션이 만료되었습니다. 다시 로그인해주세요.'));
      }

      if (!retryRes.ok) {
        const msg = await readErrorMessage(retryRes);
        throw new Error(msg);
      }

      return retryRes;
    }

    if (!response.ok) {
      const msg = await readErrorMessage(response);
      throw new Error(msg);
    }

    return response;
  } catch (error) {
    return Promise.reject(error);
  }
};

// (선택) JSON helper
export const apiClientJson = async <T>(url: string, options: ApiClientOptions = {}): Promise<T> => {
  const res = await apiClient(url, options);
  return (await res.json()) as T;
};
