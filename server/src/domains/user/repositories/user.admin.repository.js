// web/server/src/domains/user/repositories/admin.repository.js
const prisma = require('../../../libs/prisma');

class AdminRepository {

  //전체 유저 목록 조회
  async findAll(filters = {}) {
    const { status, name, onlyAdmins, onlyInstructors } = filters;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (name) {
      where.name = { contains: name };
    }

    if (onlyAdmins) {
      where.admin = { isNot: null };
    }
    if (onlyInstructors) {
      where.instructor = { isNot: null };
    }

    return await prisma.user.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        instructor: true,
        admin: true,
      },
    });
  }

  // 상태 일괄 변경 (승인/휴면 등)
  async updateUsersStatusBulk(ids, status) {
    return await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
  }

  // 단일 유저 상태 변경
  async updateUserStatus(id, status) {
    return await prisma.user.update({
      where: { id: Number(id) },
      data: { status },
      include: {
        instructor: true,
        admin: true,
      },
    });
  }

  // 유저 삭제 (강사 정보도 함께)
  async deleteUsersBulk(ids) {
    const userIds = ids.map(Number);

    return await prisma.$transaction(async (tx) => {
      await tx.instructorVirtue.deleteMany({
        where: { instructorId: { in: userIds } },
      });

      await tx.instructorAvailability.deleteMany({
        where: { instructorId: { in: userIds } },
      });

      await tx.instructorUnitDistance.deleteMany({
        where: { instructorId: { in: userIds } },
      }).catch(() => {});

      await tx.instructorStats.deleteMany({
        where: { instructorId: { in: userIds } },
      }).catch(() => {});

      await tx.instructor.deleteMany({
        where: { userId: { in: userIds } },
      });
      const result = await tx.user.deleteMany({
        where: { id: { in: userIds } },
      });

      return result;
    });
  }

  // 관리자 권한 부여/수정
  async upsertAdmin(userId, level) {
    return await prisma.admin.upsert({
      where: { userId: Number(userId) },
      update: { level },
      create: { userId: Number(userId), level },
    });
  }

  // 관리자 권한 회수
  async removeAdmin(userId) {
    return await prisma.admin.deleteMany({
      where: { userId: Number(userId) },
    });
  }
}

module.exports = new AdminRepository();
