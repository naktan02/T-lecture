// server/src/domains/dashboard/dashboard.service.ts
import prisma from '../../libs/prisma';

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

      // 올해/이번달 건수는 별도 조회 (누적 통계에 없으므로)
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      yearCount = await prisma.instructorUnitAssignment.count({
        where: { userId, state: 'Accepted', UnitSchedule: { date: { gte: startOfYear } } },
      });
      monthCount = await prisma.instructorUnitAssignment.count({
        where: { userId, state: 'Accepted', UnitSchedule: { date: { gte: startOfMonth } } },
      });
    } else {
      // 1-B. 커스텀 기간: 실시간 계산 (느림)
      const start = new Date(startDate!);
      const end = new Date(endDate!);
      // end 날짜의 23:59:59까지 포함하도록 설정
      end.setHours(23, 59, 59, 999);

      const assignments = await prisma.instructorUnitAssignment.findMany({
        where: {
          userId,
          state: 'Accepted',
          UnitSchedule: {
            date: { gte: start, lte: end },
          },
        },
        include: { UnitSchedule: { include: { unit: true } } },
      });

      // 전체 제안 건수도 해당 기간 내로 필터링해야 정확한 수락률이 나옴
      const periodTotalProposals = await prisma.instructorUnitAssignment.count({
        where: {
          userId,
          UnitSchedule: {
            date: { gte: start, lte: end },
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

    // --- 2. 월별 추이 & 최근 배정 (공통, 대신 날짜 필터링 주의) ---
    // 월별 추이는 "최근 6개월" 고정이 기본이나, 커스텀 기간일 때는?
    // 요구사항: "설정한 기간별... 통계 조회" -> 상단 요약 카드가 핵심.
    // 하단 차트나 리스트도 기간에 맞추는게 좋음.
    // 하지만 차트는 '월별 추이'이므로 기간이 짧으면 의미가 없음.
    // -> 차트는 그대로 두고, *리스트*는 기간 필터링을 적용하는 것이 자연스러움.

    // 월별 활동 집계 (최근 6개월 고정)
    const now = new Date();
    const monthlyMap = new Map<string, { count: number; hours: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, { count: 0, hours: 0 });
    }

    // 월별 데이터 조회 (최근 6개월, 완료된 건만)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const recentActivity = await prisma.instructorUnitAssignment.findMany({
      where: {
        userId,
        state: 'Accepted',
        UnitSchedule: {
          date: { gte: sixMonthsAgo, lt: new Date() }, // 오늘 이전
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

    // 최근 배정 리스트 (기간 설정이 있으면 그 기간 내, 없으면 최근 10건)
    const recentAssignmentsQuery: any = {
      where: {
        userId,
        state: 'Accepted',
        // 기본 모드일 때도 "완료된(오늘 이전)" 건만 보여줄 것인가?
        // 보통 대시보드 리스트는 '최근 활동 내역'이므로 완료된 건이 맞음.
        // 하지만 '예정된 배정'을 보여주는 컴포넌트가 별도로 있다면 완료된 건만.
        // 여기서는 '근무 내역 리스트'라고 했으므로 완료된 건.
        UnitSchedule: {
          date: { lt: new Date() }, // 기본적으로 완료된 건만
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
      take: 10,
    };

    if (isCustomRange) {
      // 커스텀 기간이면 날짜 필터 적용, 개수 제한 없이? UI상 페이징 없으니 일단 20개 등으로 제한하거나 전체
      // "상세 근무 리스트"라고 했으니 전체가 맞지만, 여기서는 요약 화면이므로 상위 N개만 보여주거나
      // 별도 API가 필요할 수 있음. 일단 20개로 늘려서 제공.
      recentAssignmentsQuery.where.UnitSchedule.date = {
        gte: new Date(startDate!),
        lte: new Date(new Date(endDate!).setHours(23, 59, 59, 999)),
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

    const recentAssignments = recentAssignmentsRaw.map((assignment) => {
      const u = assignment.UnitSchedule.unit;
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
        date: assignment.UnitSchedule.date
          ? new Date(assignment.UnitSchedule.date).toISOString().split('T')[0]
          : '',
        unitName: u.name || '',
        unitType: u.unitType,
        region: u.region,
        status: assignment.state,
        distance: Math.round(dist * 2),
        workHours: Math.round(wh * 10) / 10,
      };
    });

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
