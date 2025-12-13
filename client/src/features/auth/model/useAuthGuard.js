// client/src/features/auth/model/useAuthGuard.js
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; 

/**
 * 페이지 접근 권한을 검사하는 Hook입니다.
 * @param {('USER'|'ADMIN'|'SUPER_ADMIN'|'GUEST')} requiredRole
 */
export const useAuthGuard = (requiredRole) => {
    const navigate = useNavigate();
    
    // 🟢 [Helper] 토큰 만료 여부 확인 함수
    const isTokenExpired = (token) => {
        if (!token) return true;
        try {
            const decoded = jwtDecode(token);
            const currentTime = Date.now() / 1000;
            // 만료 시간(exp)이 현재 시간보다 이전이면 만료됨
            return decoded.exp < currentTime;
        } catch (e) {
            // 토큰 형식이 잘못되었으면 만료된 것으로 간주
            return true;
        }
    };

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
        // 2. Protected Guard (로그인 필수) & 토큰 만료 체크
        // ----------------------------------------------------
        
        // 2-1. 토큰 자체가 없는 경우
        if (!token) {
            alert('로그인이 필요합니다.');
            navigate('/login', { replace: true });
            return;
        }

        // 🟢 2-2. 토큰은 있지만 시간이 만료된 경우 (여기가 핵심)
        if (isTokenExpired(token)) {
            // 만료된 정보들 싹 지우기
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userRole');
            localStorage.removeItem('currentUser');
            
            alert('세션이 만료되었습니다. 다시 로그인해주세요.');
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
        }

        if (!hasPermission) {
            alert('접근 권한이 없습니다.');
            navigate('/user-main', { replace: true }); 
        }

    }, [navigate, requiredRole]);
    
    // ----------------------------------------------------
    // UX 개선: 렌더링 차단 (shouldRender)
    // ----------------------------------------------------
    const token = localStorage.getItem('accessToken');
    const userRole = localStorage.getItem('userRole');
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
    }
    
    return { shouldRender };
};