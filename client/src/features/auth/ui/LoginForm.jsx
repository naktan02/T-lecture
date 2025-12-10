// src/features/auth/ui/LoginForm.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputField } from '../../../shared/ui/InputField';
import { Button } from '../../../shared/ui/Button';
import { login as loginApi } from '../authApi';
export const LoginForm = () => {
  const navigate = useNavigate();

  // ADMIN = 관리자, GENERAL = 일반/강사
  const [loginType, setLoginType] = useState('GENERAL');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');       // 토스트 메시지
  const [loading, setLoading] = useState(false); // 로그인 시 로딩 상태

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginApi({
        email: formData.email,
        password: formData.password,
        loginType, // "ADMIN" | "GENERAL"
      });

      // 토큰 / 유저 정보 저장 (필요 시 원하는 방식으로 변경 가능)
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('currentUser', JSON.stringify(data.user));

      // 💡 [Fix] 권한 가드(useAuthGuard)를 위한 role 저장
      const user = data.user;
      let role = 'USER';
      if (user.isAdmin) {
          role = user.adminLevel === 'SUPER' ? 'SUPER_ADMIN' : 'ADMIN';
      }
      localStorage.setItem('userRole', role);

      if (loginType === 'ADMIN') {
        // ✅ 관리자 탭 로그인일 때:
        // SUPER → 슈퍼 전용 페이지, GENERAL → 일반 관리자 페이지
        const level = data.user?.adminLevel;
        if (level === 'SUPER') {
          navigate('/admin/super');   // 관리자 권한 부여/회수 등
        } else {
          navigate('/admin');         // 일반 관리자 대시보드
        }
      } else {
        navigate('/userHome');
      }
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
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
            {error}
          </div>
        )}

        {/* 역할 선택 버튼: 관리자 / 일반·강사 */}
        <div className="flex mb-6">
          <button
            type="button"
            onClick={() => setLoginType('ADMIN')}
            className={`flex-1 py-2 mx-1 rounded-md border text-sm font-semibold transition-colors
              ${
                loginType === 'ADMIN'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
              }`}
          >
            관리자
          </button>
          <button
            type="button"
            onClick={() => setLoginType('GENERAL')}
            className={`flex-1 py-2 mx-1 rounded-md border text-sm font-semibold transition-colors
              ${
                loginType === 'GENERAL'
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
            disabled={loading}
            className="mt-4"
          >
            {loading
              ? '로그인 중...'
              : loginType === 'ADMIN'
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

          {loginType !== 'ADMIN' && (
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
