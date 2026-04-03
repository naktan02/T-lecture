import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NavigateFunction, useNavigate } from 'react-router-dom';
import { login as loginApi, LoginPayload, LoginResponse, logout as logoutApi } from '../authApi';
import { ADMIN_LEVELS, USER_ROLES } from '../../../shared/constants';
import {
  clearAuthStorage,
  getStoredIsInstructor,
  getStoredUserRole,
  persistAuthState,
  setAccessToken,
} from '../../../shared/auth/session';
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

  const userRole = getStoredUserRole() as UserRoleType | null;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isInstructor = getStoredIsInstructor();

  const loginMutation = useMutation({
    mutationFn: loginApi,
    onSuccess: (data: LoginResponse, variables: LoginPayload) => {
      const user = data.user as User;
      const role = determineUserRole(user);

      setAccessToken(data.accessToken);
      persistAuthState({
        currentUser: user,
        userRole: role,
        isInstructor: !!user.isInstructor,
        instructorProfileCompleted: user.instructorProfileCompleted ?? true,
        rememberMe: variables.rememberMe,
      });

      handleNavigation(role, variables.loginType, navigate, user);
    },
    onError: (error: Error) => {
      logger.error('로그인 실패:', error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSettled: () => {
      queryClient.clear();
      clearAuthStorage();
      navigate('/login');
    },
  });

  return {
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoading: loginMutation.isPending,
    error: loginMutation.error,
    userRole,
    isAdmin,
    isSuperAdmin,
    isInstructor,
  };
};

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
  if (role === 'SUPER_ADMIN') {
    navigate('/admin/super');
    return;
  }

  if (user.isInstructor && user.instructorProfileCompleted === false) {
    navigate('/user-main/profile');
    return;
  }

  if (loginType === USER_ROLES.GENERAL) {
    navigate('/user-main');
    return;
  }

  switch (role) {
    case 'ADMIN':
      navigate('/admin');
      break;
    default:
      navigate('/user-main');
  }
}
