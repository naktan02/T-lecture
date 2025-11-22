// web/server/src/domains/admin/repositories/admin.repository.js
const prisma = require('../../../libs/prisma');

class AdminRepository {
  /**
   * [신규] 전체 유저 목록 조회 (필터링 지원)
   * - 관리자용 목록 조회는 이곳에서 전담합니다.
   */
  async findAll(filters = {}) {
    const { role, status, name } = filters;
    
    // 동적 쿼리 생성
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (name) where.name = { contains: name }; // 이름 부분 검색

    return await prisma.user.findMany({
      where,
      orderBy: { id: 'desc' }, // 최신 가입순 정렬
      include: { instructor: true }, // 강사 여부 확인
    });
  }

  /**
   * [기존] 다중 유저 상태 일괄 업데이트
   * - 주로 '일괄 승인' 기능에 사용됩니다.
   */
  async updateUsersStatusBulk(ids, status) {
    return await prisma.user.updateMany({
      where: {
        id: { in: ids },
      },
      data: { status },
    });
  }

  /**
   * [기존] 단일 유저 상태 업데이트
   * - 주로 '단일 승인' 기능에 사용됩니다.
   */
  async updateUserStatus(id, status, role) {
    const data = { status };
    // 역할 변경이 요청된 경우 함께 업데이트
    if (role) {
      data.role = role;
    }

    return await prisma.user.update({
      where: { id: Number(id) },
      data,
    });
  }

  /**
   * [기존] 다중 유저 삭제 (일괄 거절용)
   * - 관리자 전용 기능이므로 AdminRepository에 유지합니다.
   */
  async deleteUsersBulk(ids) {
    return await prisma.$transaction(async (tx) => {
      // 1. 연관된 강사 데이터 삭제
      await tx.instructor.deleteMany({
        where: { userId: { in: ids } },
      });
      
      // 2. 유저 데이터 삭제
      const result = await tx.user.deleteMany({
        where: { id: { in: ids } },
      });
      
      return result;
    });
  }
}

module.exports = new AdminRepository();