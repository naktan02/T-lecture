// server/src/domains/user/repositories/user.admin.repository.ts
import prisma from '../../../libs/prisma';
import { AdminLevel, UserStatus } from '@prisma/client';

interface UserFilters {
  status?: string;
  name?: string;
  onlyAdmins?: boolean;
  onlyInstructors?: boolean;
}

class AdminRepository {
  // 전체 유저 목록 조회
  async findAll(filters: UserFilters = {}) {
    const { status, name, onlyAdmins, onlyInstructors } = filters;

    const where: Record<string, any> = {};

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
  async updateUsersStatusBulk(ids: number[], status: UserStatus) {
    return await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
  }

  // 단일 유저 상태 변경
  async updateUserStatus(id: number | string, status: UserStatus) {
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
  async deleteUsersBulk(ids: (number | string)[]) {
    const userIds = ids.map(Number);

    return await prisma.$transaction(async (tx) => {
      await tx.instructorVirtue.deleteMany({
        where: { instructorId: { in: userIds } },
      });

      await tx.instructorAvailability.deleteMany({
        where: { instructorId: { in: userIds } },
      });

      await tx.instructorUnitDistance
        .deleteMany({
          where: { userId: { in: userIds } },
        })
        .catch(() => {});

      await tx.instructorStats
        .deleteMany({
          where: { instructorId: { in: userIds } },
        })
        .catch(() => {});

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
  async upsertAdmin(userId: number | string, level: AdminLevel) {
    return await prisma.admin.upsert({
      where: { userId: Number(userId) },
      update: { level },
      create: { userId: Number(userId), level },
    });
  }

  // 관리자 권한 회수
  async removeAdmin(userId: number | string) {
    return await prisma.admin.deleteMany({
      where: { userId: Number(userId) },
    });
  }
}

export default new AdminRepository();

// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = new AdminRepository();
