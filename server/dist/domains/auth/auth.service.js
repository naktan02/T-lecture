"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/domains/auth/auth.service.ts
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const instructor_repository_1 = __importDefault(require("../instructor/instructor.repository"));
const auth_repository_1 = __importDefault(require("./auth.repository"));
const user_repository_1 = __importDefault(require("../user/repositories/user.repository"));
const email_service_1 = __importDefault(require("../../infra/email.service"));
const AppError_1 = __importDefault(require("../../common/errors/AppError"));
const SALT_ROUNDS = 10;
class AuthService {
    // 이메일 인증 코드 생성/저장 후 이메일로 발송
    async sendVerificationCode(email) {
        const code = crypto_1.default.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3분 유효
        await auth_repository_1.default.createVerificationCode(email, code, expiresAt);
        await email_service_1.default.sendVerificationCode(email, code);
        return { message: '인증번호가 발송되었습니다. (유효시간 3분)' };
    }
    // 인증번호 검증
    async verifyCode(email, code) {
        const record = await auth_repository_1.default.findLatestVerification(email);
        if (!record) {
            throw new AppError_1.default('인증 요청 기록이 없습니다.', 404, 'VERIFICATION_NOT_FOUND');
        }
        if (new Date() > record.expiresAt) {
            throw new AppError_1.default('인증번호가 만료되었습니다.', 400, 'VERIFICATION_EXPIRED');
        }
        if (record.code !== code) {
            throw new AppError_1.default('인증번호가 일치하지 않습니다.', 400, 'VERIFICATION_FAILED');
        }
        await auth_repository_1.default.markAsVerified(record.id);
        return { message: '이메일 인증이 완료되었습니다.' };
    }
    // 회원가입
    async register(dto) {
        const { email, password, name, phoneNumber, address, type, virtueIds, teamId, category } = dto;
        if (!email || !password || !name || !phoneNumber) {
            throw new AppError_1.default('필수 정보가 누락되었습니다.', 400, 'VALIDATION_ERROR');
        }
        const existingUser = await user_repository_1.default.findByEmail(email);
        if (existingUser) {
            throw new AppError_1.default('이미 가입된 이메일입니다.', 409, 'EMAIL_ALREADY_EXISTS');
        }
        const verification = await auth_repository_1.default.findLatestVerification(email);
        if (!verification || !verification.isVerified) {
            throw new AppError_1.default('이메일 인증이 완료되지 않았습니다.', 400, 'EMAIL_NOT_VERIFIED');
        }
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const commonData = {
            userEmail: email,
            password: hashedPassword,
            name,
            userphoneNumber: phoneNumber,
            status: client_1.UserStatus.PENDING,
        };
        let newUser;
        if (type === 'INSTRUCTOR') {
            if (!address)
                throw new AppError_1.default('강사는 거주지 주소를 입력해야 합니다.', 400, 'VALIDATION_ERROR');
            if (!teamId || !category || !virtueIds || virtueIds.length === 0) {
                throw new AppError_1.default('강사 과목(덕목), 팀, 직책 정보를 모두 입력해야 합니다.', 400, 'VALIDATION_ERROR');
            }
            newUser = await user_repository_1.default.createInstructor(commonData, {
                location: address,
                teamId: teamId || null,
                category: category || null,
                lat: null,
                lng: null,
            });
            await instructor_repository_1.default.addVirtues(newUser.id, virtueIds);
        }
        else {
            newUser = await user_repository_1.default.createUser(commonData);
        }
        await auth_repository_1.default.deleteVerifications(email);
        return {
            id: newUser.id,
            email: newUser.userEmail,
            name: newUser.name,
            status: newUser.status,
            message: '가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.',
        };
    }
    // 로그인
    async login(email, password, loginType, deviceId) {
        const user = await user_repository_1.default.findByEmail(email);
        if (!user) {
            throw new AppError_1.default('가입되지 않은 이메일입니다.', 404, 'USER_NOT_FOUND');
        }
        const ok = await bcrypt_1.default.compare(password, user.password || '');
        if (!ok) {
            throw new AppError_1.default('비밀번호가 일치하지 않습니다.', 401, 'INVALID_PASSWORD');
        }
        if (user.status !== 'APPROVED') {
            throw new AppError_1.default('승인되지 않은 사용자입니다.', 403, 'USER_NOT_APPROVED');
        }
        const JWT_SECRET = process.env.JWT_SECRET;
        const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
        if (!JWT_SECRET || !REFRESH_SECRET) {
            throw new AppError_1.default('서버 설정 오류: 토큰 시크릿이 없습니다.', 500, 'CONFIG_ERROR');
        }
        const payload = { userId: user.id };
        const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jsonwebtoken_1.default.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await auth_repository_1.default.saveRefreshToken(user.id, refreshToken, expiresAt, deviceId);
        const isInstructor = !!user.instructor;
        const isAdmin = !!user.admin;
        const adminLevel = user.admin?.level || null;
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.userEmail,
                name: user.name,
                status: user.status,
                isAdmin,
                adminLevel,
                isInstructor,
            },
        };
    }
    // 리프레시 토큰 발급
    async refreshAccessToken(incomingRefreshToken) {
        if (!incomingRefreshToken)
            throw new AppError_1.default('리프레시 토큰이 없습니다.', 401, 'TOKEN_MISSING');
        const JWT_SECRET = process.env.JWT_SECRET;
        const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
        if (!JWT_SECRET || !REFRESH_SECRET) {
            throw new AppError_1.default('서버 설정 오류: 토큰 시크릿이 없습니다.', 500, 'CONFIG_ERROR');
        }
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(incomingRefreshToken, REFRESH_SECRET);
        }
        catch (e) {
            throw new AppError_1.default('리프레시 토큰이 만료되었거나 유효하지 않습니다.', 401, 'TOKEN_INVALID');
        }
        const dbToken = await auth_repository_1.default.findRefreshToken(payload.userId, incomingRefreshToken);
        if (!dbToken) {
            throw new AppError_1.default('유효하지 않은 리프레시 토큰입니다. (재로그인 필요)', 401, 'TOKEN_NOT_FOUND');
        }
        const newAccessToken = jsonwebtoken_1.default.sign({ userId: payload.userId }, JWT_SECRET, { expiresIn: '1h' });
        return { accessToken: newAccessToken };
    }
    // 로그아웃
    async logout(userId, deviceId) {
        if (userId) {
            await auth_repository_1.default.deleteRefreshToken(userId, deviceId);
        }
        return { message: '로그아웃 되었습니다.' };
    }
    // 비밀번호 재설정
    async resetPassword(email, code, newPassword) {
        const user = await user_repository_1.default.findByEmail(email);
        if (!user)
            throw new AppError_1.default('가입되지 않은 이메일입니다.', 404, 'USER_NOT_FOUND');
        const record = await auth_repository_1.default.findLatestVerification(email);
        if (!record || record.code !== code) {
            throw new AppError_1.default('인증번호가 올바르지 않습니다.', 400, 'VERIFICATION_FAILED');
        }
        if (new Date() > record.expiresAt) {
            throw new AppError_1.default('인증번호가 만료되었습니다.', 400, 'VERIFICATION_EXPIRED');
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, SALT_ROUNDS);
        await user_repository_1.default.updatePassword(user.id, hashedPassword);
        await auth_repository_1.default.deleteVerifications(email);
        return { message: '비밀번호가 성공적으로 변경되었습니다.' };
    }
}
exports.default = new AuthService();
