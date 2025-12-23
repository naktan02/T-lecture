"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/domains/user/services/user.admin.service.ts
const user_admin_repository_1 = __importDefault(require("../repositories/user.admin.repository"));
const user_repository_1 = __importDefault(require("../repositories/user.repository"));
const AppError_1 = __importDefault(require("../../../common/errors/AppError"));
const client_1 = require("@prisma/client");
const ALLOWED_USER_STATUS = ['PENDING', 'APPROVED', 'RESTING', 'INACTIVE'];
// 파서 boolean
function parseBool(v) {
    if (typeof v === 'boolean')
        return v;
    if (typeof v === 'string')
        return v.toLowerCase() === 'true';
    return false;
}
// 응답 객체에서 password와 admin 정보를 제거하고, 강사 정보는 남깁니다.
function mapUserForAdmin(user) {
    if (!user)
        return null;
    const { password, admin, instructor, ...rest } = user;
    if (instructor) {
        return { instructor, ...rest };
    }
    return rest;
}
// querystring을 repo가 이해하는 형태로 변환
function normalizeFilters(query = {}) {
    const filters = { ...query };
    if (!filters.status)
        filters.status = 'APPROVED';
    if (filters.status === 'ALL')
        delete filters.status;
    if (filters.name !== undefined && filters.name !== null && String(filters.name).trim() === '') {
        delete filters.name;
    }
    const role = (filters.role || '').toString().toUpperCase();
    if (role === 'ADMIN') {
        filters.onlyAdmins = true;
        delete filters.onlyInstructors;
    }
    else if (role === 'INSTRUCTOR') {
        filters.onlyInstructors = true;
        delete filters.onlyAdmins;
        if (filters.onlyAdmins !== undefined)
            filters.onlyAdmins = parseBool(filters.onlyAdmins);
        if (filters.onlyInstructors !== undefined)
            filters.onlyInstructors = parseBool(filters.onlyInstructors);
        delete filters.role;
        return filters;
    }
    return filters;
}
// dto 검증
function assertDtoObject(dto) {
    if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
        throw new AppError_1.default('요청 바디 형식이 올바르지 않습니다.', 400, 'INVALID_BODY');
    }
}
// dto 검증
function assertStringOrUndefined(value, fieldName) {
    if (value === undefined)
        return;
    if (value === null)
        return;
    if (typeof value !== 'string') {
        throw new AppError_1.default(`${fieldName}는 문자열이어야 합니다.`, 400, 'INVALID_INPUT');
    }
}
// dto 검증
function assertValidStatusOrUndefined(status) {
    if (status === undefined)
        return;
    if (typeof status !== 'string') {
        throw new AppError_1.default('status는 문자열이어야 합니다.', 400, 'INVALID_STATUS');
    }
    if (!ALLOWED_USER_STATUS.includes(status)) {
        throw new AppError_1.default(`유효하지 않은 status 입니다. allowed: ${ALLOWED_USER_STATUS.join(', ')}`, 400, 'INVALID_STATUS');
    }
}
class AdminService {
    // 모든 유저 조회
    async getAllUsers(query) {
        const filters = normalizeFilters(query);
        const users = await user_admin_repository_1.default.findAll(filters);
        return users.map(mapUserForAdmin);
    }
    // 승인 대기 유저 조회
    async getPendingUsers() {
        const users = await user_admin_repository_1.default.findAll({ status: 'PENDING' });
        return users.map(mapUserForAdmin);
    }
    // 단일 유저 조회
    async getUserById(id) {
        const user = await user_repository_1.default.findById(id);
        if (!user)
            throw new AppError_1.default('해당 회원을 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
        return mapUserForAdmin(user);
    }
    // 유저 수정
    async updateUser(id, dto) {
        assertDtoObject(dto);
        const { name, phoneNumber, status, address, isTeamLeader } = dto;
        assertStringOrUndefined(name, 'name');
        assertStringOrUndefined(phoneNumber, 'phoneNumber');
        assertStringOrUndefined(address, 'address');
        assertValidStatusOrUndefined(status);
        if (isTeamLeader !== undefined && typeof isTeamLeader !== 'boolean') {
            throw new AppError_1.default('isTeamLeader는 boolean이어야 합니다.', 400, 'INVALID_INPUT');
        }
        const hasAny = name !== undefined ||
            phoneNumber !== undefined ||
            status !== undefined ||
            address !== undefined ||
            isTeamLeader !== undefined;
        if (!hasAny) {
            throw new AppError_1.default('수정할 값이 없습니다.', 400, 'NO_UPDATE_FIELDS');
        }
        const user = await user_repository_1.default.findById(id);
        if (!user)
            throw new AppError_1.default('해당 회원을 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
        const userData = {};
        if (name !== undefined)
            userData.name = name;
        if (phoneNumber !== undefined)
            userData.userphoneNumber = phoneNumber;
        if (status !== undefined)
            userData.status = status;
        const instructorData = {};
        const isInstructor = !!user.instructor;
        if (isInstructor) {
            if (address !== undefined) {
                instructorData.location = address;
                instructorData.lat = null;
                instructorData.lng = null;
            }
            if (typeof isTeamLeader === 'boolean') {
                instructorData.isTeamLeader = isTeamLeader;
            }
        }
        const updatedUser = await user_repository_1.default.update(id, userData, instructorData);
        return mapUserForAdmin(updatedUser);
    }
    // 유저 삭제
    async deleteUser(id) {
        const user = await user_repository_1.default.findById(id);
        if (!user)
            throw new AppError_1.default('해당 회원을 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
        await user_repository_1.default.delete(id);
        return { message: '회원이 삭제되었습니다.' };
    }
    // 유저 승인
    async approveUser(userId) {
        const updatedUser = await user_admin_repository_1.default.updateUserStatus(userId, client_1.UserStatus.APPROVED);
        return {
            message: '승인 처리가 완료되었습니다.',
            user: mapUserForAdmin(updatedUser),
        };
    }
    // 유저 승인(일괄)
    async approveUsersBulk(userIds) {
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            throw new AppError_1.default('승인할 유저 ID 목록(배열)이 필요합니다.', 400, 'INVALID_INPUT');
        }
        const result = await user_admin_repository_1.default.updateUsersStatusBulk(userIds, client_1.UserStatus.APPROVED);
        return {
            message: `${result.count}명의 유저가 승인되었습니다.`,
            count: result.count,
        };
    }
    // 유저 거절
    async rejectUser(userId) {
        const user = await user_repository_1.default.findById(userId);
        if (!user)
            throw new AppError_1.default('사용자를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
        if (user.status !== 'PENDING') {
            throw new AppError_1.default('승인 대기 중인 사용자만 거절할 수 있습니다.', 400, 'INVALID_STATUS');
        }
        await user_repository_1.default.delete(userId);
        return { message: '회원가입 요청을 거절하고 데이터를 삭제했습니다.' };
    }
    // 유저 거절(일괄)
    async rejectUsersBulk(userIds) {
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            throw new AppError_1.default('거절할 유저 ID 목록(배열)이 필요합니다.', 400, 'INVALID_INPUT');
        }
        const result = await user_admin_repository_1.default.deleteUsersBulk(userIds);
        return {
            message: `${result.count}명의 가입 요청을 거절(삭제)했습니다.`,
            count: result.count,
        };
    }
    // 관리자 권한 부여/회수
    async setAdminLevel(userId, level = 'GENERAL') {
        const normalized = (level || 'GENERAL').toString().toUpperCase();
        if (!['GENERAL', 'SUPER'].includes(normalized)) {
            throw new AppError_1.default('잘못된 관리자 레벨입니다.', 400, 'INVALID_ADMIN_LEVEL');
        }
        const user = await user_repository_1.default.findById(userId);
        if (!user)
            throw new AppError_1.default('해당 회원을 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
        const admin = await user_admin_repository_1.default.upsertAdmin(userId, normalized);
        return {
            message: '관리자 권한이 설정되었습니다.',
            userId: Number(userId),
            adminLevel: admin.level,
        };
    }
    // 관리자 권한 회수
    async revokeAdminLevel(userId) {
        const user = await user_repository_1.default.findById(userId);
        if (!user)
            throw new AppError_1.default('해당 회원을 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
        await user_admin_repository_1.default.removeAdmin(userId);
        return {
            message: '관리자 권한이 해제되었습니다.',
            userId: Number(userId),
        };
    }
}
exports.default = new AdminService();
// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = new AdminService();
