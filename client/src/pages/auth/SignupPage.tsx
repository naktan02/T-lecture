// src/pages/auth/SignupPage.tsx
import { RegisterForm } from '../../features/auth/ui/RegisterForm';
import { ContentWrapper } from '../../shared/ui';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const SignupPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('GUEST');

  if (!shouldRender) return null;

  return (
    <ContentWrapper>
      <div className="py-8 md:py-12">
        <RegisterForm />
      </div>
    </ContentWrapper>
  );
};

export default SignupPage;
