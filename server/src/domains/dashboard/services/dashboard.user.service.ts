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

interface DashboardStats {
  summary: {
    totalWorkHours: number;
    totalDistance: number;
    totalWorkDays: number;
    yearCount: number;
    monthCount: number;
  };
  performance: {
    acceptanceRate: number;
    totalProposals: number;
    acceptedCount: number;
  };
  monthlyTrend: MonthlyActivity[];
  recentAssignments: Array<{
    id: number;
    date: string;
    unitName: string;
    unitType: string | null;
    region: string | null;
    status: string;
    distance: number;
    workHours: number;
  }>;
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

// Helper: 근무 시간 계산
function calculateWorkHours(unit: {
  workStartTime: Date | null;
  workEndTime: Date | null;
}): number {
  if (!unit.workStartTime || !unit.workEndTime) return 0;
  const s = new Date(unit.workStartTime);
  const e = new Date(unit.workEndTime);
  let diff = e.getHours() * 60 + e.getMinutes() - (s.getHours() * 60 + s.getMinutes());
  if (diff < 0) diff += 24 * 60;
  return diff / 60;
}

class DashboardService {
  /**
   * 유저(강사) 대시보드 통계 조회 (항상 실시간 계산)
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
    let queryStart: Date;
    if (isCustomRange) {
      queryStart = new Date(`${startDate}T00:00:00.000Z`);
    } else {
      queryStart = new Date('2020-01-01T00:00:00.000Z'); // 서비스 시작일
    }

    // 1. 수락된 배정 조회 (완료된 교육만)
    // 최적화: 필요한 필드만 select (Unit -> TrainingPeriod -> UnitSchedule)
    const assignments = await prisma.instructorUnitAssignment.findMany({
      where: {
        userId,
        state: 'Accepted',
        UnitSchedule: { date: { gte: queryStart, lt: today } },
      },
      select: {
        UnitSchedule: {
          select: {
            date: true,
            trainingPeriod: {
              select: {
                workStartTime: true,
                workEndTime: true,
                unit: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    // 2. 전체 제안 건수
    const totalProposals = await prisma.instructorUnitAssignment.count({
      where: {
        userId,
        UnitSchedule: { date: { gte: queryStart, lt: today } },
      },
    });

    // 3. 거리 맵 로드
    const distanceMap = await getDistanceMap(userId);

    // 4. 통계 계산
    let totalWorkHours = 0;
    let totalDistance = 0;
    const workedDates = new Set<string>();
    const countedUnitsForDistance = new Set<number>();

    for (const assignment of assignments) {
      const trainingPeriod = assignment.UnitSchedule?.trainingPeriod;
      if (!trainingPeriod?.unit || !assignment.UnitSchedule?.date) continue;
      const unit = trainingPeriod.unit;

      // 근무 시간 (workStartTime은 이제 trainingPeriod에)
      let workHours = 0;
      if (trainingPeriod.workStartTime && trainingPeriod.workEndTime) {
        const s = new Date(trainingPeriod.workStartTime);
        const e = new Date(trainingPeriod.workEndTime);
        let diff = e.getHours() * 60 + e.getMinutes() - (s.getHours() * 60 + s.getMinutes());
        if (diff < 0) diff += 24 * 60;
        workHours = diff / 60;
      }
      totalWorkHours += workHours;

      // 거리 (부대별 한 번만)
      if (!countedUnitsForDistance.has(unit.id)) {
        const dist = distanceMap.get(unit.id) || 0;
        totalDistance += dist * 2; // 왕복
        countedUnitsForDistance.add(unit.id);
      }

      workedDates.add(new Date(assignment.UnitSchedule.date).toDateString());
    }

    // 5. 올해/이번달 건수 (기본 모드에서만)
    let yearCount = 0;
    let monthCount = 0;

    if (!isCustomRange) {
      const startOfRollingYear = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1, 0, 0, 0, 0),
      );
      const startOfMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
      );

      yearCount = await prisma.instructorUnitAssignment.count({
        where: {
          userId,
          state: 'Accepted',
          UnitSchedule: { date: { gte: startOfRollingYear } },
        },
      });
      monthCount = await prisma.instructorUnitAssignment.count({
        where: {
          userId,
          state: 'Accepted',
          UnitSchedule: { date: { gte: startOfMonth } },
        },
      });
    }

    // 6. 월별 추이 계산
    const monthlyMap = new Map<string, { count: number; hours: number }>();

    // 월별 버킷 초기화
    let monthlyQueryStart: Date;
    if (isCustomRange) {
      monthlyQueryStart = new Date(`${startDate}T00:00:00.000Z`);
      const rangeEnd = new Date(`${endDate}T23:59:59.999Z`);
      const current = new Date(
        Date.UTC(monthlyQueryStart.getUTCFullYear(), monthlyQueryStart.getUTCMonth(), 1),
      );
      while (current <= rangeEnd) {
        const key = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, { count: 0, hours: 0 });
        current.setUTCMonth(current.getUTCMonth() + 1);
      }
    } else {
      monthlyQueryStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1, 0, 0, 0, 0),
      );
      const ptr = new Date(monthlyQueryStart);
      for (let i = 0; i < 12; i++) {
        const key = `${ptr.getUTCFullYear()}-${String(ptr.getUTCMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, { count: 0, hours: 0 });
        ptr.setUTCMonth(ptr.getUTCMonth() + 1);
      }
    }

    // 월별 데이터 조회 (완료된 교육만)

    const recentActivity = await prisma.instructorUnitAssignment.findMany({
      where: {
        userId,
        state: 'Accepted',
        UnitSchedule: {
          date: {
            gte: monthlyQueryStart,
            lt: today, // 완료된 교육만 (오늘 이전)
          },
        },
      },
      // NOTE: unit과 workStartTime은 이제 trainingPeriod에
      include: { UnitSchedule: { include: { trainingPeriod: { include: { unit: true } } } } },
    });

    for (const act of recentActivity) {
      if (!act.UnitSchedule?.date) continue;
      const d = new Date(act.UnitSchedule.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (monthlyMap.has(key)) {
        const current = monthlyMap.get(key)!;
        let hours = 0;
        // 시간 계산 - workStartTime은 이제 trainingPeriod에
        const tp = act.UnitSchedule.trainingPeriod;
        if (tp?.workStartTime && tp?.workEndTime) {
          const s = new Date(tp.workStartTime);
          const e = new Date(tp.workEndTime);
          let diff = e.getHours() * 60 + e.getMinutes() - (s.getHours() * 60 + s.getMinutes());
          if (diff < 0) diff += 24 * 60;
          hours = diff / 60;
        }
        monthlyMap.set(key, { count: current.count + 1, hours: current.hours + hours });
      }
    }

    // 7. 최근 배정 리스트 (5건)
    const recentAssignmentsQuery: any = {
      where: {
        userId,
        state: 'Accepted',
        UnitSchedule: { date: { lt: today } },
      },
      include: {
        UnitSchedule: {
          include: {
            // NOTE: unit과 workStartTime은 이제 trainingPeriod에
            trainingPeriod: { include: { unit: true } },
          },
        },
      },
      orderBy: {
        UnitSchedule: {
          date: 'desc',
        },
      },
      take: 5, // 요약용 5건만
    };

    if (isCustomRange) {
      // 커스텀 기간: UTC 자정 기준, 완료된 건만 (오늘 이전)
      const rangeStart = new Date(`${startDate!}T00:00:00.000Z`);

      recentAssignmentsQuery.where.UnitSchedule.date = {
        gte: rangeStart,
        lt: today, // 완료된 것만
      };
    }

    const recentAssignmentsRaw =
      await prisma.instructorUnitAssignment.findMany(recentAssignmentsQuery);

    // 거리 맵 (이미 로드됨)

    const recentAssignments = recentAssignmentsRaw
      .map((assignment: any) => {
        const tp = assignment.UnitSchedule?.trainingPeriod;
        const u = tp?.unit;
        if (!u) return null;
        const dist = distanceMap.get(u.id) || 0;

        // workStartTime은 이제 trainingPeriod에
        let wh = 0;
        if (tp?.workStartTime && tp?.workEndTime) {
          const s = new Date(tp.workStartTime);
          const e = new Date(tp.workEndTime);
          let diff = e.getHours() * 60 + e.getMinutes() - (s.getHours() * 60 + s.getMinutes());
          if (diff < 0) diff += 24 * 60;
          wh = diff / 60;
        }

        return {
          id: assignment.unitScheduleId,
          date: assignment.UnitSchedule?.date
            ? new Date(assignment.UnitSchedule.date).toISOString().split('T')[0]
            : '',
          unitName: u.name || '',
          unitType: u.unitType,
          region: u.region,
          status: assignment.state,
          distance: Math.round(dist * 2),
          workHours: Math.round(wh * 10) / 10,
        };
      })
      .filter(Boolean) as DashboardStats['recentAssignments'];

    // 8. 수락률 계산
    const acceptanceRate = totalProposals > 0 ? (assignments.length / totalProposals) * 100 : 0;

    const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      count: data.count,
      hours: Math.round(data.hours * 10) / 10,
    }));

    return {
      summary: {
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        totalDistance: Math.round(totalDistance),
        totalWorkDays: workedDates.size,
        yearCount,
        monthCount,
      },
      performance: {
        acceptanceRate: Math.round(acceptanceRate * 10) / 10,
        totalProposals,
        acceptedCount: assignments.length,
      },
      monthlyTrend,
      recentAssignments,
    };
  }

  /**
   * 유저(강사) 활동 내역 조회 (페이징)
   */
  async getUserActivities(
    userId: number,
    page: number,
    limit: number,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;
    const today = getTodayUTC();

    const whereClause: any = {
      userId,
      state: 'Accepted',
      UnitSchedule: { date: { lt: today } },
    };

    if (startDate && endDate) {
      const rangeStart = new Date(`${startDate}T00:00:00.000Z`);
      const rangeEnd = new Date(`${endDate}T23:59:59.999Z`);
      const effectiveEnd = rangeEnd < today ? rangeEnd : new Date(today.getTime() - 1);

      whereClause.UnitSchedule.date = {
        gte: rangeStart,
        lte: effectiveEnd,
      };
    }

    const [total, activities] = await Promise.all([
      prisma.instructorUnitAssignment.count({ where: whereClause }),
      prisma.instructorUnitAssignment.findMany({
        where: whereClause,
        include: {
          UnitSchedule: {
            include: {
              // NOTE: unit과 workStartTime은 이제 trainingPeriod에
              trainingPeriod: { include: { unit: true } },
            },
          },
        },
        orderBy: {
          UnitSchedule: {
            date: 'desc',
          },
        },
        skip,
        take: limit,
      }),
    ]);

    const distanceMap = await getDistanceMap(userId);

    const formattedActivities = activities
      .map((assignment: any) => {
        const tp = assignment.UnitSchedule?.trainingPeriod;
        const u = tp?.unit;
        if (!u) return null;
        const dist = distanceMap.get(u.id) || 0;

        // workStartTime은 이제 trainingPeriod에
        let wh = 0;
        if (tp?.workStartTime && tp?.workEndTime) {
          const s = new Date(tp.workStartTime);
          const e = new Date(tp.workEndTime);
          let diff = e.getHours() * 60 + e.getMinutes() - (s.getHours() * 60 + s.getMinutes());
          if (diff < 0) diff += 24 * 60;
          wh = diff / 60;
        }

        return {
          id: assignment.unitScheduleId,
          date: assignment.UnitSchedule?.date
            ? new Date(assignment.UnitSchedule.date).toISOString().split('T')[0]
            : '',
          unitName: u.name || '',
          unitType: u.unitType,
          region: u.region,
          status: assignment.state,
          distance: Math.round(dist * 2),
          workHours: Math.round(wh * 10) / 10,
        };
      })
      .filter(Boolean);

    return {
      activities: formattedActivities,
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
