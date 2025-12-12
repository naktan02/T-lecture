// server/src/domains/instructor/repositories/instructor.repository.js
const prisma = require('../../libs/prisma');

class InstructorRepository {

  /** 특정 기간의 근무 가능일 조회 */
  async findAvailabilities(instructorId, startDate, endDate) {
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
  }

  /** 근무 가능일 일괄 업데이트 (덮어쓰기) */
  async replaceAvailabilities(instructorId, startDate, endDate, newDates) {
    return await prisma.$transaction(async (tx) => {
      // 기존 데이터 삭제
      await tx.instructorAvailability.deleteMany({
        where: {
          instructorId: Number(instructorId),
          availableOn: { gte: startDate, lte: endDate },
        },
      });

      // 새 데이터 생성
      if (newDates.length > 0) {
        await tx.instructorAvailability.createMany({
          data: newDates.map((date) => ({
            instructorId: Number(instructorId),
            availableOn: new Date(date),
          })),
        });
      }
    });
  }

  /** 승인된 강사 조회 */
  async findActiveInstructors() {
    return prisma.instructor.findMany({
      where: {
        user: {
          status: 'APPROVED',
        },
      },
      include: {
        user: true,
      }
    });
  }

  /** ⭐ 신규 추가: 강사 덕목(Virtue) 추가 */
  async addVirtues(instructorId, virtueIds) {
    if (!virtueIds || virtueIds.length === 0) return;

    await prisma.instructorVirtue.createMany({
      data: virtueIds.map((vId) => ({
        instructorId: Number(instructorId),
        virtueId: vId,
      })),
      skipDuplicates: true,
    });
  }
}

module.exports = new InstructorRepository();
