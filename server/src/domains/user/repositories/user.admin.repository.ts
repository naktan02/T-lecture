// server/src/domains/user/repositories/user.admin.repository.ts
import prisma from '../../../libs/prisma';
import { AdminLevel, UserStatus, Prisma, UserCategory } from '../../../generated/prisma/client.js';

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
  excludeAdmins?: boolean; // 순수 관리자 제외 (유저 관리에서 사용)
  excludeSuperAdmins?: boolean; // 슈퍼 관리자 제외
}

class AdminRepository {
  // 전체 유저 목록 조회 (페이지네이션 지원)
  async findAll(
    filters: UserFilters = {},
    page = 1,
    limit = 20,
    sort?: { field: string; order: 'asc' | 'desc' },
  ) {
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
      excludeAdmins,
    } = filters;
    const excludeSuperAdmins = filters.excludeSuperAdmins;

    const where: Prisma.UserWhereInput = {};

    // ... (existing logic) ...

    if (status) {
      where.status = status;
    } else {
      // 명시적인 상태 필터(status)가 없을 때 기본적으로 INACTIVE 유저는 조회하지 않음.
      where.status = { not: UserStatus.INACTIVE };
    }

    if (name) {
      where.OR = [{ name: { contains: name } }, { userEmail: { contains: name } }];
    }

    // ✅ excludeAdmins가 true인 경우에만 순수 관리자(강사 아닌)는 제외
    // 강사+관리자인 경우는 강사로 표시되므로 포함
    if (excludeAdmins) {
      // 순수 관리자 제외: admin이 있으면서 instructor가 없는 유저 제외
      // 조건: admin이 null 이거나 instructor가 있어야 함
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [{ admin: null }, { instructor: { isNot: null } }],
        },
      ];
    }

    // 슈퍼 관리자 제외 (SUPER level 관리자 숨김)
    if (excludeSuperAdmins) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [{ admin: null }, { admin: { level: { not: 'SUPER' } } }],
        },
      ];
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

    // 정보 입력 미완료 강사 필터 (기본정보 누락 또는 기수 미배정)
    if (profileIncomplete) {
      instructorConditions.OR = [{ profileCompleted: false }, { generation: null }];
      hasInstructorFilter = true;
    }

    // 근무 가능일 기간 필터
    if (availableFrom || availableTo) {
      // UTC 자정 기준으로 변환 (타임존 일관성)
      const fromDate = availableFrom ? new Date(`${availableFrom}T00:00:00.000Z`) : undefined;
      const toDate = availableTo ? new Date(`${availableTo}T23:59:59.999Z`) : undefined;

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

    // Sort Construction
    let orderBy: Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[] = {
      id: 'desc',
    };
    if (sort && sort.field) {
      const { field, order } = sort;
      if (field === 'name') orderBy = { name: order };
      else if (field === 'status') orderBy = { status: order };
      else if (field === 'phoneNumber') orderBy = { userphoneNumber: order };
      else if (field === 'email') orderBy = { userEmail: order };
      else if (field === 'createdAt') orderBy = { id: order };
      // Instructor related sort?? (complex)
      // Prisma supports relation sort? yes.
      // e.g. team name? category?
      else if (field === 'role' || field === 'category') {
        // Prioritize Admin (level), then Instructor (category)
        orderBy = [{ admin: { level: order } }, { instructor: { category: order } }];
      } else if (field === 'team') {
        orderBy = { instructor: { team: { name: order } } };
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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

  // 강사 근무 가능일 업데이트 (기존 삭제 후 재생성)
  async updateInstructorAvailabilities(instructorId: number, availabilities: string[]) {
    return await prisma.$transaction(async (tx) => {
      // 기존 근무 가능일 전체 삭제
      await tx.instructorAvailability.deleteMany({
        where: { instructorId },
      });

      // 새로운 근무 가능일 생성
      if (availabilities.length > 0) {
        await tx.instructorAvailability.createMany({
          data: availabilities.map((date) => ({
            instructorId,
            // UTC 자정 기준으로 저장
            availableOn: new Date(`${date}T00:00:00.000Z`),
          })),
        });
      }

      // 결과 반환 (생성된 목록 조회)
      return await tx.instructorAvailability.findMany({
        where: { instructorId },
        orderBy: { availableOn: 'asc' },
      });
    });
  }

  async updateInstructorAvailabilityMonths(
    instructorId: number,
    months: Array<{ year: number; month: number; dates: number[] }>,
  ) {
    return await prisma.$transaction(async (tx) => {
      for (const monthUpdate of months) {
        const yearStr = monthUpdate.year.toString();
        const monthStr = monthUpdate.month.toString().padStart(2, '0');
        const lastDay = new Date(monthUpdate.year, monthUpdate.month, 0).getDate();
        const lastDayStr = lastDay.toString().padStart(2, '0');

        await tx.instructorAvailability.deleteMany({
          where: {
            instructorId,
            availableOn: {
              gte: new Date(`${yearStr}-${monthStr}-01T00:00:00.000Z`),
              lte: new Date(`${yearStr}-${monthStr}-${lastDayStr}T00:00:00.000Z`),
            },
          },
        });

        if (monthUpdate.dates.length > 0) {
          await tx.instructorAvailability.createMany({
            data: monthUpdate.dates.map((day) => {
              const dayStr = day.toString().padStart(2, '0');
              return {
                instructorId,
                // UTC 자정 기준으로 저장
                availableOn: new Date(`${yearStr}-${monthStr}-${dayStr}T00:00:00.000Z`),
              };
            }),
          });
        }
      }

      return await tx.instructorAvailability.findMany({
        where: { instructorId },
        orderBy: { availableOn: 'asc' },
      });
    });
  }

  // 강사 역할 부여 (Instructor 레코드 생성)
  async createInstructor(userId: number | string) {
    return await prisma.instructor.create({
      data: {
        userId: Number(userId),
        profileCompleted: false,
      },
    });
  }

  // 강사 역할 회수 (Instructor 레코드 및 관련 데이터 삭제)
  async removeInstructor(userId: number | string) {
    const id = Number(userId);
    return await prisma.$transaction(async (tx) => {
      // 강사 관련 데이터 삭제
      await tx.instructorVirtue.deleteMany({ where: { instructorId: id } });
      await tx.instructorAvailability.deleteMany({ where: { instructorId: id } });
      await tx.instructorUnitDistance.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.instructorStats.deleteMany({ where: { instructorId: id } }).catch(() => {});
      await tx.instructorPriorityCredit.deleteMany({ where: { instructorId: id } }).catch(() => {});
      // Instructor 레코드 삭제
      return await tx.instructor.delete({ where: { userId: id } });
    });
  }

  // 강사 존재 여부 확인
  async findInstructor(userId: number | string) {
    return await prisma.instructor.findUnique({
      where: { userId: Number(userId) },
    });
  }

  // 활성 배정(Pending/Accepted) 존재 여부 확인
  async hasActiveAssignments(userId: number | string) {
    const count = await prisma.instructorUnitAssignment.count({
      where: {
        userId: Number(userId),
        state: { in: ['Pending', 'Accepted'] },
      },
    });
    return count > 0;
  }

  // 강사 좌표 업데이트 (승인 시 주소 → 좌표 변환 결과 저장)
  async updateInstructorCoords(userId: number | string, lat: number, lng: number) {
    return await prisma.instructor.update({
      where: { userId: Number(userId) },
      data: { lat, lng },
    });
  }
}

export default new AdminRepository();

// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = new AdminRepository();
