// server/eslint.config.cjs
const js = require("@eslint/js");
const globals = require("globals");
const prettier = require("eslint-config-prettier");

module.exports = [
    js.configs.recommended,
    prettier,
    // ✅ 서버 소스 코드
    {
        files: ["src/**/*.js", "jobs/**/*.js", "infra/**/*.js", "server.js"],
        languageOptions: {
        ecmaVersion: "latest",
        sourceType: "commonjs",
        globals: { ...globals.node, ...globals.es2021 },
        },
        rules: {
        "no-console": "warn",
        "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        eqeqeq: ["error", "always"],
        "no-empty": "error",
        },
    },

    // ✅ prisma seed는 console 허용
    {
        files: ["prisma/**/*.js"],
        languageOptions: {
        ecmaVersion: "latest",
        sourceType: "commonjs",
        globals: {
            ...globals.node,
            ...globals.es2021,
        },
        },
        rules: {
        "no-console": "off", // seed는 console 허용
        },
    },

    // ✅ (옵션) 테스트는 일단 제외(추천)
    {
        ignores: [
        "node_modules/**",
        "dist/**",
        "build/**",
        "coverage/**",
        "tests/**",
        ],
    },
];
