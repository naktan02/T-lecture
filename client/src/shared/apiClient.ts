// client/src/shared/apiClient.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// 토큰 갱신 중복 방지용 변수
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

export interface ApiClientOptions extends RequestInit {
  skipInterceptor?: boolean;
}

export const apiClient = async (url: string, options: ApiClientOptions = {}): Promise<Response> => {
  const token = localStorage.getItem('accessToken');

  // FormData인 경우 Content-Type을 설정하지 않음 (브라우저가 자동 설정)
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...((options.headers as Record<string, string>) || {}),
  };

  // undefined 값을 가진 헤더 제거
  Object.keys(headers).forEach((key) => {
    if (headers[key] === undefined || headers[key] === 'undefined') {
      delete headers[key];
    }
  });

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);

    // 1. 토큰 만료 처리 (401 에러)
    // skipInterceptor 옵션이 true면 갱신 시도 안 함 (로그인 실패 등)
    if (response.status === 401 && !options.skipInterceptor) {
      if (isRefreshing) {
        return new Promise<Response>((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken: string) => {
              headers['Authorization'] = `Bearer ${newToken}`;
              fetch(`${API_BASE_URL}${url}`, { ...config, headers })
                .then(resolve)
                .catch(reject);
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        // 리프레쉬 토큰으로 갱신 요청
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

        // 실패했던 요청 재시도
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        return fetch(`${API_BASE_URL}${url}`, { ...config, headers });
      } catch (err) {
        processQueue(err as Error, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userRole');
        alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // 2. 일반 에러 처리 (서버 메시지 뱉기)
    if (!response.ok) {
      // 서버가 준 JSON 에러 메시지를 뜯어봅니다.
      const errorData = await response.json().catch(() => ({}));
      // errorData.error나 .message가 있으면 그걸 쓰고, 없으면 상태 코드를 씁니다.
      throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`);
    }

    return response;
  } catch (error) {
    return Promise.reject(error);
  }
};
