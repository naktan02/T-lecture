// src/entities/user/ui/UserBasicFields.tsx
import { ChangeEvent } from 'react';
import { InputField } from '../../../shared/ui';

interface UserBasicForm {
  name: string;
  email: string;
  code: string;
  password: string;
  phoneNumber: string;
}

interface UserBasicFieldsProps {
  form: UserBasicForm;
  onChange: (field: keyof UserBasicForm) => (e: ChangeEvent<HTMLInputElement>) => void;
  sendingCode: boolean;
  verifyingCode: boolean;
  codeVerified: boolean;
  onSendCode: () => void;
  onVerifyCode: () => void;
}

/**
 * 이름, 이메일, 인증번호, 비밀번호, 연락처 등
 * "기본 유저 정보" 입력 컴포넌트
 */
export const UserBasicFields: React.FC<UserBasicFieldsProps> = ({
  form,
  onChange,
  sendingCode,
  verifyingCode,
  codeVerified,
  onSendCode,
  onVerifyCode,
}) => {
  return (
    <>
      <InputField
        label="이름"
        required
        placeholder="실명을 입력하세요"
        value={form.name}
        onChange={onChange('name')}
      />

      <InputField
        label="아이디 (이메일)"
        required
        placeholder="example@btf.or.kr"
        value={form.email}
        onChange={onChange('email')}
        hasBtn={sendingCode ? '발송중...' : '인증번호 발송'}
        onBtnClick={sendingCode ? undefined : onSendCode}
      />

      <InputField
        label="인증번호"
        required
        placeholder="이메일로 받은 6자리 숫자를 입력하세요"
        value={form.code}
        onChange={onChange('code')}
        hasBtn={verifyingCode ? '확인중...' : codeVerified ? '인증완료' : '인증확인'}
        onBtnClick={verifyingCode || codeVerified ? undefined : onVerifyCode}
      />

      <InputField
        label="비밀번호"
        type="password"
        required
        placeholder="영문, 숫자, 특수문자 포함 8자 이상"
        value={form.password}
        onChange={onChange('password')}
      />

      <InputField
        label="연락처"
        required
        placeholder="010-1234-5678"
        value={form.phoneNumber}
        onChange={onChange('phoneNumber')}
      />
    </>
  );
};
