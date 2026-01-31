// src/pages/auth/SignupPage.tsx
import { RegisterForm } from '../../features/auth/ui/RegisterForm';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const SignupPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('GUEST');

  if (!shouldRender) return null;

  return <RegisterForm />;
};

export default SignupPage;
