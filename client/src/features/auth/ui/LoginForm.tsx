// src/features/auth/ui/LoginForm.tsx
import { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputField, Button } from '../../../shared/ui';
import { useAuth } from '../model/useAuth';
import { USER_ROLES } from '../../../shared/constants';

interface FormData {
  email: string;
  password: string;
}

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const [loginType, setLoginType] = useState<string>(USER_ROLES.GENERAL);
  const [formData, setFormData] = useState<FormData>({ email: '', password: '' });

  const handleChange = (field: keyof FormData) => (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    login({ ...formData, loginType });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-10 text-center">
        {/* 로고 영역 */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl">
            BTF
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-1">T-lecture</h1>
          <p className="text-sm text-gray-500">Instructor Dispatch Automation System</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded text-left">
            {error.message || '로그인에 실패했습니다.'}
          </div>
        )}

        {/* 역할 선택 버튼 */}
        <div className="flex gap-2 mb-6">
          <Button
            fullWidth
            size="small"
            variant={loginType === USER_ROLES.ADMIN ? 'primary' : 'secondary'}
            onClick={() => setLoginType(USER_ROLES.ADMIN)}
          >
            관리자
          </Button>
          <Button
            fullWidth
            size="small"
            variant={loginType === USER_ROLES.GENERAL ? 'primary' : 'secondary'}
            onClick={() => setLoginType(USER_ROLES.GENERAL)}
          >
            일반 / 강사
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="text-left">
          <InputField
            label="아이디 (이메일)"
            type="email"
            placeholder="example@btf.or.kr"
            value={formData.email}
            onChange={handleChange('email')}
            required
          />

          <div className="mt-4">
            <InputField
              label="비밀번호"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={formData.password}
              onChange={handleChange('password')}
              required
            />
          </div>

          <div className="mt-6">
            <Button type="submit" fullWidth disabled={isLoading}>
              {isLoading
                ? '로그인 중...'
                : loginType === USER_ROLES.ADMIN
                  ? '관리자 로그인'
                  : '로그인'}
            </Button>
          </div>
        </form>

        <div className="mt-6 flex justify-between text-xs text-gray-500 items-center">
          <button type="button" className="hover:text-gray-700">
            비밀번호 찾기
          </button>

          {loginType !== USER_ROLES.ADMIN && (
            <Button
              variant="ghost"
              size="xsmall"
              onClick={() => navigate('/signup')}
              className="text-green-600 hover:text-green-700 font-bold"
            >
              회원가입
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
