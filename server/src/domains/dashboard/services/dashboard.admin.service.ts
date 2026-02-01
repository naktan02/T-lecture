import prisma from '../../../libs/prisma';

// Types

type ScheduleStatus = 'completed' | 'inProgress' | 'scheduled' | 'unassigned';

// Helper: 오늘 UTC 자정 생성
function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

// Helper: Date를 UTC 자정으로 변환
function toUTCMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}

interface DashboardStats {
  educationStatus: {
    completed: number;
    inProgress: number;
    scheduled: number;
    unassigned: number;
    total: number;
  };
}

interface InstructorAnalysis {
  id: number;
  name: string;
  role: string | null;
  team: string | null;
  completedCount: number;
  rejectionRate: number;
  isActive: boolean;
}

interface TeamAnalysis {
  id: number;
  teamName: string;
  memberCount: number;
  completedCount: number;
  averageCompleted: number;
  activeMemberRate: number;
}

interface ScheduleListItem {
  id: number;
  unitName: string;
  date: string;
  instructorNames: string[];
}

interface UnitListItem {
  id: number;
  name: string;
  status: ScheduleStatus;
  scheduleCount: number;
  instructorCount: number;
  dateRange: string;
}

interface UnitDetail {
  id: number;
  name: string;
  status: ScheduleStatus;
  address: string | null;
  addressDetail: string | null;
  officerName: string | null;
  officerPhone: string | null;
  schedules: {
    id: number;
    date: string;
    instructors: { id: number; name: string }[];
  }[];
}

class DashboardAdminService {
  /**
   * 교육 진행 현황 (도넛 차트) - Raw SQL 집계 쿼리로 최적화
   * 기존: 모든 Unit 조회 → JS 메모리에서 상태 판별
   * 개선: DB에서 직접 집계 → 단일 쿼리로 결과 반환
   */
  async getDashboardStats(start?: Date, end?: Date): Promise<DashboardStats> {
    const today = getTodayUTC();

    // 기간 필터 (없으면 전체 기간)
    const startDate = start || new Date('2020-01-01');
    const endDate = end || new Date('2099-12-31');

    // Raw SQL로 Unit별 상태를 집계
    // CTE로 Unit별 배정된 스케줄의 첫째/마지막 날짜 계산 후 상태 판별
    // 테이블/컬럼명은 Prisma @@map에 정의된 한글명 사용
    const result = await prisma.$queryRaw<
      {
        completed: bigint;
        in_progress: bigint;
        scheduled: bigint;
        unassigned: bigint;
      }[]
    >`
      WITH unit_schedule_summary AS (
        SELECT 
          u.id as unit_id,
          MIN(CASE WHEN a."userId" IS NOT NULL THEN s."교육일" END) as first_assigned_date,
          MAX(CASE WHEN a."userId" IS NOT NULL THEN s."교육일" END) as last_assigned_date,
          COUNT(CASE WHEN a."userId" IS NOT NULL THEN 1 END) as assigned_count,
          COUNT(s.id) as total_schedule_count,
          BOOL_OR(s."교육일" = ${today}::date AND a."userId" IS NOT NULL) as has_today_assigned
        FROM "부대" u
        JOIN "교육기간" tp ON tp."부대id" = u.id
        JOIN "부대일정" s ON s."교육기간id" = tp.id
        LEFT JOIN "강사_부대_배정" a 
          ON a."unitScheduleId" = s.id 
          AND a."배정상태" = 'Accepted' 
          AND a."배치분류" = 'Confirmed'
        WHERE s."교육일" >= ${startDate}::date AND s."교육일" <= ${endDate}::date
        GROUP BY u.id
        HAVING COUNT(s.id) > 0
      )
      SELECT 
        COALESCE(SUM(CASE 
          WHEN assigned_count = 0 THEN 1 
          ELSE 0 
        END), 0) as unassigned,
        COALESCE(SUM(CASE 
          WHEN assigned_count > 0 AND last_assigned_date < ${today}::date THEN 1 
          ELSE 0 
        END), 0) as completed,
        COALESCE(SUM(CASE 
          WHEN assigned_count > 0 AND first_assigned_date > ${today}::date THEN 1 
          ELSE 0 
        END), 0) as scheduled,
        COALESCE(SUM(CASE 
          WHEN assigned_count > 0 
            AND first_assigned_date <= ${today}::date 
            AND last_assigned_date >= ${today}::date THEN 1 
          ELSE 0 
        END), 0) as in_progress
      FROM unit_schedule_summary
    `;

    // BigInt를 Number로 변환
    const stats = result[0] || {
      completed: BigInt(0),
      in_progress: BigInt(0),
      scheduled: BigInt(0),
      unassigned: BigInt(0),
    };

    const completed = Number(stats.completed);
    const inProgress = Number(stats.in_progress);
    const scheduled = Number(stats.scheduled);
    const unassigned = Number(stats.unassigned);

    return {
      educationStatus: {
        completed,
        inProgress,
        scheduled,
        unassigned,
        total: completed + inProgress + scheduled + unassigned,
      },
    };
  }

  /**
   * 상태별 교육 일정 목록 (모달용)
   */
  async getSchedulesByStatus(status: ScheduleStatus): Promise<ScheduleListItem[]> {
    const today = getTodayUTC();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

    let whereClause: any = {};

    // 1. Assignment status filter
    if (status === 'unassigned') {
      whereClause = {
        assignments: { none: { state: 'Accepted', classification: 'Confirmed' } },
      };
    } else {
      whereClause = {
        assignments: { some: { state: 'Accepted', classification: 'Confirmed' } },
      };
    }

    // 2. Date filter (moved from in-memory to DB)
    if (status === 'completed') {
      whereClause.date = { lt: today };
    } else if (status === 'inProgress') {
      whereClause.date = { gte: today, lt: tomorrow };
    } else if (status === 'scheduled') {
      whereClause.date = { gte: tomorrow };
    }
    // unassigned logic regarding dates?
    // Original code: if (!s.date) return status === 'unassigned';
    // If we want to include null dates only for unassigned?
    // The previous in-memory filter allowed any date for unassigned ("return true").
    // But it had `if (!s.date) return status === 'unassigned';` check at start of loop.
    // If status IS unassigned and date is null, it returns true (kept).
    // If status is NOT unassigned and date is null, it returns false (dropped).
    // So for 'completed'/'inProgress'/'scheduled', we implicitly require non-null date.
    // My date filters { lt: today } etc will implicitly exclude nulls.

    const schedules = await prisma.unitSchedule.findMany({
      where: whereClause,
      include: {
        // NOTE: unit은 이제 trainingPeriod를 통해 접근
        trainingPeriod: { include: { unit: true } },
        assignments: {
          where: { state: 'Accepted', classification: 'Confirmed' },
          include: { User: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    return schedules.map((s) => ({
      id: s.id,
      unitName: s.trainingPeriod?.unit?.name || 'Unknown',
      date: s.date ? new Date(s.date).toISOString().split('T')[0] : '',
      instructorNames: s.assignments.map((a) => a.User?.name || 'Unknown'),
    }));
  }

  /**
   * 강사 분석 (기간 필터 지원) - Raw SQL 최적화
   */
  async getInstructorAnalysis(start: Date, end: Date): Promise<InstructorAnalysis[]> {
    const today = getTodayUTC();

    // Raw SQL로 강사별 통계 집계
    const results = await prisma.$queryRaw<
      {
        id: number;
        name: string | null;
        role: string | null;
        team_name: string | null;
        total_assignments: bigint;
        accepted_count: bigint;
        rejected_count: bigint;
        completed_count: bigint;
      }[]
    >`
      SELECT 
        u.id,
        u.name,
        i."분류" as role,
        t."team_name" as team_name,
        COUNT(a."userId") as total_assignments,
        COUNT(CASE WHEN a."배정상태" = 'Accepted' THEN 1 END) as accepted_count,
        COUNT(CASE WHEN a."배정상태" = 'Rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN a."배정상태" = 'Accepted' AND s."교육일" < ${today}::date THEN 1 END) as completed_count
      FROM "user" u
      JOIN "강사" i ON i."user_id" = u.id
      LEFT JOIN "team" t ON t.id = i."team_id"
      LEFT JOIN "강사_부대_배정" a ON a."userId" = u.id
      LEFT JOIN "부대일정" s ON s.id = a."unitScheduleId"
        AND s."교육일" >= ${start}::date 
        AND s."교육일" <= ${end}::date
      WHERE u.status = 'APPROVED'
      GROUP BY u.id, u.name, i."분류", t."team_name"
      ORDER BY u.name
    `;

    return results.map((r) => ({
      id: r.id,
      name: r.name || 'Unknown',
      role: r.role,
      team: r.team_name,
      completedCount: Number(r.completed_count),
      rejectionRate:
        Number(r.total_assignments) > 0
          ? Math.round((Number(r.rejected_count) / Number(r.total_assignments)) * 100)
          : 0,
      isActive: Number(r.completed_count) > 0,
    }));
  }

  /**
   * 팀 분석 (기간 필터 지원) - Raw SQL 최적화
   */
  async getTeamAnalysis(start: Date, end: Date): Promise<TeamAnalysis[]> {
    const today = getTodayUTC();

    // Raw SQL로 팀별 통계 집계
    const results = await prisma.$queryRaw<
      {
        id: number;
        team_name: string | null;
        member_count: bigint;
        total_completed: bigint;
        active_members: bigint;
      }[]
    >`
      WITH member_stats AS (
        SELECT 
          i."team_id" as team_id,
          i."user_id" as user_id,
          COUNT(CASE WHEN a."배정상태" = 'Accepted' AND a."배치분류" = 'Confirmed' AND s."교육일" < ${today}::date THEN 1 END) as completed_count
        FROM "강사" i
        LEFT JOIN "강사_부대_배정" a ON a."userId" = i."user_id"
        LEFT JOIN "부대일정" s ON s.id = a."unitScheduleId"
          AND s."교육일" >= ${start}::date 
          AND s."교육일" <= ${end}::date
        WHERE i."team_id" IS NOT NULL
        GROUP BY i."team_id", i."user_id"
      )
      SELECT 
        t.id,
        t."team_name" as team_name,
        COUNT(DISTINCT ms.user_id) as member_count,
        COALESCE(SUM(ms.completed_count), 0) as total_completed,
        COUNT(DISTINCT CASE WHEN ms.completed_count > 0 THEN ms.user_id END) as active_members
      FROM "team" t
      LEFT JOIN member_stats ms ON ms.team_id = t.id
      WHERE t."deleted_at" IS NULL
      GROUP BY t.id, t."team_name"
      ORDER BY t."team_name"
    `;

    return results.map((r) => ({
      id: r.id,
      teamName: r.team_name || 'Unnamed',
      memberCount: Number(r.member_count),
      completedCount: Number(r.total_completed),
      averageCompleted:
        Number(r.member_count) > 0
          ? Math.round((Number(r.total_completed) / Number(r.member_count)) * 10) / 10
          : 0,
      activeMemberRate:
        Number(r.member_count) > 0
          ? Math.round((Number(r.active_members) / Number(r.member_count)) * 100)
          : 0,
    }));
  }

  /**
   * 팀 상세 정보 (모달용)
   */
  async getTeamDetail(teamId: number, start: Date, end: Date) {
    const today = getTodayUTC();

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        instructors: {
          include: {
            user: {
              include: {
                unitAssignments: {
                  where: {
                    state: 'Accepted',
                    classification: 'Confirmed',
                    UnitSchedule: {
                      date: { gte: start, lte: end },
                    },
                  },
                  include: { UnitSchedule: true },
                },
              },
            },
          },
        },
      },
    });

    if (!team) return null;

    // 개별 근무 횟수 합산 (중복 제거 없음)
    let totalCompleted = 0;

    const members = team.instructors.map((i) => {
      const completed = i.user.unitAssignments.filter((a) => {
        if (!a.UnitSchedule?.date) return false;
        const d = toUTCMidnight(new Date(a.UnitSchedule.date));
        return d < today;
      }).length;

      totalCompleted += completed;

      return {
        id: i.user.id,
        name: i.user.name || 'Unknown',
        role: i.category || null,
        completedCount: completed,
      };
    });

    return {
      teamName: team.name,
      memberCount: members.length,
      totalCompleted,
      averageCompleted:
        members.length > 0 ? Math.round((totalCompleted / members.length) * 10) / 10 : 0,
      members,
    };
  }

  /**
   * 상태별 부대 목록 (모달용) - 일정별이 아닌 부대별 그룹화
   */
  /**
   * 상태별 부대 목록 (모달용) - 일정별이 아닌 부대별 그룹화
   * 기간 필터 적용 및 쿼리 최적화
   */
  async getUnitsByStatus(
    status: ScheduleStatus,
    start?: Date,
    end?: Date,
  ): Promise<UnitListItem[]> {
    const today = getTodayUTC();
    const dateFilter = start && end ? { date: { gte: start, lte: end } } : undefined;

    // 최적화: 필요한 필드만 select
    const units = (await prisma.unit.findMany({
      select: {
        id: true,
        name: true,
        trainingPeriods: {
          select: {
            schedules: {
              where: dateFilter, // 기간 필터 적용
              select: {
                date: true,
                assignments: {
                  where: { state: 'Accepted', classification: 'Confirmed' },
                  select: { User: { select: { id: true } } }, // 강사 ID만 (카운트용)
                },
              },
            },
          },
        },
      },
    })) as any;

    const result: UnitListItem[] = [];

    for (const unit of units) {
      // 모든 trainingPeriods의 schedules를 평탄화
      const allSchedules = unit.trainingPeriods.flatMap((p) => p.schedules);
      if (allSchedules.length === 0) continue; // 기간 내 일정 없으면 제외

      // 배정이 있는 일정만 필터링
      const assignedSchedules = allSchedules.filter((s) => s.date && s.assignments.length > 0);
      const assignedScheduleDates = assignedSchedules.map((s) => toUTCMidnight(new Date(s.date!)));

      let unitStatus: ScheduleStatus;

      if (assignedScheduleDates.length === 0) {
        unitStatus = 'unassigned';
      } else {
        // 날짜 정렬
        assignedScheduleDates.sort((a, b) => a.getTime() - b.getTime());
        const firstDate = assignedScheduleDates[0];
        const lastDate = assignedScheduleDates[assignedScheduleDates.length - 1];

        // 오늘이 일정에 포함되는지 확인
        const todayIsScheduled = assignedScheduleDates.some((d) => d.getTime() === today.getTime());

        if (todayIsScheduled) {
          unitStatus = 'inProgress';
        } else if (lastDate < today) {
          unitStatus = 'completed';
        } else if (firstDate > today) {
          unitStatus = 'scheduled';
        } else {
          unitStatus = 'inProgress';
        }
      }

      // 요청한 상태와 일치하는 부대만 추가
      if (unitStatus !== status) continue;

      // 배정된 고유 강사 수 계산
      const instructorIds = new Set<number>();
      for (const schedule of assignedSchedules) {
        for (const assignment of schedule.assignments) {
          if (assignment.User?.id) {
            instructorIds.add(assignment.User.id);
          }
        }
      }

      // 날짜 범위 계산
      let dateRange = '-';
      if (assignedScheduleDates.length > 0) {
        const sortedDates = [...assignedScheduleDates].sort((a, b) => a.getTime() - b.getTime());
        const first = sortedDates[0].toISOString().split('T')[0];
        const last = sortedDates[sortedDates.length - 1].toISOString().split('T')[0];
        dateRange = first === last ? first : `${first} ~ ${last}`;
      }

      result.push({
        id: unit.id,
        name: unit.name || 'Unknown',
        status: unitStatus,
        scheduleCount: assignedSchedules.length,
        instructorCount: instructorIds.size,
        dateRange,
      });
    }

    // 이름순 정렬
    return result.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }

  /**
   * 부대 상세 정보 (모달용)
   */
  async getUnitDetail(unitId: number): Promise<UnitDetail | null> {
    const today = getTodayUTC();

    // 이제 trainingPeriods.schedules로 접근
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        trainingPeriods: {
          include: {
            schedules: {
              include: {
                assignments: {
                  where: { state: 'Accepted', classification: 'Confirmed' },
                  include: { User: true },
                },
              },
              orderBy: { date: 'asc' },
            },
          },
        },
      },
    });

    if (!unit) return null;

    // 모든 trainingPeriods의 schedules를 평탄화
    const allSchedules = unit.trainingPeriods.flatMap((p) => p.schedules);

    // 상태 판단 로직
    const assignedScheduleDates = allSchedules
      .filter((s) => s.date && s.assignments.length > 0)
      .map((s) => toUTCMidnight(new Date(s.date!)));

    let unitStatus: ScheduleStatus;

    if (assignedScheduleDates.length === 0) {
      unitStatus = 'unassigned';
    } else {
      assignedScheduleDates.sort((a, b) => a.getTime() - b.getTime());
      const firstDate = assignedScheduleDates[0];
      const lastDate = assignedScheduleDates[assignedScheduleDates.length - 1];
      const todayIsScheduled = assignedScheduleDates.some((d) => d.getTime() === today.getTime());

      if (todayIsScheduled) {
        unitStatus = 'inProgress';
      } else if (lastDate < today) {
        unitStatus = 'completed';
      } else if (firstDate > today) {
        unitStatus = 'scheduled';
      } else {
        unitStatus = 'inProgress';
      }
    }

    // 일정 정보 구성
    const schedules = allSchedules
      .filter((s) => s.date)
      .map((s) => ({
        id: s.id,
        date: new Date(s.date!).toISOString().split('T')[0],
        instructors: s.assignments.map((a) => ({
          id: a.User?.id || 0,
          name: a.User?.name || 'Unknown',
        })),
      }));

    // 첫 번째 trainingPeriod에서 officerName/Phone 가져오기
    const firstPeriod = unit.trainingPeriods[0];

    return {
      id: unit.id,
      name: unit.name || 'Unknown',
      status: unitStatus,
      address: unit.addressDetail,
      addressDetail: unit.detailAddress,
      officerName: firstPeriod?.officerName || null,
      officerPhone: firstPeriod?.officerPhone || null,
      schedules,
    };
  }
}

export default new DashboardAdminService();
