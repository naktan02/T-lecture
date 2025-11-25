// client/src/features/auth/api/authApi.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * 로그인 요청
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {"ADMIN"|"GENERAL"} params.loginType
 */
export async function login({ email, password, loginType }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // 쿠키 쓰면 유지, 아니면 없어도 됨
    body: JSON.stringify({ email, password, loginType }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // JSON이 아니면 무시
  }

  if (!res.ok) {
    const msg =
      data?.error ||
      data?.message ||
      "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";
    throw new Error(msg);
  }

  return data; // { accessToken, user }
}

export async function sendVerificationCode(email) {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/code/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "인증번호 발송 실패");
  return data;
}

/* ---------------------------------------------
 * 3) 인증번호 확인
 * --------------------------------------------- */
export async function verifyEmailCode(email, code) {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/code/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "인증번호 검증 실패");
  return data;
}

/* ---------------------------------------------
 * 4) 회원가입
 * --------------------------------------------- */
export async function registerUser(payload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "회원가입 실패");
  return data;
}

// 강사 메타데이터 조회
export async function getInstructorMeta() {
  const res = await fetch(`${API_BASE_URL}/api/v1/metadata/instructor`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "강사 메타데이터 조회 실패");
  return data; // { subjects, teams, positions }
}