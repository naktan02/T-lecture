// client/src/features/auth/model/useAuthGuard.js
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 페이지 접근 권한을 검사하는 Hook입니다.
 * * @param {('USER'|'ADMIN'|'SUPER_ADMIN'|'GUEST')} requiredRole - 필요한 최소 권한. 
 * GUEST는 로그인 상태가 아니어야 함을 의미합니다.
 * * NOTE: 실제 보안 검사는 API 요청 시 서버에서 이루어지며, 이 Hook은 UX 개선 및 
 * 프론트엔드에서의 빠른 리디렉션을 담당합니다.
 */
export const useAuthGuard = (requiredRole) => {
    const navigate = useNavigate();
    
    // 이 useEffect는 페이지 진입 시 한 번만 실행됩니다.
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        const userRole = localStorage.getItem('userRole'); 

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
        // 2. Protected Guard (로그인 필수)
        // ----------------------------------------------------
        if (!token) {
            alert('로그인이 필요합니다.');
            navigate('/login', { replace: true });
            return;
        }

        // ----------------------------------------------------
        // 3. Role Guard (권한 검사)
        // ----------------------------------------------------
        let hasPermission = true; // 일단 통과했다고 가정

        if (requiredRole === 'SUPER_ADMIN' && userRole !== 'SUPER_ADMIN') {
            hasPermission = false;
        } else if (requiredRole === 'ADMIN' && !(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')) {
            hasPermission = false;
        }

        if (!hasPermission) {
            alert('접근 권한이 없습니다.');
            navigate('/user-main', { replace: true }); 
        }

    }, [navigate, requiredRole]);
    
    // UX 개선: Hook이 쫓아내기 전에 화면이 잠깐 보이는 것을 막기 위한 로직
    const token = localStorage.getItem('accessToken');
    const userRole = localStorage.getItem('userRole');
    let shouldRender = true;
    
    if (requiredRole === 'GUEST' && token) {
        shouldRender = false; // 로그인 상태인데 GUEST 페이지면 숨김
    } else if (requiredRole !== 'GUEST' && !token) {
        shouldRender = false; // 로그인이 필요한데 토큰이 없으면 숨김
    } else if (requiredRole === 'SUPER_ADMIN' && userRole !== 'SUPER_ADMIN') {
        shouldRender = false; // 권한이 부족하면 숨김
    } else if (requiredRole === 'ADMIN' && !(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')) {
        shouldRender = false;
    }
    
    return { shouldRender };
};