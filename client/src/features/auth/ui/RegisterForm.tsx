// src/features/auth/ui/RegisterForm.tsx
import { useState, ChangeEvent, FormEvent } from 'react';
import { Button } from '../../../shared/ui';
import { sendVerificationCode, verifyEmailCode, registerUser } from '../authApi';
import { useNavigate, Link } from 'react-router-dom';

import { UserBasicFields } from '../../../entities/user/ui/UserBasicFields';
import { InstructorFields } from '../../../entities/user/ui/InstructorFields';
import { useInstructorMeta } from '../../../entities/user/model/useInstructorMeta';

type UserType = 'INSTRUCTOR' | 'USER';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  phoneNumber: string;
  code: string;
  address: string;
  hasCar: boolean;
  agreed: boolean;
  virtueIds: number[];
  teamId: string;
  category: string;
}

export const RegisterForm: React.FC = () => {
  const [userType, setUserType] = useState<UserType>('INSTRUCTOR');
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phoneNumber: '',
    code: '',
    address: '',
    hasCar: false,
    agreed: false,
    virtueIds: [],
    teamId: '',
    category: '',
  });

  const { options, loading: loadingOptions, error: metaError } = useInstructorMeta();

  const [sendingCode, setSendingCode] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const displayError = error || metaError;

  const handleChange =
    (field: keyof RegisterFormData) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const target = e.target as HTMLInputElement;
      const value = target.type === 'checkbox' ? target.checked : target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const toggleVirtue = (virtueId: number): void => {
    setForm((prev) => {
      const exists = prev.virtueIds.includes(virtueId);
      return {
        ...prev,
        virtueIds: exists
          ? prev.virtueIds.filter((id) => id !== virtueId)
          : [...prev.virtueIds, virtueId],
      };
    });
  };

  const handleSendCode = async (): Promise<void> => {
    try {
      setError('');
      setInfo('');
      if (!form.email) {
        setError('이메일을 먼저 입력해주세요.');
        return;
      }
      setSendingCode(true);
      await sendVerificationCode(form.email);
      setInfo('인증번호가 발송되었습니다. 이메일을 확인해주세요.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async (): Promise<void> => {
    try {
      setError('');
      setInfo('');
      if (!form.email || !form.code) {
        setError('이메일과 인증번호를 모두 입력해주세요.');
        return;
      }
      setVerifyingCode(true);
      await verifyEmailCode(form.email, form.code);
      setCodeVerified(true);
      setInfo('이메일 인증이 완료되었습니다.');
    } catch (e) {
      setCodeVerified(false);
      setError((e as Error).message);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!codeVerified) {
      setError('이메일 인증을 완료한 뒤 가입 신청이 가능합니다.');
      return;
    }
    if (!form.agreed) {
      setError('이용약관 및 개인정보 처리방침에 동의해주세요.');
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('필수 항목을 모두 입력해주세요.');
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (userType === 'INSTRUCTOR') {
      if (!form.address.trim()) {
        setError('강사 등록 시 거주지 주소는 필수입니다.');
        return;
      }
      if (form.virtueIds.length === 0 || !form.category) {
        setError('과목(덕목)과 직책을 선택해주세요.');
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        email: form.email,
        password: form.password,
        name: form.name,
        phoneNumber: form.phoneNumber,
        address: userType === 'INSTRUCTOR' ? form.address : undefined,
        type: userType,
        virtueIds: userType === 'INSTRUCTOR' ? form.virtueIds : undefined,
        teamId: userType === 'INSTRUCTOR' && form.teamId ? Number(form.teamId) : undefined,
        category: userType === 'INSTRUCTOR' ? form.category : undefined,
      };

      const result = await registerUser(payload);

      setInfo(result.message || '가입 신청이 완료되었습니다.');
      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-2 md:p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg px-10 py-12 md:p-6">
        {/* 헤더 - 뒤로가기 + 제목 */}
        <div className="flex items-center gap-5 md:gap-4 mb-8 md:mb-5">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            title="로그인으로 돌아가기"
          >
            <svg
              className="w-6 h-6 md:w-5 md:h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl md:text-xl font-bold text-gray-800">회원가입</h2>
            <p className="text-base md:text-sm text-gray-500">
              푸른나무재단에 오신 것을 환영합니다.
            </p>
          </div>
        </div>

        {/* 안내/에러 메시지 */}
        {displayError && (
          <div className="mb-6 md:mb-4 bg-red-50 border border-red-200 text-red-700 text-base md:text-sm px-4 md:px-3 py-3 md:py-2 rounded">
            {error}
          </div>
        )}
        {info && !displayError && (
          <div className="mb-6 md:mb-4 bg-green-50 border border-green-200 text-green-700 text-base md:text-sm px-4 md:px-3 py-3 md:py-2 rounded">
            {info}
          </div>
        )}

        {/* 탭 버튼 */}
        <div className="flex gap-3 md:gap-2 mb-10 md:mb-6">
          <Button
            type="button"
            fullWidth
            size="small"
            variant={userType === 'INSTRUCTOR' ? 'primary' : 'secondary'}
            onClick={() => setUserType('INSTRUCTOR')}
            className="py-3 md:py-2 text-base md:text-sm"
          >
            강사
          </Button>
          <Button
            type="button"
            fullWidth
            size="small"
            variant={userType === 'USER' ? 'primary' : 'secondary'}
            onClick={() => setUserType('USER')}
            className="py-3 md:py-2 text-base md:text-sm"
          >
            일반
          </Button>
        </div>

        <form className="space-y-5 md:space-y-3" onSubmit={handleSubmit}>
          {/* 공통 기본 정보 입력 */}
          <UserBasicFields
            form={form}
            onChange={handleChange}
            sendingCode={sendingCode}
            verifyingCode={verifyingCode}
            codeVerified={codeVerified}
            onSendCode={handleSendCode}
            onVerifyCode={handleVerifyCode}
          />

          {/* 강사 전용 정보 */}
          {userType === 'INSTRUCTOR' && (
            <InstructorFields
              form={form}
              options={options}
              loadingOptions={loadingOptions}
              onChange={handleChange}
              onToggleVirtue={toggleVirtue}
            />
          )}

          {/* 약관 동의 */}
          <div className="flex items-start gap-3 md:gap-2 mt-10 md:mt-6">
            <input
              type="checkbox"
              className="w-5 h-5 md:w-4 md:h-4 mt-0.5 text-green-600 rounded focus:ring-green-500"
              checked={form.agreed}
              onChange={handleChange('agreed')}
              required
            />
            <span className="text-base md:text-sm text-gray-600">
              [필수]{' '}
              <Link to="/terms" className="text-green-600 hover:underline">
                이용약관
              </Link>{' '}
              및{' '}
              <Link to="/privacy" className="text-green-600 hover:underline">
                개인정보 처리방침
              </Link>
              에 동의합니다.
            </span>
          </div>

          {/* 제출 버튼 */}
          <div className="pt-8 md:pt-4">
            <Button
              type="submit"
              fullWidth
              variant="primary"
              disabled={submitting}
              className="py-3 md:py-2 text-base md:text-sm"
            >
              {submitting ? '가입 신청 중...' : '가입 신청'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
