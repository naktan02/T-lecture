// src/features/auth/ui/RegisterForm.tsx
import { useState, ChangeEvent, FormEvent } from 'react';
import { Button } from '../../../shared/ui';
import { sendVerificationCode, verifyEmailCode, registerUser } from '../authApi';
import { useNavigate } from 'react-router-dom';

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
      if (form.virtueIds.length === 0 || !form.teamId || !form.category) {
        setError('과목(덕목), 팀, 직책을 모두 선택해주세요.');
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
        teamId: userType === 'INSTRUCTOR' ? Number(form.teamId) : undefined,
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
    <div className="min-h-full flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">회원가입</h2>
        <p className="text-center text-gray-500 mb-8">푸른나무재단에 오신 것을 환영합니다.</p>

        {/* 안내/에러 메시지 */}
        {displayError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
            {error}
          </div>
        )}
        {info && !displayError && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded">
            {info}
          </div>
        )}

        {/* 탭 버튼 */}
        <div className="flex gap-2 mb-8">
          <Button
            type="button"
            fullWidth
            variant={userType === 'INSTRUCTOR' ? 'primary' : 'secondary'}
            onClick={() => setUserType('INSTRUCTOR')}
          >
            강사
          </Button>
          <Button
            type="button"
            fullWidth
            variant={userType === 'USER' ? 'primary' : 'secondary'}
            onClick={() => setUserType('USER')}
          >
            일반
          </Button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
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
          <div className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              checked={form.agreed}
              onChange={handleChange('agreed')}
              required
            />
            <span className="text-sm text-gray-600">
              [필수] 이용약관 및 개인정보 처리방침에 동의합니다.
            </span>
          </div>

          {/* 제출 버튼 */}
          <div className="pt-4">
            <Button type="submit" fullWidth variant="primary" disabled={submitting}>
              {submitting ? '가입 신청 중...' : '가입 신청'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
