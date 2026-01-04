import prisma from '../../../libs/prisma';

interface DashboardStats {
  educationStatus: {
    completed: number;
    inProgress: number;
    scheduled: number;
    unassigned: number;
  };
}

interface InstructorAnalysis {
  id: number;
  name: string;
  role: string | null;
  team: string | null;
  requestCount: number;
  acceptedCount: number;
  acceptanceRate: number;
  isActive: boolean;
}

interface TeamAnalysis {
  teamName: string;
  memberCount: number;
  totalAssignments: number;
  averageAssignments: number;
  activeMemberRate: number;
}

class DashboardAdminService {
  /**
   * 교육 진행 현황 (상단 파이 차트)
   */
  async getDashboardStats(): Promise<DashboardStats> {
    // Total Scheduled (Assigned)
    const assignedSchedules = await prisma.unitSchedule.findMany({
      where: {
        assignments: {
          some: { state: 'Accepted' },
        },
      },
      include: {
        unit: true,
      },
    });

    let completed = 0;
    let inProgress = 0;
    let scheduled = 0;

    for (const schedule of assignedSchedules) {
      // Logic: compare schedule.date with today
      if (!schedule.date) continue;

      const scheduleDate = new Date(schedule.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      scheduleDate.setHours(0, 0, 0, 0);

      if (scheduleDate < today) {
        completed++;
      } else if (scheduleDate > today) {
        scheduled++;
      } else {
        inProgress++;
      }
    }

    // Unassigned
    const unassignedCount = await prisma.unitSchedule.count({
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
        unassigned: unassignedCount,
      },
    };
  }

  /**
   * 강사 분석 (활동률, 수락률 등)
   */
  async getInstructorAnalysis(year?: number, month?: number): Promise<InstructorAnalysis[]> {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth() + 1;

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59);

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
            // Note: unitAssignments is relation field in User model for InstructorUnitAssignment
            // CreatedAt is usually existing or we use Schedule date?
            // Model says: InstructorUnitAssignment
            // Assuming simplified check on proposal creation for now.
            // If createdAt is available:
            // createdAt: { gte: startOfMonth, lte: endOfMonth }
            // If not, we might need to rely on UnitSchedule date.
            // Let's assume UnitSchedule based for "Requests" in this month (Schedules in this month)
            UnitSchedule: {
              date: { gte: startOfMonth, lte: endOfMonth },
            },
          },
          include: {
            UnitSchedule: true, // needed for state check? No state is on Assignment
          },
        },
      },
    });

    // Active means "Has Accepted Assignment in this month"
    // The query above filters assignments by Schedule Date in this month.
    // So if any assignment in `unitAssignments` is 'Accepted', they are active.

    const analysis: InstructorAnalysis[] = [];

    for (const inst of instructors) {
      const proposals = inst.unitAssignments; // These are assignments for schedules in this month
      const accepted = proposals.filter((p) => p.state === 'Accepted');

      analysis.push({
        id: inst.id,
        name: inst.name || 'Unknown',
        role: inst.instructor?.category || 'Unassigned',
        team: inst.instructor?.team?.name || 'Unassigned',
        requestCount: proposals.length,
        acceptedCount: accepted.length,
        acceptanceRate: proposals.length > 0 ? (accepted.length / proposals.length) * 100 : 0,
        isActive: accepted.length > 0,
      });
    }

    return analysis;
  }

  /**
   * 팀 분석
   */
  async getTeamAnalysis(): Promise<TeamAnalysis[]> {
    const teams = await prisma.team.findMany({
      include: {
        instructors: {
          include: {
            user: {
              include: {
                unitAssignments: {
                  where: { state: 'Accepted' },
                },
              },
            },
          },
        },
      },
    });

    return teams.map((team) => {
      const members = team.instructors.map((i) => i.user);
      const totalAssignments = members.reduce((sum, user) => sum + user.unitAssignments.length, 0);
      const activeMembers = members.filter((user) => user.unitAssignments.length > 0).length;

      return {
        teamName: team.name || 'Unnamed',
        memberCount: members.length,
        totalAssignments,
        averageAssignments:
          members.length > 0 ? Math.round((totalAssignments / members.length) * 10) / 10 : 0,
        activeMemberRate:
          members.length > 0 ? Math.round((activeMembers / members.length) * 100) : 0,
      };
    });
  }
}

export default new DashboardAdminService();
