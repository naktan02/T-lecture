"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationCode = void 0;
// server/src/infra/email.service.ts
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = __importDefault(require("../config/logger"));
const AppError_1 = require("../common/errors/AppError");
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
const sendVerificationCode = async (toEmail, code) => {
    const mailOptions = {
        from: `"T-LECTURE Auth" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: '[T-LECTURE] 이메일 인증번호 안내',
        html: `
      <div style="padding: 20px; border: 1px solid #ddd; max-width: 400px;">
        <h3>이메일 인증</h3>
        <p>안녕하세요, T-LECTURE 입니다.</p>
        <p>아래의 인증번호 6자리를 입력하여 인증을 완료해주세요.</p>
        <h2 style="color: #007bff; letter-spacing: 2px;">${code}</h2>
        <p style="font-size: 12px; color: gray;">* 이 코드는 3분간 유효합니다.</p>
      </div>
    `,
    };
    try {
        await transporter.sendMail(mailOptions);
        logger_1.default.info(`Verification email sent to ${toEmail}`);
    }
    catch (err) {
        logger_1.default.error(`Failed to send verification email to ${toEmail}: ${err instanceof Error ? err.message : err}`);
        throw new AppError_1.AppError('이메일 발송에 실패했습니다.', 500, 'EMAIL_SEND_FAILED');
    }
};
exports.sendVerificationCode = sendVerificationCode;
exports.default = { sendVerificationCode: exports.sendVerificationCode };
