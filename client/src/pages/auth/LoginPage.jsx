// client/src/pages/auth/LoginPage.jsx (Refactored)
import { LoginForm } from '../../features/auth/ui/LoginForm';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard'; // 💡 Guard Hook 추가

export default function LoginPage() {
    // GUEST 설정: 로그인 상태면 메인으로 튕겨냄
    const { shouldRender } = useAuthGuard('GUEST');

    if (!shouldRender) return null; // 로그인 상태면 숨김

    return <LoginForm />;
}
