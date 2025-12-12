//server/src/domains/user/services/admin.service.js
const adminRepository = require('../../user/repositories/user.admin.repository');
const userRepository = require('../repositories/user.repository');

class AdminService {
    /**
     * [신규] 전체 유저 목록 조회 (검색/필터 포함)
     */
    async getAllUsers(query) {
    // query: { status, name }
    const filters = { ...query };

    // 🔹 별도로 status를 안 넘기면 기본은 APPROVED 만
    if (!filters.status) {
        filters.status = 'APPROVED';
    }

    const users = await adminRepository.findAll(filters);

    // 비밀번호 제외
    return users.map((user) => {
        const { password, ...rest } = user;
        return rest;
    });
    }

    /**
     * [기존] 승인 대기 유저 목록 조회
     * - findAll 메서드를 재사용하여 구현합니다.
     */
    async getPendingUsers() {
        const users = await adminRepository.findAll({ status: 'PENDING' });
        
        return users.map(user => {
        const { password, ...rest } = user;
        return rest;
        });
    }

    /**
     * [신규] 특정 유저 상세 조회
     * - UserRepository의 findById를 사용하여 상세 정보를 가져옵니다.
     */
    async getUserById(id) {
        const user = await userRepository.findById(id);
        if (!user) {
        throw new Error('해당 회원을 찾을 수 없습니다.');
        }

        const { password, ...rest } = user;
        return rest;
    }

    /**
     * [신규] 유저 정보 강제 수정 (관리자 권한)
     */
    async updateUser(id, dto) {
        const { name, phoneNumber, status, address, isTeamLeader } = dto;

        // 1. User 테이블 수정 데이터
        const userData = {};
        if (name !== undefined) userData.name = name;
        if (phoneNumber !== undefined) userData.userphoneNumber = phoneNumber;
        if (status !== undefined) userData.status = status;

        // 2. Instructor 테이블 수정 데이터 (주소 등)
        const instructorData = {};
        if (address !== undefined) {
            instructorData.location = address;
            // 주소 변경 시 좌표 초기화
            instructorData.lat = null;
            instructorData.lng = null;
        }
        if (typeof isTeamLeader === 'boolean') {
            instructorData.isTeamLeader = isTeamLeader;
        }
        // 3. 업데이트 실행 (User Repo 재사용)
        const updatedUser = await userRepository.update(id, userData, instructorData);
        
        const { password, ...rest } = updatedUser;
        return rest;
    }

    /**
     * [신규] 유저 삭제 (강제 탈퇴)
     * - UserRepository의 delete 메서드를 사용하여 일관성 유지
     */
    async deleteUser(id) {
        // 존재 여부 확인
        const user = await userRepository.findById(id);
        if (!user) {
        throw new Error('해당 회원을 찾을 수 없습니다.');
        }
        
        // 삭제 수행 (UserRepository 사용)
        await userRepository.delete(id);
        
        return { message: '회원이 삭제되었습니다.' };
    }

    /**
     * [기존] 유저 승인 처리
     */
    async approveUser(userId) {
        const updatedUser = await adminRepository.updateUserStatus(userId, 'APPROVED');

        const { password, ...rest } = updatedUser;

        return {
            message: '승인 처리가 완료되었습니다.',
            user: rest,
        };
    }

    /**
     * [기존] 유저 일괄 승인 처리
     */
    async approveUsersBulk(userIds) {
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('승인할 유저 ID 목록(배열)이 필요합니다.');
        }

        const result = await adminRepository.updateUsersStatusBulk(userIds, 'APPROVED');

        return {
        message: `${result.count}명의 유저가 승인되었습니다.`,
        count: result.count,
        };
    }

    /**
     * [기존] 유저 승인 거절
     * - 거절은 곧 데이터 삭제를 의미합니다.
     */
    async rejectUser(userId) {
        // 유저 상태 확인
        const user = await userRepository.findById(userId);
        if (!user) {
        throw new Error('사용자를 찾을 수 없습니다.');
        }
        if (user.status !== 'PENDING') {
        throw new Error('승인 대기 중인 사용자만 거절할 수 있습니다.');
        }

        // 삭제 수행
        await userRepository.delete(userId);

        return { message: '회원가입 요청을 거절하고 데이터를 삭제했습니다.' };
    }

    /**
     * [기존] 유저 일괄 거절
     */
    async rejectUsersBulk(userIds) {
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('거절할 유저 ID 목록(배열)이 필요합니다.');
        }

        const result = await adminRepository.deleteUsersBulk(userIds);

        return {
        message: `${result.count}명의 가입 요청을 거절(삭제)했습니다.`,
        count: result.count,
        };
    }

    async setAdminLevel(userId, level = 'GENERAL') {
        if (level === 'SUPER') {
            throw new Error('슈퍼 관리자로의 승급은 불가능합니다.');
        }
        if (level !== 'GENERAL') {
            throw new Error('잘못된 관리자 레벨입니다.');
        }

        // 존재 여부 확인
        const user = await userRepository.findById(userId);
        if (!user) throw new Error('해당 회원을 찾을 수 없습니다.');

        const admin = await adminRepository.upsertAdmin(userId, level);

        return {
        message: '관리자 권한이 설정되었습니다.',
        userId: userId,
        adminLevel: admin.level,
        };
    }

    // ✅ 관리자 권한 회수
    async revokeAdminLevel(userId) {
        const user = await userRepository.findById(userId);
        if (!user) throw new Error('해당 회원을 찾을 수 없습니다.');

        await adminRepository.removeAdmin(userId);

        return {
        message: '관리자 권한이 해제되었습니다.',
        userId,
        };
    }
}







module.exports = new AdminService();
