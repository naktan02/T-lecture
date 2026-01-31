// client/src/features/auth/model/useAuth.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import { login as loginApi, logout as logoutApi, LoginPayload, LoginResponse } from '../authApi';
import { USER_ROLES, ADMIN_LEVELS } from '../../../shared/constants';
import { logger } from '../../../shared/utils';

interface User {
  id: number;
  name: string;
  email: string;
  isAdmin?: boolean;
  adminLevel?: string;
  isInstructor?: boolean;
  instructorProfileCompleted?: boolean | null;
}

type UserRoleType = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export const useAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 현재 저장된 role 및 강사 여부 가져오기
  const userRole = localStorage.getItem('userRole') as UserRoleType | null;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isInstructor = localStorage.getItem('isInstructor') === 'true';

  const loginMutation = useMutation({
    mutationFn: loginApi,
    onSuccess: (data: LoginResponse, variables: LoginPayload) => {
      const user = data.user as User;
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('currentUser', JSON.stringify(user));

      const role = determineUserRole(user);
      localStorage.setItem('userRole', role);
      localStorage.setItem('isInstructor', String(!!user.isInstructor));
      // 강사 프로필 완성 여부 저장 (null이면 true로 간주 - 강사가 아닌 경우)
      localStorage.setItem(
        'instructorProfileCompleted',
        String(user.instructorProfileCompleted ?? true),
      );

      handleNavigation(role, variables.loginType, navigate, user);
    },
    onError: (error: Error) => {
      logger.error('로그인 실패:', error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSettled: () => {
      // React Query 캐시 전체 삭제 (이전 사용자 데이터 제거)
      queryClient.clear();
      // deviceId는 유지하고 인증 관련 정보만 삭제
      localStorage.removeItem('accessToken');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('userRole');
      localStorage.removeItem('isInstructor');
      localStorage.removeItem('instructorProfileCompleted');
      navigate('/login');
    },
  });

  return {
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoading: loginMutation.isPending,
    error: loginMutation.error,
    // 추가된 role 관련 헬퍼
    userRole,
    isAdmin,
    isSuperAdmin,
    isInstructor,
  };
};

/**
 * 도우미 함수들
 */
function determineUserRole(user: User): UserRoleType {
  if (user.isAdmin) {
    return user.adminLevel === ADMIN_LEVELS.SUPER ? 'SUPER_ADMIN' : 'ADMIN';
  }
  return USER_ROLES.USER as UserRoleType;
}

function handleNavigation(
  role: UserRoleType,
  loginType: string,
  navigate: NavigateFunction,
  user: User,
): void {
  // 0. 슈퍼관리자는 어디서 로그인해도 관리자 페이지로 이동
  if (role === 'SUPER_ADMIN') {
    navigate('/admin/super');
    return;
  }

  // 1. 강사 프로필 미완성 시 프로필 페이지로 이동 (강사인 경우)
  if (user.isInstructor && user.instructorProfileCompleted === false) {
    navigate('/user-main/profile');
    return;
  }

  // 2. '일반/강사' 탭(GENERAL)으로 로그인했다면,
  //    관리자 권한이 있어도 무조건 사용자 메인 페이지로 보냄
  if (loginType === USER_ROLES.GENERAL) {
    navigate('/user-main');
    return;
  }

  // 3. '관리자' 탭으로 로그인했을 때만 권한에 따라 관리자 페이지로 이동
  switch (role) {
    case 'ADMIN':
      navigate('/admin');
      break;
    default:
      navigate('/user-main');
  }
}
