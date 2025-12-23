"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/domains/auth/auth.routes.ts
const express_1 = require("express");
const authController = __importStar(require("./auth.controller"));
const middlewares_1 = require("../../common/middlewares");
const router = (0, express_1.Router)();
// 이메일 인증 코드 발송
router.post('/code/send', authController.sendCode);
// 이메일 인증 코드 검증
router.post('/code/verify', authController.verifyCode);
// 회원가입
router.post('/register', authController.register);
// 로그인
router.post('/login', authController.login);
// 토큰 재발급
router.post('/refresh', authController.refresh);
// 로그아웃
router.post('/logout', middlewares_1.auth, authController.logout);
// 비밀번호 재설정
router.post('/reset-password', authController.resetPassword);
exports.default = router;
