/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // 추가 환경 변수가 있으면 여기에 선언
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
