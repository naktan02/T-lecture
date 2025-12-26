// server/src/domains/user/repositories/user.admin.repository.ts
import prisma from '../../../libs/prisma';
import { AdminLevel, UserStatus, Prisma, UserCategory } from '@prisma/client';

interface UserFilters {
  status?: UserStatus;
  name?: string;
  onlyAdmins?: boolean;
  onlyInstructors?: boolean;
  onlyNormal?: boolean; // 예비강사 (일반 유저)
  teamId?: number;
  category?: UserCategory;
  availableFrom?: string; // YYYY-MM-DD 형식
  availableTo?: string; // YYYY-MM-DD 형식
  profileIncomplete?: boolean; // 정보 입력 미완료 강사
}

class AdminRepository {
  // 전체 유저 목록 조회 (페이지네이션 지원)
  async findAll(filters: UserFilters = {}, page = 1, limit = 20) {
    const {
      status,
      name,
      onlyAdmins,
      onlyInstructors,
      onlyNormal,
      teamId,
      category,
      availableFrom,
      availableTo,
      profileIncomplete,
    } = filters;

    const where: Prisma.UserWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (name) {
      where.OR = [{ name: { contains: name } }, { userEmail: { contains: name } }];
    }

    if (onlyAdmins) {
      where.admin = { isNot: null };
    }

    if (onlyNormal) {
      // 예비강사: instructor가 없는 유저 (admin도 아닌)
      where.instructor = null;
      where.admin = null;
    }

    // instructor 조건을 별도로 빌드 (강사 전용 필터들)
    const instructorConditions: Prisma.InstructorWhereInput = {};
    let hasInstructorFilter = false;

    // 팀 필터
    if (teamId) {
      instructorConditions.teamId = teamId;
      hasInstructorFilter = true;
    }

    // 카테고리 필터
    if (category) {
      instructorConditions.category = category;
      hasInstructorFilter = true;
    }

    // 정보 입력 미완료 강사 필터
    if (profileIncomplete) {
      instructorConditions.profileCompleted = false;
      hasInstructorFilter = true;
    }

    // 근무 가능일 기간 필터
    if (availableFrom || availableTo) {
      const fromDate = availableFrom ? new Date(availableFrom) : undefined;
      const toDate = availableTo ? new Date(availableTo) : undefined;

      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
      }

      const dateCondition: Prisma.DateTimeFilter = {};
      if (fromDate) dateCondition.gte = fromDate;
      if (toDate) dateCondition.lte = toDate;

      instructorConditions.availabilities = {
        some: {
          availableOn: dateCondition,
        },
      };
      hasInstructorFilter = true;
    }

    // 강사 필터 조건 적용
    // onlyNormal이 아니고 (onlyInstructors 또는 강사 관련 필터가 있을 때)
    if (!onlyNormal && (onlyInstructors || hasInstructorFilter)) {
      if (hasInstructorFilter) {
        // 강사 관련 필터가 있으면 해당 조건으로 필터링
        where.instructor = instructorConditions;
      } else {
        // onlyInstructors만 있으면 강사 존재 여부만 확인
        where.instructor = { isNot: null };
      }
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          instructor: {
            include: {
              team: true,
            },
          },
          admin: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit) || 1,
      },
    };
  }

  // 전체 유저 목록 조회 (페이지네이션 없음 - 기존 호환)
  async findAllWithoutPagination(filters: UserFilters = {}) {
    const { status, name, onlyAdmins, onlyInstructors } = filters;

    const where: Prisma.UserWhereInput = {};

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
