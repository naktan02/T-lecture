// server/src/domains/user/services/user.me.service.js
const userRepository = require('../repositories/user.repository');

class UserMeService {
    /**
     * 내 프로필 조회 (관리자 포함 모든 유저 공용)
     */
    async getMyProfile(userId) {
        const user = await userRepository.findById(userId);
        if (!user) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
        }

        // 비밀번호 등 민감정보 제외하고 반환
        const { password, ...profile } = user;
        return profile;
    }

    /**
     * 내 프로필 수정
     * - 일반 유저: 이름, 전화번호 수정 가능
     * - 강사: 주소(location)도 수정 가능
     */
    async updateMyProfile(userId, dto) {
        const { name, phoneNumber, address } = dto;

        // 현재 유저 정보 조회 (강사 여부 확인용)
        const user = await userRepository.findById(userId);
        if (!user) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
        }

        // 1. User 테이블 수정 데이터
        const userData = {};
        if (name !== undefined) userData.name = name;
        if (phoneNumber !== undefined) userData.userphoneNumber = phoneNumber;

        // 2. Instructor 테이블 수정 데이터 (강사인 경우에만)
        const instructorData = {};
        const isInstructor = !!user.instructor; // ★ 관계 기반으로 강사 여부 판단

        if (isInstructor && address !== undefined) {
        instructorData.location = address;
        // 주소 변경 시 거리 재계산이 필요하므로 일단 null로 초기화
        instructorData.lat = null;
        instructorData.lng = null;
        }

        // 3. 업데이트 실행
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
        throw new Error('사용자 정보를 찾을 수 없습니다.');
        }

        await userRepository.delete(userId);

        return { message: '회원 탈퇴가 완료되었습니다.' };
    }
}

module.exports = new UserMeService();
