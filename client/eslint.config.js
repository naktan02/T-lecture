// client/eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default [
    // 기본 추천 룰
    js.configs.recommended,

    // React/JSX 파일 대상
    {
        files: ["**/*.{js,jsx}"],
        languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        globals: {
            ...globals.browser, // window, document 등
            ...globals.es2021,
        },
        parserOptions: {
            ecmaFeatures: { jsx: true },
        },
        },
        settings: {
        react: { version: "detect" },
        },
        plugins: {
        react: reactPlugin,
        "react-hooks": reactHooksPlugin,
        "react-refresh": reactRefreshPlugin,
        },
        rules: {
        // React 기본 권장
        ...reactPlugin.configs.recommended.rules,

        // Hooks 규칙(중요)
        ...reactHooksPlugin.configs.recommended.rules,
        "react/prop-types": "off",
        // Vite + React Refresh에서 유용
        "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

        // JSX 사용하면 React import 강제 X(React 17+)
        "react/react-in-jsx-scope": "off",

        // 개발 편의(원하면 error로 올려도 됨)
        "no-console": "warn",
        "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        "eqeqeq": ["error", "always"],
        },
    },
    prettier,
    // 제외할 것들
    {
        ignores: ["dist/**", "build/**", "node_modules/**"],
    },
];
