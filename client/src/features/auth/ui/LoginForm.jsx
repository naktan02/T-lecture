import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputField } from '../../../shared/ui/InputField';
import { Button } from '../../../shared/ui/Button';
import { useAuth } from '../model/useAuth';
import { USER_ROLES } from '../../../shared/constants/roles';

export const LoginForm = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  
  const [loginType, setLoginType] = useState(USER_ROLES.GENERAL);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    login({ ...formData, loginType });
  };

  return (
    
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-10 text-center">
        {/* 로고 영역 (로그인.html 구조 그대로) */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl">
            BTF
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-1">
            T-lecture
          </h1>
          <p className="text-sm text-gray-500">
            Instructor Dispatch Automation System
          </p>
        </div>

        {/* 에러 토스트 메시지 */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded text-left">
            {error.message || '로그인에 실패했습니다.'}
          </div>
        )}

        {/* 역할 선택 버튼: 관리자 / 일반·강사 */}
        <div className="flex mb-6">
          <button
            type="button"
            onClick={() => setLoginType(USER_ROLES.ADMIN)}
            className={`flex-1 py-2 mx-1 rounded-md border text-sm font-semibold transition-colors
              ${
                loginType === USER_ROLES.ADMIN
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
              }`}
          >
            관리자
          </button>
          <button
            type="button"
            onClick={() => setLoginType(USER_ROLES.GENERAL)}
            className={`flex-1 py-2 mx-1 rounded-md border text-sm font-semibold transition-colors
              ${
                loginType === USER_ROLES.GENERAL
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
              }`}
          >
            일반 / 강사
          </button>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="text-left">
          <div className="mb-4">
            <InputField
              label="아이디 (이메일)"
              type="email"
              placeholder="example@btf.or.kr"
              value={formData.email}
              onChange={handleChange('email')}
              required
            />
          </div>

          <div className="mb-2">
            <InputField
              label="비밀번호"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={formData.password}
              onChange={handleChange('password')}
              required
            />
          </div>

          <Button
            type="submit"
            fullWidth
            variant="primary"
            disabled={isLoading}
            className="mt-4"
          >
            {isLoading
              ? '로그인 중...'
              : loginType === USER_ROLES.ADMIN
              ? '관리자 로그인'
              : '로그인'}
          </Button>
        </form>

        {/* 하단 링크 (비밀번호 찾기 / 회원가입) */}
        <div className="mt-6 flex justify-between text-xs text-gray-500">
          <button
            type="button"
            className="hover:text-gray-700"
            // TODO: 비밀번호 찾기 페이지 라우팅 연결
          >
            비밀번호 찾기
          </button>

          {loginType !== USER_ROLES.ADMIN && (
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="font-bold text-green-600 hover:text-green-700"
            >
              회원가입
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
