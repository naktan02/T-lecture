// client/src/pages/auth/LoginPage.tsx
import type { ReactElement } from 'react';
import { LoginForm } from '../../features/auth/ui/LoginForm';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

export default function LoginPage(): ReactElement | null {
  // GUEST 설정: 로그인 상태면 메인으로 튕겨냄
  const { shouldRender } = useAuthGuard('GUEST');

  if (!shouldRender) return null;

  return <LoginForm />;
}
