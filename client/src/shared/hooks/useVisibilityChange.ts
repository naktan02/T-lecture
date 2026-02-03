// client/src/shared/hooks/useVisibilityChange.ts
import { useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { showError } from '../utils';

interface JwtPayload {
  exp: number;
  [key: string]: unknown;
}

/**
 * 페이지 가시성 변화 감지 훅
 * 모바일에서 백그라운드 → 포그라운드 전환 시 토큰 유효성 체크
 *
 * TanStack Query v5는 visibilitychange 이벤트만 사용하므로 focus 이벤트는 제외
 * @see https://tanstack.com/query/v5/docs/framework/react/guides/window-focus-refetching
 */
export const useVisibilityChange = () => {
  const isCheckingRef = useRef(false);

  const isTokenExpired = useCallback((token: string | null): boolean => {
    if (!token) return true;
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;
      // 5초 버퍼 추가 (네트워크 지연 대비)
      return decoded.exp < currentTime + 5;
    } catch {
      return true;
    }
  }, []);

  const checkAuthOnVisibilityChange = useCallback(async () => {
    // 중복 체크 방지
    if (isCheckingRef.current) return;

    const token = localStorage.getItem('accessToken');

    // 토큰이 없으면 이미 로그아웃 상태
    if (!token) return;

    // 토큰이 만료되었으면
    if (isTokenExpired(token)) {
      isCheckingRef.current = true;

      try {
        // Refresh 시도
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/auth/refresh`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          },
        );

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('accessToken', data.accessToken);
        } else {
          // Refresh 실패 시 로그아웃 처리
          localStorage.removeItem('accessToken');
          localStorage.removeItem('userRole');
          localStorage.removeItem('currentUser');
          localStorage.removeItem('isInstructor');
          localStorage.removeItem('instructorProfileCompleted');
          showError('세션이 만료되었습니다. 다시 로그인해주세요.');
          window.location.href = '/login';
        }
      } catch {
        // 네트워크 에러 시 로그아웃
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isInstructor');
        localStorage.removeItem('instructorProfileCompleted');
        showError('연결 오류가 발생했습니다. 다시 로그인해주세요.');
        window.location.href = '/login';
      } finally {
        isCheckingRef.current = false;
      }
    }
  }, [isTokenExpired]);

  useEffect(() => {
    // visibilitychange 이벤트 핸들러
    const handleVisibilityChange = () => {
      // 페이지가 다시 보이게 되었을 때 (포그라운드 전환)
      if (document.visibilityState === 'visible') {
        checkAuthOnVisibilityChange();
      }
    };

    // pageshow 이벤트 핸들러 (Safari bfcache 대응)
    const handlePageShow = (event: PageTransitionEvent) => {
      // persisted = bfcache에서 복원된 경우
      if (event.persisted) {
        checkAuthOnVisibilityChange();
      }
    };

    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    // Cleanup: React 권장 패턴에 따라 모든 리스너 제거
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [checkAuthOnVisibilityChange]);
};
