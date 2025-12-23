// client/src/features/auth/model/useAuth.ts
import { useMutation } from '@tanstack/react-query';
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
}

type UserRoleType = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export const useAuth = () => {
  const navigate = useNavigate();

  // 현재 저장된 role 가져오기
  const userRole = localStorage.getItem('userRole') as UserRoleType | null;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const loginMutation = useMutation({
    mutationFn: loginApi,
    onSuccess: (data: LoginResponse, variables: LoginPayload) => {
      const user = data.user as User;
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('currentUser', JSON.stringify(user));

      const role = determineUserRole(user);
      localStorage.setItem('userRole', role);

      handleNavigation(role, variables.loginType, navigate);
    },
    onError: (error: Error) => {
      logger.error('로그인 실패:', error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSettled: () => {
      localStorage.clear();
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

function handleNavigation(role: UserRoleType, loginType: string, navigate: NavigateFunction): void {
  // 1. '일반/강사' 탭(GENERAL)으로 로그인했다면,
  //    관리자 권한이 있어도 무조건 사용자 메인 페이지로 보냄
  if (loginType === USER_ROLES.GENERAL) {
    navigate('/user-main');
    return;
  }

  // 2. '관리자' 탭으로 로그인했을 때만 권한에 따라 관리자 페이지로 이동
  switch (role) {
    case 'SUPER_ADMIN':
      navigate('/admin/super');
      break;
    case 'ADMIN':
      navigate('/admin');
      break;
    default:
      navigate('/user-main');
  }
}
