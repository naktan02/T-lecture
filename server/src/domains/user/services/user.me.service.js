//server/src/domains/user/services/user.me.service.js
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

        // 1. User 테이블 수정 데이터
        const userData = {};
        if (name) userData.name = name;
        if (phoneNumber) userData.userphoneNumber = phoneNumber;

        // 2. Instructor 테이블 수정 데이터 (강사인 경우)
        const instructorData = {};
        
        // 현재 유저 정보 조회하여 강사 여부 확인
        const user = await userRepository.findById(userId);
        
        if (user.role === 'INSTRUCTOR' && address) {
        instructorData.location = address;
        // 주소가 바뀌면 위도/경도(lat/lng)는 재계산이 필요하므로 null로 초기화
        instructorData.lat = null;
        instructorData.lng = null;
        }

        // 3. 업데이트 실행
        const updatedUser = await userRepository.update(userId, userData, instructorData);
        
        const { password, ...result } = updatedUser;
        return result;
    }

    /**
     * [신규] 회원 탈퇴 (내 계정 삭제)
     */
    async withdraw(userId) {
        // 존재 여부 확인
        const user = await userRepository.findById(userId);
        if (!user) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
        }

        // 삭제 수행 (UserRepository의 공통 delete 메서드 사용)
        await userRepository.delete(userId);

        return { message: '회원 탈퇴가 완료되었습니다.' };
    }
}

module.exports = new UserMeService();
