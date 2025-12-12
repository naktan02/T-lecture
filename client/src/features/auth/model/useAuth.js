import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { login as loginApi, logout as logoutApi } from '../authApi';
import { USER_ROLES, ADMIN_LEVELS } from '../../../shared/constants/roles'; // 상수 사용

export const useAuth = () => {
    const navigate = useNavigate();

    // 1. React Query: useMutation으로 상태 관리 자동화
    const loginMutation = useMutation({
        mutationFn: loginApi, // API 호출 함수 연결
        onSuccess: (data) => {
        // 2. 권한 로직 캡슐화 (Login 성공 시 실행)
        const user = data.user;
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('currentUser', JSON.stringify(user));

        const role = determineUserRole(user);
        localStorage.setItem('userRole', role);

        // 3. 라우팅 로직도 여기서 처리
        handleNavigation(role, navigate);
        },
        onError: (error) => {
        console.error("로그인 실패:", error);
        // 필요 시 전역 에러 토스트 띄우기 가능
        }
    });

    const logoutMutation = useMutation({
        mutationFn: logoutApi,
        onSettled: () => {
        // 성공하든 실패하든 무조건 실행
        localStorage.clear();
        navigate('/login');
        }
    });

    return {
        login: loginMutation.mutate,     // 실행 함수
        logout: logoutMutation.mutate,   // 실행 함수
        isLoading: loginMutation.isPending, // 로딩 상태 (자동)
        error: loginMutation.error,         // 에러 객체 (자동)
    };
};

/**
 * 도우미 함수들 (비즈니스 로직 분리)
 */
function determineUserRole(user) {
    if (user.isAdmin) {
        return user.adminLevel === ADMIN_LEVELS.SUPER ? 'SUPER_ADMIN' : 'ADMIN';
    }
    return USER_ROLES.USER;
}

function handleNavigation(role, navigate) {
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
