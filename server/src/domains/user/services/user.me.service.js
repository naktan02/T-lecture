// server/src/domains/user/services/user.me.service.js
const userRepository = require('../repositories/user.repository');
const AppError = require('../../../common/errors/AppError');

class UserMeService {
    /**
     * 내 프로필 조회 (관리자 포함 모든 유저 공용)
     */
    async getMyProfile(userId) {
        const user = await userRepository.findById(userId);
        if (!user) {
        throw new AppError('사용자 정보를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
        }

        const { password, ...profile } = user;
        return profile;
    }

    /**
     * 내 프로필 수정
     * - 일반 유저: 이름, 전화번호 수정 가능
     * - 강사: 주소(location)도 수정 가능
     */
    async updateMyProfile(userId, dto) {
        // dto가 아예 없거나 객체가 아니면 방어
        if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
        throw new AppError('요청 바디 형식이 올바르지 않습니다.', 400, 'INVALID_BODY');
        }

        const { name, phoneNumber, address } = dto;

        // ✅ 1) 입력 타입 검증 (Prisma 500 방지)
        if (name !== undefined && name !== null && typeof name !== 'string') {
        throw new AppError('name은 문자열이어야 합니다.', 400, 'INVALID_NAME');
        }

        if (phoneNumber !== undefined && phoneNumber !== null && typeof phoneNumber !== 'string') {
        throw new AppError('phoneNumber는 문자열이어야 합니다.', 400, 'INVALID_PHONE_NUMBER');
        }

        if (address !== undefined && address !== null && typeof address !== 'string') {
        throw new AppError('address는 문자열이어야 합니다.', 400, 'INVALID_ADDRESS');
        }

        // ✅ 2) 업데이트 필드가 하나도 없으면 정책적으로 400 처리 (원하면 200 no-op도 가능)
        const hasAnyField =
        name !== undefined || phoneNumber !== undefined || address !== undefined;

        if (!hasAnyField) {
        throw new AppError('수정할 값이 없습니다.', 400, 'NO_UPDATE_FIELDS');
        }

        // 현재 유저 조회 (강사 여부 확인용)
        const user = await userRepository.findById(userId);
        if (!user) {
        throw new AppError('사용자 정보를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
        }

        // ✅ 3) User 테이블 수정 데이터 구성
        const userData = {};
        if (name !== undefined) userData.name = name;
        if (phoneNumber !== undefined) userData.userphoneNumber = phoneNumber;

        // ✅ 4) Instructor 테이블 수정 데이터 (강사인 경우만)
        const instructorData = {};
        const isInstructor = !!user.instructor;

        if (isInstructor && address !== undefined) {
        instructorData.location = address;
        instructorData.lat = null;
        instructorData.lng = null;
        }

        // 강사가 아닌데 address만 보내면 어떻게 할지 정책 선택:
        // - 무시(현재처럼) OR 400 에러
        if (!isInstructor && address !== undefined) {
        // 원하면 무시 대신 에러로 강제 가능
        // throw new AppError('강사만 주소를 수정할 수 있습니다.', 403, 'ADDRESS_FORBIDDEN');
        }

        const updatedUser = await userRepository.update(userId, userData, instructorData);

        const { password, ...result } = updatedUser;
        return result;
    }

    /**
     * 회원 탈퇴 (내 계정 삭제)
     */
    async withdraw(userId) {
        const user = await userRepository.findById(userId);
        if (!user) {
        throw new AppError('사용자 정보를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
        }

        await userRepository.delete(userId);

        return { message: '회원 탈퇴가 완료되었습니다.' };
    }
}
module.exports = new UserMeService();
