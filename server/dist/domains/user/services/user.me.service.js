"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/domains/user/services/user.me.service.ts
const user_repository_1 = __importDefault(require("../repositories/user.repository"));
const AppError_1 = __importDefault(require("../../../common/errors/AppError"));
class UserMeService {
    // 내 프로필 조회 (관리자 포함 모든 유저 공용)
    async getMyProfile(userId) {
        const user = await user_repository_1.default.findById(userId);
        if (!user) {
            throw new AppError_1.default('사용자 정보를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
        }
        const { password, ...profile } = user;
        if (!profile.instructor) {
            delete profile.instructor;
        }
        return profile;
    }
    // 내 프로필 수정
    async updateMyProfile(userId, dto) {
        if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
            throw new AppError_1.default('요청 바디 형식이 올바르지 않습니다.', 400, 'INVALID_BODY');
        }
        const { name, phoneNumber, address } = dto;
        if (name !== undefined && name !== null && typeof name !== 'string') {
            throw new AppError_1.default('name은 문자열이어야 합니다.', 400, 'INVALID_NAME');
        }
        if (phoneNumber !== undefined && phoneNumber !== null && typeof phoneNumber !== 'string') {
            throw new AppError_1.default('phoneNumber는 문자열이어야 합니다.', 400, 'INVALID_PHONE_NUMBER');
        }
        if (address !== undefined && address !== null && typeof address !== 'string') {
            throw new AppError_1.default('address는 문자열이어야 합니다.', 400, 'INVALID_ADDRESS');
        }
        const hasAnyField = name !== undefined || phoneNumber !== undefined || address !== undefined;
        if (!hasAnyField) {
            throw new AppError_1.default('수정할 값이 없습니다.', 400, 'NO_UPDATE_FIELDS');
        }
        const user = await user_repository_1.default.findById(userId);
        if (!user) {
            throw new AppError_1.default('사용자 정보를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
        }
        const userData = {};
        if (name !== undefined)
            userData.name = name;
        if (phoneNumber !== undefined)
            userData.userphoneNumber = phoneNumber;
        const instructorData = {};
        const isInstructor = !!user.instructor;
        if (isInstructor && address !== undefined) {
            instructorData.location = address;
            instructorData.lat = null;
            instructorData.lng = null;
        }
        const updatedUser = await user_repository_1.default.update(userId, userData, instructorData);
        const { password, ...result } = updatedUser;
        if (!result.instructor) {
            delete result.instructor;
        }
        return result;
    }
    // 회원 탈퇴 (내 계정 삭제)
    async withdraw(userId) {
        const user = await user_repository_1.default.findById(userId);
        if (!user) {
            throw new AppError_1.default('사용자 정보를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
        }
        await user_repository_1.default.delete(userId);
        return { message: '회원 탈퇴가 완료되었습니다.' };
    }
}
exports.default = new UserMeService();
// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = new UserMeService();
