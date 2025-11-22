// web/server/src/domains/instructor/repositories/instructor.repository.js
const prisma = require('../../../libs/prisma');

/**
 * [기존] 특정 기간의 근무 가능일 조회
 */
exports.findAvailabilities = async (instructorId, startDate, endDate) => {
  return await prisma.instructorAvailability.findMany({
    where: {
      instructorId: Number(instructorId),
      availableOn: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { availableOn: 'asc' },
  });
};

/**
 * [기존] 근무 가능일 일괄 업데이트 (덮어쓰기)
 */
exports.replaceAvailabilities = async (instructorId, startDate, endDate, newDates) => {
  return await prisma.$transaction(async (tx) => {
    // 1. 해당 기간의 기존 데이터 삭제
    await tx.instructorAvailability.deleteMany({
      where: {
        instructorId: Number(instructorId),
        availableOn: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 2. 새 날짜 데이터 생성
    if (newDates.length > 0) {
      await tx.instructorAvailability.createMany({
        data: newDates.map((date) => ({
          instructorId: Number(instructorId),
          availableOn: new Date(date),
        })),
      });
    }
  });
};

// ==========================================
// [신규] 배정(Assignment) 관련 메서드
// ==========================================

/**
 * [신규] 특정 기간 내 활성화된(Active) 배정 날짜 목록 조회
 * - 가능일 수정 시, 이미 배정된 날짜를 삭제하지 못하게 하기 위함
 */
exports.findActiveAssignmentsDate = async (instructorId, startDate, endDate) => {
  const assignments = await prisma.instructorUnitAssignment.findMany({
    where: {
      userId: Number(instructorId),
      state: 'Active', // 취소되지 않은 배정만
      UnitSchedule: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
    select: {
      UnitSchedule: {
        select: { date: true },
      },
    },
  });

  // 날짜 배열로 변환하여 반환
  return assignments.map((a) => a.UnitSchedule.date);
};

/**
 * [신규] 강사의 배정 목록 조회 (필터링 지원)
 * - 근무 이력 (past + confirmed)
 * - 배정 목록 (future + active)
 */
exports.findAssignments = async (instructorId, whereCondition) => {
  return await prisma.instructorUnitAssignment.findMany({
    where: {
      userId: Number(instructorId),
      ...whereCondition,
    },
    include: {
      UnitSchedule: {
        include: {
          unit: true, // 부대 정보
        },
      },
    },
    orderBy: {
      UnitSchedule: {
        date: 'asc',
      },
    },
  });
};

/**
 * [신규] 특정 배정 건 조회 (단건)
 * - 상세 조회 및 응답 처리용
 */
exports.findAssignmentByScheduleId = async (instructorId, unitScheduleId) => {
  return await prisma.instructorUnitAssignment.findUnique({
    where: {
      assignment_instructor_schedule_unique: {
        userId: Number(instructorId),
        unitScheduleId: Number(unitScheduleId),
      },
    },
    include: {
      UnitSchedule: {
        include: {
          unit: {
            include: {
              trainingLocations: true, // 교육장소 정보 (상세용)
            },
          },
        },
      },
    },
  });
};

/**
 * [신규] 배정 상태 업데이트 (수락/거절)
 */
exports.updateAssignment = async (instructorId, unitScheduleId, data) => {
  return await prisma.instructorUnitAssignment.update({
    where: {
      assignment_instructor_schedule_unique: {
        userId: Number(instructorId),
        unitScheduleId: Number(unitScheduleId),
      },
    },
    data,
  });
};


exports.findActiveInstructors = async () => {
  return prisma.instructor.findMany({
    where: {
      user: {
        role: 'INSTRUCTOR',
        status: 'APPROVED',
      }
    },
    include: {
      user: true,     // 필요 시 사용자 정보 포함
    }
  });
};