// src/pages/auth/SignupPage.tsx
import { RegisterForm } from '../../features/auth/ui/RegisterForm';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { LoadingSpinner } from '../../shared/ui';

const SignupPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('GUEST');

  if (!shouldRender) {
    return <LoadingSpinner fullScreen message="가입 가능 상태를 확인하는 중입니다." />;
  }

  return <RegisterForm />;
};

export default SignupPage;
