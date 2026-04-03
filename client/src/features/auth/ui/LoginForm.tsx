import { ChangeEvent, FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, InputField } from '../../../shared/ui';
import { USER_ROLES } from '../../../shared/constants';
import { useAuth } from '../model/useAuth';

interface FormData {
  email: string;
  password: string;
}

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const [loginType, setLoginType] = useState<string>(USER_ROLES.GENERAL);
  const [rememberMe, setRememberMe] = useState(true);
  const [formData, setFormData] = useState<FormData>({ email: '', password: '' });

  const handleChange = (field: keyof FormData) => (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    login({ ...formData, loginType, rememberMe });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-2 md:px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg px-12 py-16 md:p-10 text-center">
        <div className="mb-12 md:mb-8">
          <div className="w-20 h-20 md:w-16 md:h-16 bg-green-600 rounded-full mx-auto mb-6 md:mb-4 flex items-center justify-center text-white font-bold text-3xl md:text-2xl">
            BTF
          </div>
          <h1 className="text-2xl md:text-xl font-bold text-gray-800 mb-2 md:mb-1">T-lecture</h1>
          <p className="text-base md:text-sm text-gray-500">
            Instructor Dispatch Automation System
          </p>
        </div>

        {error && (
          <div className="mb-6 md:mb-4 bg-red-50 border border-red-200 text-red-700 text-base md:text-sm px-4 md:px-3 py-3 md:py-2 rounded text-left">
            {error.message || '로그인에 실패했습니다.'}
          </div>
        )}

        <div className="flex gap-3 md:gap-2 mb-10 md:mb-6">
          <Button
            fullWidth
            size="small"
            variant={loginType === USER_ROLES.ADMIN ? 'primary' : 'secondary'}
            onClick={() => setLoginType(USER_ROLES.ADMIN)}
            className="py-3 md:py-2 text-base md:text-sm"
          >
            관리자
          </Button>
          <Button
            fullWidth
            size="small"
            variant={loginType === USER_ROLES.GENERAL ? 'primary' : 'secondary'}
            onClick={() => setLoginType(USER_ROLES.GENERAL)}
            className="py-3 md:py-2 text-base md:text-sm"
          >
            일반 / 강사
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="text-left space-y-6 md:space-y-0">
          <InputField
            label="아이디(이메일)"
            type="email"
            placeholder="example@btf.or.kr"
            value={formData.email}
            onChange={handleChange('email')}
            required
          />

          <div className="mt-6 md:mt-4">
            <InputField
              label="비밀번호"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={formData.password}
              onChange={handleChange('password')}
              required
            />
          </div>

          <div className="mt-4 flex items-start justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span>로그인 유지</span>
            </label>
            <p className="text-right text-xs text-gray-400">
              해제하면 브라우저 종료 후
              <br />
              다시 로그인해야 합니다.
            </p>
          </div>

          <div className="mt-10 md:mt-6">
            <Button
              type="submit"
              fullWidth
              disabled={isLoading}
              className="py-3 md:py-2 text-base md:text-sm"
            >
              {isLoading
                ? '로그인 중...'
                : loginType === USER_ROLES.ADMIN
                  ? '관리자 로그인'
                  : '로그인'}
            </Button>
          </div>
        </form>

        <div className="mt-10 md:mt-6 flex justify-between text-sm md:text-xs text-gray-500 items-center">
          <button
            type="button"
            className="hover:text-gray-700"
            onClick={() => navigate('/forgot-password')}
          >
            비밀번호 찾기
          </button>

          {loginType !== USER_ROLES.ADMIN && (
            <Button
              variant="ghost"
              size="xsmall"
              onClick={() => navigate('/signup')}
              className="text-green-600 hover:text-green-700 font-bold text-sm md:text-xs"
            >
              회원가입
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
