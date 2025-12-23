// server/eslint.config.cjs
const js = require("@eslint/js");
const globals = require("globals");
const prettier = require("eslint-config-prettier");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // ✅ 모든 파일(설정 파일 포함)에 Node.js 전역 변수 적용
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "warn",
      "eqeqeq": ["error", "always"],
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // ✅ 서버 소스 코드 전용 설정
    files: ["src/**/*.{js,ts}", "jobs/**/*.{js,ts}", "infra/**/*.{js,ts}", "server.{js,ts}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true, // tsconfig.json을 기반으로 타입 정보를 분석하도록 설정
      },
    },
  },
  {
    // ✅ 무시할 경로
    ignores: ["node_modules/**", "dist/**", "build/**", "coverage/**", "tests/**"],
  }
);