import prisma from '../../../libs/prisma';

// Types
type PeriodFilter = '1m' | '3m' | '6m' | '12m';
type ScheduleStatus = 'completed' | 'inProgress' | 'scheduled' | 'unassigned';

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
  acceptanceRate: number;
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

// Helper function to get date range from period
function getDateRangeFromPeriod(period: PeriodFilter): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // End of current month
  let start: Date;

  switch (period) {
    case '3m':
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      break;
    case '6m':
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      break;
    case '12m':
      start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      break;
    case '1m':
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  return { start, end };
}

class DashboardAdminService {
  /**
   * 교육 진행 현황 (도넛 차트)
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const assignedSchedules = await prisma.unitSchedule.findMany({
      where: {
        assignments: {
          some: { state: 'Accepted' },
        },
      },
    });

    let completed = 0;
    let inProgress = 0;
    let scheduled = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const schedule of assignedSchedules) {
      if (!schedule.date) continue;

      const scheduleDate = new Date(schedule.date);
      scheduleDate.setHours(0, 0, 0, 0);

      if (scheduleDate < today) {
        completed++;
      } else if (scheduleDate > today) {
        scheduled++;
      } else {
        inProgress++;
      }
    }

    const unassigned = await prisma.unitSchedule.count({
      where: {
        assignments: {
          none: { state: 'Accepted' },
        },
      },
    });

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let whereClause: any = {};

    if (status === 'unassigned') {
      whereClause = {
        assignments: { none: { state: 'Accepted' } },
      };
    } else {
      whereClause = {
        assignments: { some: { state: 'Accepted' } },
      };
    }

    const schedules = await prisma.unitSchedule.findMany({
      where: whereClause,
      include: {
        unit: true,
        assignments: {
          where: { state: 'Accepted' },
          include: { User: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    // Filter by status
    const filtered = schedules.filter((s) => {
      if (!s.date) return status === 'unassigned';
      const scheduleDate = new Date(s.date);
      scheduleDate.setHours(0, 0, 0, 0);

      if (status === 'completed') return scheduleDate < today;
      if (status === 'inProgress') return scheduleDate.getTime() === today.getTime();
      if (status === 'scheduled') return scheduleDate > today;
      return true; // unassigned already filtered by query
    });

    return filtered.map((s) => ({
      id: s.id,
      unitName: s.unit?.name || 'Unknown',
      date: s.date ? new Date(s.date).toISOString().split('T')[0] : '',
      instructorNames: s.assignments.map((a) => a.User?.name || 'Unknown'),
    }));
  }

  /**
   * 강사 분석 (기간 필터 지원)
   */
  async getInstructorAnalysis(period: PeriodFilter = '1m'): Promise<InstructorAnalysis[]> {
    const { start, end } = getDateRangeFromPeriod(period);

    const instructors = await prisma.user.findMany({
      where: {
        status: 'APPROVED',
        instructor: { isNot: null },
      },
      include: {
        instructor: {
          include: { team: true },
        },
        unitAssignments: {
          where: {
            UnitSchedule: {
              date: { gte: start, lte: end },
            },
          },
          include: {
            UnitSchedule: true,
          },
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return instructors.map((inst) => {
      const allAssignments = inst.unitAssignments;
      const accepted = allAssignments.filter((a) => a.state === 'Accepted');

      // Completed = Accepted AND schedule date < today
      const completed = accepted.filter((a) => {
        if (!a.UnitSchedule?.date) return false;
        const d = new Date(a.UnitSchedule.date);
        d.setHours(0, 0, 0, 0);
        return d < today;
      });

      return {
        id: inst.id,
        name: inst.name || 'Unknown',
        role: inst.instructor?.category || null,
        team: inst.instructor?.team?.name || null,
        completedCount: completed.length,
        acceptanceRate:
          allAssignments.length > 0
            ? Math.round((accepted.length / allAssignments.length) * 100)
            : 0,
        isActive: completed.length > 0,
      };
    });
  }

  /**
   * 팀 분석 (기간 필터 지원)
   */
  async getTeamAnalysis(period: PeriodFilter = '1m'): Promise<TeamAnalysis[]> {
    const { start, end } = getDateRangeFromPeriod(period);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const teams = await prisma.team.findMany({
      where: { deletedAt: null },
      include: {
        instructors: {
          include: {
            user: {
              include: {
                unitAssignments: {
                  where: {
                    state: 'Accepted',
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

    return teams.map((team) => {
      const members = team.instructors.map((i) => i.user);

      // Count completed assignments per member
      let totalCompleted = 0;
      let activeMembers = 0;

      members.forEach((user) => {
        const completed = user.unitAssignments.filter((a) => {
          if (!a.UnitSchedule?.date) return false;
          const d = new Date(a.UnitSchedule.date);
          d.setHours(0, 0, 0, 0);
          return d < today;
        }).length;

        totalCompleted += completed;
        if (completed > 0) activeMembers++;
      });

      return {
        id: team.id,
        teamName: team.name || 'Unnamed',
        memberCount: members.length,
        completedCount: totalCompleted,
        averageCompleted:
          members.length > 0 ? Math.round((totalCompleted / members.length) * 10) / 10 : 0,
        activeMemberRate:
          members.length > 0 ? Math.round((activeMembers / members.length) * 100) : 0,
      };
    });
  }

  /**
   * 팀 상세 정보 (모달용)
   */
  async getTeamDetail(teamId: number, period: PeriodFilter = '1m') {
    const { start, end } = getDateRangeFromPeriod(period);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

    const members = team.instructors.map((i) => {
      const completed = i.user.unitAssignments.filter((a) => {
        if (!a.UnitSchedule?.date) return false;
        const d = new Date(a.UnitSchedule.date);
        d.setHours(0, 0, 0, 0);
        return d < today;
      }).length;

      return {
        id: i.user.id,
        name: i.user.name || 'Unknown',
        role: i.category || null,
        completedCount: completed,
      };
    });

    const totalCompleted = members.reduce((sum, m) => sum + m.completedCount, 0);

    return {
      teamName: team.name,
      memberCount: members.length,
      totalCompleted,
      averageCompleted:
        members.length > 0 ? Math.round((totalCompleted / members.length) * 10) / 10 : 0,
      members,
    };
  }
}

export default new DashboardAdminService();
