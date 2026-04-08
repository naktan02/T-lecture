// server/src/domains/dashboard/services/dashboard.user.service.ts
import prisma from '../../../libs/prisma';

// Helper: 오늘 UTC 자정 생성
function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

interface MonthlyActivity {
  month: string;
  count: number;
  hours: number;
}

// 활동 내역 일자 정보
interface ActivityDate {
  date: string;
  workHours: number;
}

// 활동 내역 (교육 기간 단위)
interface ActivityGroup {
  trainingPeriodId: number;
  unitName: string;
  unitType: string | null;
  region: string | null;
  trainingPeriodName: string;
  distance: number; // km, 왕복
  totalWorkHours: number;
  dates: ActivityDate[];
}

interface DashboardStats {
  summary: {
    totalWorkHours: number;
    totalDistance: number;
    totalWorkDays: number;
    periodCount: number; // 선택한 기간 내 완료된 교육 건수
  };
  performance: {
    rejectionRate: number;
    totalProposals: number;
    rejectedCount: number;
  };
  monthlyTrend: MonthlyActivity[];
  recentActivities: ActivityGroup[]; // 교육 기간 단위로 그룹화
}

// Helper: 거리 맵 생성
async function getDistanceMap(userId: number) {
  const distances = await prisma.instructorUnitDistance.findMany({ where: { userId } });
  return new Map(
    distances.map((d) => [
      d.unitId,
      d.distance
        ? typeof d.distance === 'object' && 'toNumber' in d.distance
          ? d.distance.toNumber()
          : Number(d.distance)
        : 0,
    ]),
  );
}

// Helper: 근무 시간 계산 (점심시간 제외)
function calculateWorkHoursWithLunch(trainingPeriod: {
  workStartTime: Date | null;
  workEndTime: Date | null;
  lunchStartTime: Date | null;
  lunchEndTime: Date | null;
}): number {
  if (!trainingPeriod.workStartTime || !trainingPeriod.workEndTime) return 0;

  const workStart = new Date(trainingPeriod.workStartTime);
  const workEnd = new Date(trainingPeriod.workEndTime);

  // 총 근무 시간 (분)
  let totalMinutes =
    workEnd.getHours() * 60 +
    workEnd.getMinutes() -
    (workStart.getHours() * 60 + workStart.getMinutes());
  if (totalMinutes < 0) totalMinutes += 24 * 60;

  // 점심시간 제외
  if (trainingPeriod.lunchStartTime && trainingPeriod.lunchEndTime) {
    const lunchStart = new Date(trainingPeriod.lunchStartTime);
    const lunchEnd = new Date(trainingPeriod.lunchEndTime);
    let lunchMinutes =
      lunchEnd.getHours() * 60 +
      lunchEnd.getMinutes() -
      (lunchStart.getHours() * 60 + lunchStart.getMinutes());
    if (lunchMinutes < 0) lunchMinutes += 24 * 60;
    totalMinutes -= lunchMinutes;
  }

  return Math.max(0, totalMinutes / 60);
}

class DashboardService {
  /**
   * 유저(강사) 대시보드 통계 조회 (항상 실시간 계산)
   * 최적화: 중복 쿼리 제거 + Promise.all로 병렬 실행
   */
  async getUserDashboardStats(
    userId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<DashboardStats> {
    const isCustomRange = !!(startDate && endDate);
    const now = new Date();
    const today = getTodayUTC();

    // 조회 기간 설정
    const queryStart = isCustomRange
      ? new Date(`${startDate}T00:00:00.000Z`)
      : new Date('2020-01-01T00:00:00.000Z');

    const queryEnd = isCustomRange
      ? new Date(`${endDate}T23:59:59.999Z`)
      : new Date('2099-12-31T23:59:59.999Z');

    // 월별 쿼리 시작 시점
    const monthlyQueryStart = isCustomRange
      ? new Date(`${startDate}T00:00:00.000Z`)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1, 0, 0, 0, 0));

    // ============================================
    // 최적화: 병렬 쿼리 실행
    // ============================================
    const [assignments, totalProposals, rejectedCount, distanceMap] = await Promise.all([
      // 1. 수락된 배정 조회 (완료된 교육 + 월별 데이터 통합)
      // 기존: 2개 쿼리 → 1개로 통합
      prisma.instructorUnitAssignment.findMany({
        where: {
          userId,
          state: 'Accepted',
          classification: 'Confirmed',
          UnitSchedule: { date: { gte: monthlyQueryStart, lt: today } },
        },
        select: {
          UnitSchedule: {
            select: {
              id: true,
              date: true,
              trainingPeriodId: true,
              trainingPeriod: {
                select: {
                  id: true,
                  name: true,
                  workStartTime: true,
                  workEndTime: true,
                  lunchStartTime: true,
                  lunchEndTime: true,
                  unit: {
                    select: { id: true, name: true, unitType: true, region: true },
                  },
                },
              },
            },
          },
        },
      }),

      // 2. 전체 제안 건수
      prisma.instructorUnitAssignment.count({
        where: {
          userId,
          UnitSchedule: { date: { gte: queryStart, lte: queryEnd } },
        },
      }),

      // 3. 거절된 배정 수
      prisma.instructorUnitAssignment.count({
        where: {
          userId,
          state: 'Rejected',
          UnitSchedule: { date: { gte: queryStart, lte: queryEnd } },
        },
      }),

      // 4. 거리 맵 로드
      getDistanceMap(userId),
    ]);

    // ============================================
    // 통계 계산 (queryStart 기준으로 필터링)
    // ============================================
    let totalWorkHours = 0;
    let totalDistance = 0;
    const workedDates = new Set<string>();
    const countedTrainingPeriodsForDistance = new Set<number>();

    // 교육 기간별 그룹화를 위한 맵
    const trainingPeriodMap = new Map<
      number,
      {
        unitName: string;
        unitType: string | null;
        region: string | null;
        trainingPeriodName: string;
        unitId: number;
        dates: { date: string; workHours: number }[];
        totalWorkHours: number;
      }
    >();

    // 월별 추이 맵 초기화
    const monthlyMap = new Map<string, { count: number; hours: number }>();
    if (isCustomRange) {
      const current = new Date(
        Date.UTC(monthlyQueryStart.getUTCFullYear(), monthlyQueryStart.getUTCMonth(), 1),
      );
      const rangeEnd = new Date(`${endDate}T23:59:59.999Z`);
      while (current <= rangeEnd) {
        const key = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, { count: 0, hours: 0 });
        current.setUTCMonth(current.getUTCMonth() + 1);
      }
    } else {
      const ptr = new Date(monthlyQueryStart);
      for (let i = 0; i < 12; i++) {
        const key = `${ptr.getUTCFullYear()}-${String(ptr.getUTCMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, { count: 0, hours: 0 });
        ptr.setUTCMonth(ptr.getUTCMonth() + 1);
      }
    }

    // queryStart 이후 데이터만 summary에 반영
    let periodCount = 0;

    for (const assignment of assignments) {
      const trainingPeriod = assignment.UnitSchedule?.trainingPeriod;
      if (!trainingPeriod?.unit || !assignment.UnitSchedule?.date) continue;

      const unit = trainingPeriod.unit;
      const trainingPeriodId = trainingPeriod.id;
      const scheduleDate = new Date(assignment.UnitSchedule.date);
      const dateStr = scheduleDate.toISOString().split('T')[0];

      // 근무 시간 (점심시간 제외)
      const workHours = calculateWorkHoursWithLunch(trainingPeriod);

      // 월별 추이 업데이트 (모든 데이터)
      const monthKey = `${scheduleDate.getFullYear()}-${String(scheduleDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap.has(monthKey)) {
        const current = monthlyMap.get(monthKey)!;
        monthlyMap.set(monthKey, { count: current.count + 1, hours: current.hours + workHours });
      }

      // queryStart 이후 데이터만 summary 통계에 반영
      if (scheduleDate >= queryStart) {
        totalWorkHours += workHours;
        periodCount++;

        // 거리 (교육 기간별 한 번만, m → km 변환)
        if (!countedTrainingPeriodsForDistance.has(trainingPeriodId)) {
          const dist = distanceMap.get(unit.id) || 0;
          totalDistance += (dist / 1000) * 2; // 왕복, km 단위
          countedTrainingPeriodsForDistance.add(trainingPeriodId);
        }

        workedDates.add(scheduleDate.toDateString());

        // 교육 기간별 그룹화
        if (!trainingPeriodMap.has(trainingPeriodId)) {
          trainingPeriodMap.set(trainingPeriodId, {
            unitName: unit.name || '',
            unitType: unit.unitType,
            region: unit.region,
            trainingPeriodName: trainingPeriod.name || '',
            unitId: unit.id,
            dates: [],
            totalWorkHours: 0,
          });
        }
        const group = trainingPeriodMap.get(trainingPeriodId)!;
        group.dates.push({ date: dateStr, workHours: Math.round(workHours * 10) / 10 });
        group.totalWorkHours += workHours;
      }
    }

    // 5. 최근 활동 리스트 (교육 기간 단위, 5개)
    const recentActivities: ActivityGroup[] = Array.from(trainingPeriodMap.entries())
      .map(([trainingPeriodId, group]) => {
        const dist = distanceMap.get(group.unitId) || 0;
        // 날짜 정렬 (최신순)
        group.dates.sort((a, b) => b.date.localeCompare(a.date));
        return {
          trainingPeriodId,
          unitName: group.unitName,
          unitType: group.unitType,
          region: group.region,
          trainingPeriodName: group.trainingPeriodName,
          distance: Math.round((dist / 1000) * 2 * 10) / 10, // 왕복, km 단위
          totalWorkHours: Math.round(group.totalWorkHours * 10) / 10,
          dates: group.dates,
        };
      })
      // 가장 최근 날짜 기준 정렬
      .sort((a, b) => {
        const aLatest = a.dates[0]?.date || '';
        const bLatest = b.dates[0]?.date || '';
        return bLatest.localeCompare(aLatest);
      })
      .slice(0, 5);

    // 8. 거절률 계산 (선택한 기간 내 전체 배정 기준)
    const rejectionRate = totalProposals > 0 ? (rejectedCount / totalProposals) * 100 : 0;

    const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      count: data.count,
      hours: Math.round(data.hours * 10) / 10,
    }));

    return {
      summary: {
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        totalDistance: Math.round(totalDistance * 10) / 10,
        totalWorkDays: workedDates.size,
        periodCount, // 선택한 기간 내 완료된 교육 건수
      },
      performance: {
        rejectionRate: Math.round(rejectionRate * 10) / 10,
        totalProposals,
        rejectedCount,
      },
      monthlyTrend,
      recentActivities,
    };
  }

  /**
   * 유저(강사) 활동 내역 조회 (페이징, 교육 기간 단위)
   */
  async getUserActivities(
    userId: number,
    page: number,
    limit: number,
    startDate?: string,
    endDate?: string,
  ) {
    const today = getTodayUTC();

    // 기간 설정
    let queryStart: Date;
    let queryEnd: Date;
    if (startDate && endDate) {
      queryStart = new Date(`${startDate}T00:00:00.000Z`);
      const rangeEnd = new Date(`${endDate}T23:59:59.999Z`);
      queryEnd = rangeEnd < today ? rangeEnd : new Date(today.getTime() - 1);
    } else {
      queryStart = new Date('2020-01-01T00:00:00.000Z');
      queryEnd = new Date(today.getTime() - 1);
    }

    // 교육 기간별로 그룹화된 데이터 조회
    const allAssignments = await prisma.instructorUnitAssignment.findMany({
      where: {
        userId,
        state: 'Accepted',
        classification: 'Confirmed',
        UnitSchedule: {
          date: {
            gte: queryStart,
            lte: queryEnd,
          },
        },
      },
      include: {
        UnitSchedule: {
          include: {
            trainingPeriod: { include: { unit: true } },
          },
        },
      },
      orderBy: {
        UnitSchedule: {
          date: 'desc',
        },
      },
    });

    const distanceMap = await getDistanceMap(userId);

    // 교육 기간별 그룹화
    const trainingPeriodMap = new Map<
      number,
      {
        unitName: string;
        unitType: string | null;
        region: string | null;
        trainingPeriodName: string;
        unitId: number;
        dates: { date: string; workHours: number }[];
        totalWorkHours: number;
        latestDate: string;
      }
    >();

    for (const assignment of allAssignments) {
      const tp = assignment.UnitSchedule?.trainingPeriod;
      const u = tp?.unit;
      if (!tp || !u || !assignment.UnitSchedule?.date) continue;

      const trainingPeriodId = tp.id;
      const dateStr = new Date(assignment.UnitSchedule.date).toISOString().split('T')[0];
      const workHours = calculateWorkHoursWithLunch(tp);

      if (!trainingPeriodMap.has(trainingPeriodId)) {
        trainingPeriodMap.set(trainingPeriodId, {
          unitName: u.name || '',
          unitType: u.unitType,
          region: u.region,
          trainingPeriodName: tp.name || '',
          unitId: u.id,
          dates: [],
          totalWorkHours: 0,
          latestDate: dateStr,
        });
      }
      const group = trainingPeriodMap.get(trainingPeriodId)!;
      group.dates.push({ date: dateStr, workHours: Math.round(workHours * 10) / 10 });
      group.totalWorkHours += workHours;
      if (dateStr > group.latestDate) {
        group.latestDate = dateStr;
      }
    }

    // 배열로 변환 후 정렬 및 페이징
    const allGroups = Array.from(trainingPeriodMap.entries())
      .map(([trainingPeriodId, group]) => {
        const dist = distanceMap.get(group.unitId) || 0;
        // 날짜 정렬 (최신순)
        group.dates.sort((a, b) => b.date.localeCompare(a.date));
        return {
          trainingPeriodId,
          unitName: group.unitName,
          unitType: group.unitType,
          region: group.region,
          trainingPeriodName: group.trainingPeriodName,
          distance: Math.round((dist / 1000) * 2 * 10) / 10, // 왕복, km 단위
          totalWorkHours: Math.round(group.totalWorkHours * 10) / 10,
          dates: group.dates,
          latestDate: group.latestDate,
        };
      })
      .sort((a, b) => b.latestDate.localeCompare(a.latestDate));

    const total = allGroups.length;
    const skip = (page - 1) * limit;
    const paginatedActivities = allGroups
      .slice(skip, skip + limit)
      .map(({ latestDate, ...rest }) => rest);

    return {
      activities: paginatedActivities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default new DashboardService();
