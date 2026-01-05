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

class DashboardService {
  /**
   * 유저(강사) 대시보드 통계 조회
   * @param userId 강사 ID
   * @param startDate (Optional) 조회 시작일 'YYYY-MM-DD'
   * @param endDate (Optional) 조회 종료일 'YYYY-MM-DD'
   */
  async getUserDashboardStats(
    userId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<DashboardStats> {
    const isCustomRange = !!(startDate && endDate);

    // --- 1. 통계 데이터 조회 (캐시 vs 실시간) ---
    let summaryStats = {
      totalWorkHours: 0,
      totalDistance: 0,
      totalWorkDays: 0,
      acceptedCount: 0,
      totalAssignmentsCount: 0,
    };

    let yearCount = 0;
    let monthCount = 0;

    if (!isCustomRange) {
      // 1-A. 기본: DB에 저장된 누적 통계 사용 (빠름)
      const cachedStats = await prisma.instructorStats.findUnique({
        where: { instructorId: userId },
      });

      if (cachedStats) {
        summaryStats = {
          totalWorkHours: cachedStats.totalWorkHours,
          totalDistance: cachedStats.totalDistance,
          totalWorkDays: cachedStats.totalWorkDays,
          acceptedCount: cachedStats.acceptedCount,
          totalAssignmentsCount: cachedStats.totalAssignmentsCount,
        };
      } else {
        // 캐시 없으면 실시간 계산 (fallback)
        // 여기서는 그냥 0으로 두거나, 필요시 즉시 계산 로직을 호출할 수도 있음.
        // 배치 잡이 돌기 전이라도 신규 가입자는 0이 맞음.
      }

      // 올해/이번달 건수는 별도 조회 (UTC 기준)
      // "올해" 기준을 "최근 1년" (이번 달 포함 12개월)으로 변경
      const now = new Date();
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
    } else {
      // 1-B. 커스텀 기간: UTC 자정 기준 필터링 (완료된 교육만)
      const start = new Date(`${startDate!}T00:00:00.000Z`);
      const end = new Date(`${endDate!}T23:59:59.999Z`);
      const today = getTodayUTC();

      // 종료일이 오늘 이후면 오늘 직전까지만 (완료된 교육만)
      const effectiveEnd = end < today ? end : new Date(today.getTime() - 1);

      const assignments = await prisma.instructorUnitAssignment.findMany({
        where: {
          userId,
          state: 'Accepted',
          UnitSchedule: {
            date: { gte: start, lt: today }, // 완료된 교육만
          },
        },
        include: { UnitSchedule: { include: { unit: true } } },
      });

      // 전체 제안 건수도 완료된 교육만 집계
      const periodTotalProposals = await prisma.instructorUnitAssignment.count({
        where: {
          userId,
          UnitSchedule: {
            date: { gte: start, lt: today }, // 완료된 교육만
          },
        },
      });

      summaryStats.totalAssignmentsCount = periodTotalProposals;
      summaryStats.acceptedCount = assignments.length;

      // 거리 정보 로드
      const distances = await prisma.instructorUnitDistance.findMany({ where: { userId } });
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

      const workedDates = new Set<string>();

      for (const assignment of assignments) {
        if (!assignment.UnitSchedule?.unit || !assignment.UnitSchedule.date) continue;
        const unit = assignment.UnitSchedule.unit;

        // 시간
        let workHours = 0;
        if (unit.workStartTime && unit.workEndTime) {
          const s = new Date(unit.workStartTime);
          const e = new Date(unit.workEndTime);
          let diff = e.getHours() * 60 + e.getMinutes() - (s.getHours() * 60 + s.getMinutes());
          if (diff < 0) diff += 24 * 60;
          workHours = diff / 60;
        }
        summaryStats.totalWorkHours += workHours;

        // 거리
        const dist = distanceMap.get(unit.id) || 0;
        summaryStats.totalDistance += dist * 2;

        workedDates.add(new Date(assignment.UnitSchedule.date).toDateString());
      }
      summaryStats.totalWorkDays = workedDates.size;
    }

    // --- 2. 월별 추이 & 최근 배정 ---
    // 기간 설정 시: 해당 기간의 월별 데이터 표시
    // 기본 모드: 최근 1년 (이번 달 포함 12개월)

    const now = new Date();
    const monthlyMap = new Map<string, { count: number; hours: number }>();

    let monthlyQueryStart: Date;
    let monthlyQueryEnd: Date;

    if (isCustomRange && startDate && endDate) {
      // 커스텀 기간: UTC 기준으로 기간 설정
      const rangeStart = new Date(`${startDate}T00:00:00.000Z`);
      const rangeEnd = new Date(`${endDate}T23:59:59.999Z`);
      monthlyQueryStart = rangeStart;
      monthlyQueryEnd = rangeEnd;

      // 시작 월부터 종료 월까지 초기화
      const current = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1));
      while (current <= rangeEnd) {
        const key = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(
          2,
          '0',
        )}`;
        monthlyMap.set(key, { count: 0, hours: 0 });
        current.setUTCMonth(current.getUTCMonth() + 1);
      }
    } else {
      // 기본 모드: 최근 1년 (이번 달 포함 12개월)
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth();

      // 시작일: 11개월 전 1일
      monthlyQueryStart = new Date(Date.UTC(currentYear, currentMonth - 11, 1, 0, 0, 0, 0));
      monthlyQueryEnd = now;

      // 맵 초기화
      const ptr = new Date(monthlyQueryStart);
      // 12개월치 버킷 생성
      for (let i = 0; i < 12; i++) {
        const key = `${ptr.getUTCFullYear()}-${String(ptr.getUTCMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, { count: 0, hours: 0 });
        ptr.setUTCMonth(ptr.getUTCMonth() + 1);
      }
    }

    // 월별 데이터 조회 (완료된 교육만)
    const today = getTodayUTC();
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
      include: { UnitSchedule: { include: { unit: true } } },
    });

    for (const act of recentActivity) {
      if (!act.UnitSchedule?.date) continue;
      const d = new Date(act.UnitSchedule.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (monthlyMap.has(key)) {
        const current = monthlyMap.get(key)!;
        let hours = 0;
        // 시간 계산 로직 중복... (함수로 분리하면 좋음)
        // 약식 계산
        if (act.UnitSchedule.unit?.workStartTime && act.UnitSchedule.unit?.workEndTime) {
          const s = new Date(act.UnitSchedule.unit.workStartTime);
          const e = new Date(act.UnitSchedule.unit.workEndTime);
          let diff = e.getHours() * 60 + e.getMinutes() - (s.getHours() * 60 + s.getMinutes());
          if (diff < 0) diff += 24 * 60;
          hours = diff / 60;
        }
        monthlyMap.set(key, { count: current.count + 1, hours: current.hours + hours });
      }
    }

    // 최근 배정 리스트 (기간 설정이 있으면 그 기간 내, 없으면 전체)
    const recentAssignmentsQuery: any = {
      where: {
        userId,
        state: 'Accepted',
        // 완료된(오늘 이전) 건만 조회
        UnitSchedule: {
          date: { lt: new Date() },
        },
      },
      include: {
        UnitSchedule: {
          include: {
            unit: true,
          },
        },
      },
      orderBy: {
        UnitSchedule: {
          date: 'desc',
        },
      },
      // 기본 모드: 전체 조회 (개인 강사는 데이터가 많지 않으므로)
      // take 제한 없음
    };

    if (isCustomRange) {
      // 커스텀 기간: UTC 자정 기준, 완료된 건만 (오늘 이전)
      const today = getTodayUTC();
      const rangeStart = new Date(`${startDate!}T00:00:00.000Z`);

      recentAssignmentsQuery.where.UnitSchedule.date = {
        gte: rangeStart,
        lt: today, // 완료된 것만
      };
      recentAssignmentsQuery.take = 50;
    }

    const recentAssignmentsRaw =
      await prisma.instructorUnitAssignment.findMany(recentAssignmentsQuery);

    // 거리 맵 (이미 로드 안했으면 로드)
    const distances = await prisma.instructorUnitDistance.findMany({ where: { userId } });
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

    const recentAssignments = recentAssignmentsRaw
      .map((assignment: any) => {
        const u = assignment.UnitSchedule?.unit;
        if (!u) return null;
        const dist = distanceMap.get(u.id) || 0;

        let wh = 0;
        if (u.workStartTime && u.workEndTime) {
          const s = new Date(u.workStartTime);
          const e = new Date(u.workEndTime);
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

    // 수락률 계산
    const acceptanceRate =
      summaryStats.totalAssignmentsCount > 0
        ? (summaryStats.acceptedCount / summaryStats.totalAssignmentsCount) * 100
        : 0;

    const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      count: data.count,
      hours: Math.round(data.hours * 10) / 10,
    }));

    return {
      summary: {
        totalWorkHours: Math.round(summaryStats.totalWorkHours * 10) / 10,
        totalDistance: Math.round(summaryStats.totalDistance),
        totalWorkDays: summaryStats.totalWorkDays,
        yearCount, // 기간 설정 시에는 의미가 퇴색되지만 일단 유지 (화면에서 안보여주거나 0처리 가능)
        monthCount,
      },
      performance: {
        acceptanceRate: Math.round(acceptanceRate * 10) / 10,
        totalProposals: summaryStats.totalAssignmentsCount,
        acceptedCount: summaryStats.acceptedCount,
      },
      monthlyTrend,
      recentAssignments,
    };
  }
}

export default new DashboardService();
