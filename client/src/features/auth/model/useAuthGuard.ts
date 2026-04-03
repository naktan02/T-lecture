import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import {
  clearAuthStorage,
  getAccessToken,
  getStoredInstructorProfileCompleted,
  getStoredIsInstructor,
  getStoredUserRole,
  redirectToLogin,
  refreshAccessToken,
} from '../../../shared/auth/session';
import { showError, showWarning } from '../../../shared/utils';

type RequiredRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'GUEST' | 'INSTRUCTOR';

interface JwtPayload {
  exp: number;
  sub?: string;
  [key: string]: unknown;
}

interface AuthGuardResult {
  shouldRender: boolean;
}

export const useAuthGuard = (requiredRole: RequiredRole): AuthGuardResult => {
  const navigate = useNavigate();
  const toastShownRef = useRef(false);
  const [shouldRender, setShouldRender] = useState(false);

  const getAuthorizedPath = (): string => {
    const userRole = getStoredUserRole();
    const isInstructor = getStoredIsInstructor();
    const isProfileCompleted = getStoredInstructorProfileCompleted();

    if (userRole === 'SUPER_ADMIN') return '/admin/super';
    if (userRole === 'ADMIN') return '/admin/assignments';
    if (isInstructor && !isProfileCompleted) return '/user-main/profile';
    return '/user-main';
  };

  const isTokenExpired = (token: string | null): boolean => {
    if (!token) return true;

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch {
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
      const ensureValidToken = async (): Promise<boolean> => {
        const token = getAccessToken();

        if (token && !isTokenExpired(token)) {
          return true;
        }

        try {
          await refreshAccessToken();
          return true;
        } catch {
          clearAuthStorage();
          return false;
        }
      };

      if (requiredRole === 'GUEST') {
        if (await ensureValidToken()) {
          navigate(getAuthorizedPath(), { replace: true });
          finish(false);
        } else {
          finish(true);
        }

        return;
      }

      if (!(await ensureValidToken())) {
        if (!toastShownRef.current) {
          toastShownRef.current = true;
          showError('세션이 만료되었습니다. 다시 로그인해 주세요.');
        }

        redirectToLogin(100);
        finish(false);
        return;
      }

      const userRole = getStoredUserRole();
      const isInstructor = getStoredIsInstructor();

      let hasPermission = true;

      if (requiredRole === 'SUPER_ADMIN' && userRole !== 'SUPER_ADMIN') {
        hasPermission = false;
      } else if (
        requiredRole === 'ADMIN' &&
        !(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')
      ) {
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
