// src/pages/auth/ForgotPasswordPage.tsx
import { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputField, Button } from '../../shared/ui';
import { showSuccess, showError } from '../../shared/utils';

const API_BASE = import.meta.env.VITE_API_URL || '';

type Step = 'EMAIL' | 'VERIFY' | 'RESET';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 인증 코드 발송
  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      showError('이메일을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/password-reset/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '인증번호 발송 실패');

      showSuccess(data.message);
      setStep('VERIFY');
      setCountdown(180); // 3분
      startCountdown();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 카운트다운 시작
  const startCountdown = () => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 인증 코드 확인
  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      showError('6자리 인증번호를 입력해주세요.');
      return;
    }

    // 간단히 다음 단계로 (실제 검증은 비밀번호 재설정 시 수행)
    setStep('RESET');
    showSuccess('인증이 확인되었습니다. 새 비밀번호를 입력해주세요.');
  };

  // 비밀번호 재설정
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/password-reset/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '비밀번호 변경 실패');

      showSuccess('비밀번호가 성공적으로 변경되었습니다.');
      navigate('/login');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-10">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl">
            BTF
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-1">비밀번호 찾기</h1>
          <p className="text-sm text-gray-500">
            {step === 'EMAIL' && '가입하신 이메일을 입력해주세요'}
            {step === 'VERIFY' && '이메일로 전송된 인증번호를 입력해주세요'}
            {step === 'RESET' && '새로운 비밀번호를 입력해주세요'}
          </p>
        </div>

        {/* Step 1: 이메일 입력 */}
        {step === 'EMAIL' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <InputField
              label="이메일"
              type="email"
              placeholder="example@btf.or.kr"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" fullWidth disabled={isLoading}>
              {isLoading ? '발송 중...' : '인증번호 발송'}
            </Button>
          </form>
        )}

        {/* Step 2: 인증번호 입력 */}
        {step === 'VERIFY' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <InputField
                label="인증번호"
                type="text"
                placeholder="6자리 인증번호"
                value={code}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                required
              />
              {countdown > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  남은 시간:{' '}
                  <span className="font-bold text-red-500">{formatCountdown(countdown)}</span>
                </p>
              )}
              {countdown === 0 && (
                <p className="text-sm text-red-500 mt-1">인증번호가 만료되었습니다.</p>
              )}
            </div>
            <Button type="submit" fullWidth disabled={isLoading || countdown === 0}>
              확인
            </Button>
            <button
              type="button"
              onClick={() => setStep('EMAIL')}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              이메일 다시 입력
            </button>
          </form>
        )}

        {/* Step 3: 새 비밀번호 입력 */}
        {step === 'RESET' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <InputField
              label="새 비밀번호"
              type="password"
              placeholder="6자 이상"
              value={newPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
              required
            />
            <InputField
              label="비밀번호 확인"
              type="password"
              placeholder="비밀번호 재입력"
              value={confirmPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" fullWidth disabled={isLoading}>
              {isLoading ? '변경 중...' : '비밀번호 변경'}
            </Button>
          </form>
        )}

        {/* 로그인 돌아가기 */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            ← 로그인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
