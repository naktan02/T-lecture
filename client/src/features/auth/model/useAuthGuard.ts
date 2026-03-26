// client/src/features/auth/model/useAuthGuard.ts
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { showWarning, showError } from '../../../shared/utils';
import { clearAuthStorage, getAccessToken, refreshAccessToken } from '../../../shared/auth/session';

type RequiredRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'GUEST' | 'INSTRUCTOR';

interface JwtPayload {
  exp: number;
  sub?: string;
  [key: string]: unknown;
}

interface AuthGuardResult {
  shouldRender: boolean;
}

/**
 * 페이지 접근 권한을 검사하는 Hook입니다.
 */
export const useAuthGuard = (requiredRole: RequiredRole): AuthGuardResult => {
  const navigate = useNavigate();
  const toastShownRef = useRef(false);
  const [shouldRender, setShouldRender] = useState(false);

  // [Helper] 토큰 만료 여부 확인 함수
  const isTokenExpired = (token: string | null): boolean => {
    if (!token) return true;
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;
      // 만료 시간(exp)이 현재 시간보다 이전이면 만료됨
      return decoded.exp < currentTime;
    } catch {
      // 토큰 형식이 잘못되었으면 만료된 것으로 간주
      return true;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const finish = (value: boolean): void => {
      if (!cancelled) {
        setShouldRender(value);
      }
    };

    const runGuard = async () => {
      const token = getAccessToken();

      if (requiredRole === 'GUEST') {
        if (!token) {
          finish(true);
          return;
        }

        if (!isTokenExpired(token)) {
          navigate('/user-main', { replace: true });
          finish(false);
          return;
        }

        try {
          await refreshAccessToken();
          navigate('/user-main', { replace: true });
          finish(false);
        } catch {
          clearAuthStorage();
          finish(true);
        }
        return;
      }

      if (!token) {
        if (!toastShownRef.current) {
          toastShownRef.current = true;
          showWarning('로그인이 필요합니다.');
        }
        navigate('/login', { replace: true });
        finish(false);
        return;
      }

      if (isTokenExpired(token)) {
        try {
          await refreshAccessToken();
        } catch {
          clearAuthStorage();
          if (!toastShownRef.current) {
            toastShownRef.current = true;
            showError('세션이 만료되었습니다. 다시 로그인해주세요.');
          }
          navigate('/login', { replace: true });
          finish(false);
          return;
        }
      }

      const userRole = localStorage.getItem('userRole');
      const isInstructor = localStorage.getItem('isInstructor') === 'true';

      let hasPermission = true;

      if (requiredRole === 'SUPER_ADMIN' && userRole !== 'SUPER_ADMIN') {
        hasPermission = false;
      } else if (requiredRole === 'ADMIN' && !(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')) {
        hasPermission = false;
      } else if (requiredRole === 'INSTRUCTOR' && !isInstructor) {
        hasPermission = false;
      }

      if (!hasPermission) {
        if (!toastShownRef.current) {
          toastShownRef.current = true;
          showWarning('접근 권한이 없습니다.');
        }
        navigate('/user-main', { replace: true });
        finish(false);
        return;
      }

      finish(true);
    };

    setShouldRender(false);
    runGuard();

    return () => {
      cancelled = true;
    };
  }, [navigate, requiredRole]);

  return { shouldRender };
};
