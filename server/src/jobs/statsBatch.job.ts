// server/src/jobs/statsBatch.job.ts
import cron from 'node-cron';
import prisma from '../libs/prisma';
import logger from '../config/logger';

/**
 * 매일 새벽 03:00에 실행되는 강사 통계 집계 배치
 * - 어제까지 완료된(Accepted + UnitSchedule.date < TODAY) 배정 건을 기준으로 통계를 재계산하여 DB에 저장
 */
// 로직 분리: 외부에서 호출 가능하도록 export
export const runStatsAggregation = async () => {
  logger.info('[StatsBatch] Starting daily instructor stats aggregation...');

  try {
    const instructors = await prisma.instructor.findMany({ select: { userId: true } });

    // 현재 날짜 (UTC 자정)
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
    );

    let updatedCount = 0;

    for (const { userId } of instructors) {
      // 1. 완료된 배정 건 조회 (어제까지의 Accepted 건)
      const acceptedAssignments = await prisma.instructorUnitAssignment.findMany({
        where: {
          userId,
          state: 'Accepted',
          UnitSchedule: {
            date: { lt: today }, // 오늘 이전 (어제까지)
          },
        },
        include: {
          UnitSchedule: {
            include: { trainingPeriod: { include: { unit: true } } },
          },
        },
      });

      // 2. 전체 제안 건수 조회 (어제까지의 데이터만)
      const totalAssignmentsCount = await prisma.instructorUnitAssignment.count({
        where: {
          userId,
          UnitSchedule: {
            date: { lt: today },
          },
        },
      });

      // 3. 거리 정보 맵
      const distances = await prisma.instructorUnitDistance.findMany({
        where: { userId },
      });
      const distanceMap = new Map(
        distances.map((d) => [
          d.unitId,
          d.distance
            ? typeof d.distance === 'object' && 'toNumber' in d.distance
              ? d.distance.toNumber()
              : Number(d.distance)
            : 0,
        ]),
      );

      // 4. 집계
      let totalWorkHours = 0;
      let totalDistance = 0;
      const workedDates = new Set<string>();

      for (const assignment of acceptedAssignments) {
        const trainingPeriod = assignment.UnitSchedule?.trainingPeriod;
        const unit = trainingPeriod?.unit;
        if (!unit || !assignment.UnitSchedule?.date) continue;

        const date = new Date(assignment.UnitSchedule.date);

        // 근무 시간 계산 (TrainingPeriod에서 가져옴)
        if (trainingPeriod?.workStartTime && trainingPeriod?.workEndTime) {
          const start = new Date(trainingPeriod.workStartTime);
          const end = new Date(trainingPeriod.workEndTime);
          const startMinutes = start.getHours() * 60 + start.getMinutes();
          const endMinutes = end.getHours() * 60 + end.getMinutes();
          let diffMinutes = endMinutes - startMinutes;
          if (diffMinutes < 0) diffMinutes += 24 * 60;
          totalWorkHours += diffMinutes / 60;
        }

        // 이동 거리 (왕복)
        const dist = distanceMap.get(unit.id) || 0;
        totalDistance += dist * 2;

        workedDates.add(date.toISOString().split('T')[0]);
      }

      // 5. DB 업데이트
      await prisma.instructorStats.upsert({
        where: { instructorId: userId },
        create: {
          instructorId: userId,
          totalWorkHours: Math.round(totalWorkHours * 10) / 10,
          totalDistance: Math.round(totalDistance),
          totalWorkDays: workedDates.size,
          acceptedCount: acceptedAssignments.length,
          totalAssignmentsCount,
          lastCalculatedAt: new Date(),
        },
        update: {
          totalWorkHours: Math.round(totalWorkHours * 10) / 10,
          totalDistance: Math.round(totalDistance),
          totalWorkDays: workedDates.size,
          acceptedCount: acceptedAssignments.length,
          totalAssignmentsCount,
          lastCalculatedAt: new Date(),
        },
      });

      updatedCount++;
    }

    logger.info(`[StatsBatch] Completed. Updated stats for ${updatedCount} instructors.`);
  } catch (error) {
    logger.error(`[StatsBatch] Failed: ${error}`);
  }
};

/**
 * 매일 새벽 01:00에 실행되는 강사 통계 집계 배치
 */
const job = cron.schedule('0 1 * * *', runStatsAggregation);

// 직접 실행 시 (npx tsx src/jobs/statsBatch.job.ts)
if (require.main === module) {
  runStatsAggregation()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export default job;
