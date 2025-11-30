// client/src/features/auth/ui/RegisterForm.jsx

import React, { useState } from "react";
import { Button } from "../../../shared/ui/Button";
import {
  sendVerificationCode,
  verifyEmailCode,
  registerUser,
} from "../api/authApi";
import { useNavigate } from "react-router-dom";

// 새로 만든 공통 컴포넌트들
import { UserBasicFields } from "../../../entities/user/ui/UserBasicFields";
import { InstructorFields } from "../../../entities/user/ui/InstructorFields";
import { useInstructorMeta } from "../../../entities/user/model/useInstructorMeta";

export const RegisterForm = () => {
  const [userType, setUserType] = useState("INSTRUCTOR"); // INSTRUCTOR | USER
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    code: "",
    address: "", // 강사일 때만 사용
    hasCar: false, // 일단 상태만, 서버에는 아직 안 보냄
    agreed: false,
    // 강사용 메타데이터
    virtueIds: [], // 선택한 덕목(Virtue) id 목록
    teamId: "", // Team id (select)
    category: "", // UserCategory(enum) 문자열: 'Main' | 'Co' | 'Assistant' | 'Practicum'
  });

  const {
    options,                 // { virtues, teams, categories }
    loading: loadingOptions, // boolean
    error: metaError,        // 메타데이터 로딩 에러 메시지
  } = useInstructorMeta();

  const [sendingCode, setSendingCode] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const displayError = error || metaError;

  const handleChange = (field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // 덕목(Virtue) 체크박스 토글
  const toggleVirtue = (virtueId) => {
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

  const handleSendCode = async () => {
    try {
      setError("");
      setInfo("");
      if (!form.email) {
        setError("이메일을 먼저 입력해주세요.");
        return;
      }
      setSendingCode(true);
      await sendVerificationCode(form.email);
      setInfo("인증번호가 발송되었습니다. 이메일을 확인해주세요.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setError("");
      setInfo("");
      if (!form.email || !form.code) {
        setError("이메일과 인증번호를 모두 입력해주세요.");
        return;
      }
      setVerifyingCode(true);
      await verifyEmailCode(form.email, form.code);
      setCodeVerified(true);
      setInfo("이메일 인증이 완료되었습니다.");
    } catch (e) {
      setCodeVerified(false);
      setError(e.message);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!codeVerified) {
      setError("이메일 인증을 완료한 뒤 가입 신청이 가능합니다.");
      return;
    }
    if (!form.agreed) {
      setError("이용약관 및 개인정보 처리방침에 동의해주세요.");
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("필수 항목을 모두 입력해주세요.");
      return;
    }

    if (userType === "INSTRUCTOR") {
      if (!form.address.trim()) {
        setError("강사 등록 시 거주지 주소는 필수입니다.");
        return;
      }
      if (form.virtueIds.length === 0 || !form.teamId || !form.category) {
        setError("과목(덕목), 팀, 직책을 모두 선택해주세요.");
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
        address: userType === "INSTRUCTOR" ? form.address : undefined,
        type: userType, // 'INSTRUCTOR' | 'USER'

        // 강사일 때만 전송
        virtueIds:
          userType === "INSTRUCTOR" ? form.virtueIds : undefined,
        teamId:
          userType === "INSTRUCTOR" ? Number(form.teamId) : undefined,
        category: userType === "INSTRUCTOR" ? form.category : undefined,
      };

      const result = await registerUser(payload);

      setInfo(result.message || "가입 신청이 완료되었습니다.");
      // 가입 신청 후 바로 로그인 화면으로 이동
      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
          회원가입
        </h2>
        <p className="text-center text-gray-500 mb-8">
          푸른나무재단에 오신 것을 환영합니다.
        </p>

        {/* 안내/에러 메시지 */}
        {displayError  && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
            {error}
          </div>
        )}
        {info && !displayError  && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded">
            {info}
          </div>
        )}

        {/* 탭 버튼 (강사 / 일반) */}
        <div className="flex mb-8 border-b border-gray-200">
          <button
            type="button"
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              userType === "INSTRUCTOR"
                ? "border-b-2 border-green-500 text-green-600 font-bold"
                : "text-gray-400 hover:text-gray-600"
            }`}
            onClick={() => setUserType("INSTRUCTOR")}
          >
            강사
          </button>
          <button
            type="button"
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              userType === "USER"
                ? "border-b-2 border-green-500 text-green-600 font-bold"
                : "text-gray-400 hover:text-gray-600"
            }`}
            onClick={() => setUserType("USER")}
          >
            일반
          </button>
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
          {userType === "INSTRUCTOR" && (
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
              onChange={handleChange("agreed")}
              required
            />
            <span className="text-sm text-gray-600">
              [필수] 이용약관 및 개인정보 처리방침에 동의합니다.
            </span>
          </div>

          {/* 제출 버튼 */}
          <div className="pt-4">
            <Button
              type="submit"
              fullWidth
              variant="primary"
              disabled={submitting}
            >
              {submitting ? "가입 신청 중..." : "가입 신청"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
