// client/src/features/auth/model/useAuthGuard.ts
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { showWarning, showError } from '../../../shared/utils';

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
    // StrictMode에서 중복 실행 방지
    if (toastShownRef.current) return;

    const token = localStorage.getItem('accessToken');
    const userRole = localStorage.getItem('userRole');
    const isInstructor = localStorage.getItem('isInstructor') === 'true';

    // ----------------------------------------------------
    // 1. GUEST Guard (로그인한 사람은 login/signup 진입 불가)
    // ----------------------------------------------------
    if (requiredRole === 'GUEST') {
      if (token) {
        navigate('/user-main', { replace: true });
      }
      return;
    }

    // ----------------------------------------------------
    // 2. Protected Guard (로그인 필수) & 토큰 만료 체크
    // ----------------------------------------------------

    // 2-1. 토큰 자체가 없는 경우
    if (!token) {
      toastShownRef.current = true;
      showWarning('로그인이 필요합니다.');
      navigate('/login', { replace: true });
      return;
    }

    // 2-2. 토큰은 있지만 시간이 만료된 경우
    if (isTokenExpired(token)) {
      // 만료된 정보들 싹 지우기
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('isInstructor');

      toastShownRef.current = true;
      showError('세션이 만료되었습니다. 다시 로그인해주세요.');
      navigate('/login', { replace: true });
      return;
    }

    // ----------------------------------------------------
    // 3. Role Guard (권한 검사)
    // ----------------------------------------------------
    let hasPermission = true;

    if (requiredRole === 'SUPER_ADMIN' && userRole !== 'SUPER_ADMIN') {
      hasPermission = false;
    } else if (requiredRole === 'ADMIN' && !(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')) {
      hasPermission = false;
    } else if (requiredRole === 'INSTRUCTOR' && !isInstructor) {
      hasPermission = false;
    }

    if (!hasPermission) {
      toastShownRef.current = true;
      showWarning('접근 권한이 없습니다.');
      navigate('/user-main', { replace: true });
      return;
    }

    // ----------------------------------------------------
    // 4. Instructor Profile Completion Check
    // (INSTRUCTOR 가드 뿐 아니라, 강사인 경우 USER 가드에서도 체크)
    // ----------------------------------------------------
    if (isInstructor && (requiredRole === 'INSTRUCTOR' || requiredRole === 'USER')) {
      const profileCompleted = localStorage.getItem('instructorProfileCompleted') === 'true';
      // 프로필 페이지 자체에서는 리다이렉트하지 않음 (무한 루프 방지)
      const isProfilePage = window.location.pathname.includes('/profile');
      if (!profileCompleted && !isProfilePage) {
        toastShownRef.current = true;
        showWarning('강사 프로필을 먼저 완성해주세요.');
        navigate('/user-main/profile', { replace: true });
        return;
      }
    }
  }, [navigate, requiredRole]);

  // ----------------------------------------------------
  // UX 개선: 렌더링 차단 (shouldRender)
  // ----------------------------------------------------
  const token = localStorage.getItem('accessToken');
  const userRole = localStorage.getItem('userRole');
  const isInstructor = localStorage.getItem('isInstructor') === 'true';
  let shouldRender = true;

  // 토큰 만료 여부를 렌더링 시점에도 확인 (화면 깜빡임 방지)
  const tokenExpired = isTokenExpired(token);

  if (requiredRole === 'GUEST' && token) {
    shouldRender = false; // 로그인 상태인데 GUEST 페이지면 숨김
  } else if (requiredRole !== 'GUEST') {
    // 로그인이 필요한 페이지인데, 토큰이 없거나 만료되었으면 숨김
    if (!token || tokenExpired) {
      shouldRender = false;
    }
  }

  // 권한 부족 체크
  if (requiredRole === 'SUPER_ADMIN' && userRole !== 'SUPER_ADMIN') {
    shouldRender = false;
  } else if (requiredRole === 'ADMIN' && !(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')) {
    shouldRender = false;
  } else if (requiredRole === 'INSTRUCTOR' && !isInstructor) {
    shouldRender = false;
  }

  return { shouldRender };
};
