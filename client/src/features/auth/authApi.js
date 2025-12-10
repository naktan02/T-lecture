// client/src/features/auth/authApi.js
import { apiClient } from "../../shared/apiClient";

// 1. 로그인 (토큰 갱신 로직 불필요 -> skipInterceptor: true)
export async function login({ email, password, loginType }) {
  const res = await apiClient("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, loginType }),
    skipInterceptor: true, 
  });
  return res.json();
}

// 2. 인증번호 발송 (Public)
export async function sendVerificationCode(email) {
  const res = await apiClient("/api/v1/auth/code/send", {
    method: "POST",
    body: JSON.stringify({ email }),
    skipInterceptor: true,
  });
  return res.json();
}

// 3. 인증번호 확인 (Public)
export async function verifyEmailCode(email, code) {
  const res = await apiClient("/api/v1/auth/code/verify", {
    method: "POST",
    body: JSON.stringify({ email, code }),
    skipInterceptor: true,
  });
  return res.json();
}

// 4. 회원가입 (Public)
export async function registerUser(payload) {
  const res = await apiClient("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    skipInterceptor: true,
  });
  return res.json();
}

// 5. 메타데이터 조회 (이건 로그인 후 쓸 수도 있으니 토큰 로직 태워도 됨)
export async function getInstructorMeta() {
  const res = await apiClient("/api/v1/metadata/instructor");
  return res.json();
}