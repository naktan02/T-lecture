// client/src/pages/auth/LoginPage.tsx
import type { ReactElement } from 'react';
import { LoginForm } from '../../features/auth/ui/LoginForm';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { LoadingSpinner } from '../../shared/ui';

export default function LoginPage(): ReactElement | null {
  // GUEST 설정: 로그인 상태면 메인으로 튕겨냄
  const { shouldRender } = useAuthGuard('GUEST');

  if (!shouldRender) {
    return <LoadingSpinner fullScreen message="로그인 상태를 확인하는 중입니다." />;
  }

  return <LoginForm />;
}
