// client/src/shared/apiClient.ts
import { showError } from './utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

export interface ApiClientOptions extends RequestInit {
  skipInterceptor?: boolean;
}

const readErrorMessage = async (response: Response): Promise<string> => {
  const ct = response.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const errorData = await response.json().catch(() => ({}) as any);
    return errorData.error || errorData.message || `Request failed: ${response.status}`;
  }
  const text = await response.text().catch(() => '');
  return text || `Request failed: ${response.status}`;
};

export const apiClient = async (url: string, options: ApiClientOptions = {}): Promise<Response> => {
  const token = localStorage.getItem('accessToken');
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...((options.headers as Record<string, string>) || {}),
  };

  Object.keys(headers).forEach((key) => {
    if (headers[key] === undefined || headers[key] === 'undefined') delete headers[key];
  });

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config: RequestInit = {
    credentials: 'include', // ✅ 일반 요청도 쿠키 포함
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);

    if (response.status === 401 && !options.skipInterceptor) {
      if (isRefreshing) {
        // 이미 refresh 진행 중이면 타임아웃과 함께 큐에 추가
        return new Promise<Response>((resolve, reject) => {
          // 10초 타임아웃 - 무한 대기 방지
          const timeoutId = setTimeout(() => {
            reject(new Error('Token refresh timeout'));
          }, 10000);

          failedQueue.push({
            resolve: (newToken: string) => {
              clearTimeout(timeoutId);
              headers['Authorization'] = `Bearer ${newToken}`;
              fetch(`${API_BASE_URL}${url}`, { ...config, headers })
                .then(resolve)
                .catch(reject);
            },
            reject: (error: Error) => {
              clearTimeout(timeoutId);
              reject(error);
            },
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!refreshRes.ok) throw new Error('Refresh token expired');

        const data = await refreshRes.json();
        const newAccessToken = data.accessToken;

        localStorage.setItem('accessToken', newAccessToken);
        processQueue(null, newAccessToken);

        headers['Authorization'] = `Bearer ${newAccessToken}`;
        const retryRes = await fetch(`${API_BASE_URL}${url}`, { ...config, headers });

        if (!retryRes.ok) {
          const msg = await readErrorMessage(retryRes);
          throw new Error(msg);
        }
        return retryRes;
      } catch (err) {
        processQueue(err as Error, null);
        // 로컬스토리지 전체 정리
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('isInstructor');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('instructorProfileCompleted');
        showError('세션이 만료되었습니다. 다시 로그인해주세요.');
        // 약간의 지연 후 리다이렉트 (에러 메시지 표시 시간 확보)
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
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
