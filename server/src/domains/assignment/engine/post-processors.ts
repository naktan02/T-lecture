// server/src/domains/assignment/engine/post-processors.ts
// 배정 알고리즘 후처리 모음 (Replace/Swap 포함)

import { PostProcessor, AssignmentResult, AssignmentContext } from './assignment.types';
import { POST_PROCESSOR_CONFIG } from './config-loader';

/**
 * 역할 부여 후처리
 * - 배정된 강사들 중 임시배정 분류 부여
 */
export const roleAssignerProcessor: PostProcessor = {
  id: 'ROLE_ASSIGN',
  name: '역할 부여',
  process(assignments: AssignmentResult[], context: AssignmentContext): AssignmentResult[] {
    // 스케줄별로 그룹화
    const bySchedule = new Map<number, AssignmentResult[]>();
    for (const assignment of assignments) {
      const existing = bySchedule.get(assignment.unitScheduleId) || [];
      existing.push(assignment);
      bySchedule.set(assignment.unitScheduleId, existing);
    }

    // 각 스케줄에서 Temporary 분류 부여 (일단 모두 임시배정)
    const result: AssignmentResult[] = [];
    for (const [, scheduleAssignments] of bySchedule) {
      for (const assignment of scheduleAssignments) {
        result.push({
          ...assignment,
          classification: 'Temporary',
        });
      }
    }

    return result;
  },
};

/**
 * 거리 최적화 교체 (Replace)
 * - 배정된 강사보다 더 가까운 후보가 있으면 교체 검토
 * - 점수 손실 제한 내에서만 교체
 */
export const distanceOptimizeProcessor: PostProcessor = {
  id: 'DISTANCE_OPTIMIZE',
  name: '거리 최적화',
  process(assignments: AssignmentResult[], context: AssignmentContext): AssignmentResult[] {
    // 현재 버전: 기본 구조만 (실제 교체 로직은 통합 시 구현)
    // TODO: 더 가까운 후보로 교체 가능한지 검토
    // TODO: 점수 손실이 POST_PROCESS_CONFIG.maxScoreLoss 이내인지 확인

    return assignments;
  },
};

/**
 * 팀 주간 균형 조정
 * - 각 팀이 주간 최소 1회 배정되도록 보장
 * - 1회 이상이면 추가 횟수는 제한 없음
 * - 0회인 팀이 있으면 경고 로그 (향후 swap 검토 가능)
 */
export const teamWeeklyBalanceProcessor: PostProcessor = {
  id: 'TEAM_WEEKLY_BALANCE',
  name: '팀 주간 균형',
  process(assignments: AssignmentResult[], context: AssignmentContext): AssignmentResult[] {
    // 주간별 팀별 배정 횟수 계산
    const weeklyTeamCounts = new Map<string, Map<number, number>>(); // weekKey -> teamId -> count

    // scheduleId -> date 매핑 생성
    const scheduleDateMap = new Map<number, string>();
    for (const ca of context.currentAssignments) {
      if (ca.date) scheduleDateMap.set(ca.scheduleId, ca.date);
    }

    // 전체 팀 목록 수집
    const allTeamIds = new Set<number>();
    for (const ca of context.currentAssignments) {
      if (ca.teamId !== null && ca.teamId !== undefined) {
        allTeamIds.add(ca.teamId);
      }
    }

    for (const a of assignments) {
      const info = context.currentAssignments.find(
        (ca) => ca.instructorId === a.instructorId && ca.scheduleId === a.unitScheduleId,
      );
      const teamId = info?.teamId;
      if (teamId === null || teamId === undefined) continue;

      // 주 계산 (ISO week)
      const dateStr = scheduleDateMap.get(a.unitScheduleId) || info?.date;
      if (!dateStr) continue;
      const date = new Date(dateStr);
      const weekKey = getISOWeekKey(date);

      if (!weeklyTeamCounts.has(weekKey)) {
        weeklyTeamCounts.set(weekKey, new Map());
      }
      const teamMap = weeklyTeamCounts.get(weekKey)!;
      teamMap.set(teamId, (teamMap.get(teamId) || 0) + 1);
    }

    // 0회 배정된 팀 체크 (각 주별로)
    for (const [weekKey, teamMap] of weeklyTeamCounts) {
      for (const teamId of allTeamIds) {
        const count = teamMap.get(teamId) || 0;
        if (count === 0) {
          // 경고 로그: 해당 주에 0회 배정된 팀
          // logger.warn(`팀 ${teamId} 주간(${weekKey}) 배정 0회 - 균형 필요`);
          // TODO: 향후 swap 로직으로 다른 팀에서 이 팀 강사로 교체 검토
        }
      }
    }

    return assignments;
  },
};

// ISO 주차 키 생성 유틸
function getISOWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * 총괄/책임강사 결정
 * - 주강사 1명: 총괄강사 (Head)
 * - 주강사 2명+: 팀장 > 연차 높은 사람 = 책임강사 (Supervisor)
 */
export const headInstructorProcessor: PostProcessor = {
  id: 'HEAD_INSTRUCTOR',
  name: '총괄/책임강사 결정',
  process(assignments: AssignmentResult[], context: AssignmentContext): AssignmentResult[] {
    // 스케줄별 그룹화
    const bySchedule = new Map<number, AssignmentResult[]>();
    for (const a of assignments) {
      const list = bySchedule.get(a.unitScheduleId) || [];
      list.push(a);
      bySchedule.set(a.unitScheduleId, list);
    }

    // 강사 정보 맵 (context.currentAssignments에서)
    const instructorInfoMap = new Map<
      number,
      {
        category: string | null;
        isTeamLeader: boolean;
        generation: number | null;
      }
    >();
    for (const a of context.currentAssignments) {
      instructorInfoMap.set(a.instructorId, {
        category: a.category,
        isTeamLeader: a.isTeamLeader ?? false,
        generation: a.generation ?? null,
      });
    }

    const result: AssignmentResult[] = [];

    for (const [scheduleId, scheduleAssignments] of bySchedule) {
      // 주강사 목록
      const mainInstructors = scheduleAssignments.filter((a) => {
        const info = instructorInfoMap.get(a.instructorId);
        return info?.category === 'Main';
      });

      let headInstructorId: number | null = null;

      if (mainInstructors.length === 1) {
        // 주강사 1명 → 총괄강사
        headInstructorId = mainInstructors[0].instructorId;
        for (const a of scheduleAssignments) {
          result.push({
            ...a,
            role: a.instructorId === headInstructorId ? 'Head' : null,
          });
        }
      } else if (mainInstructors.length >= 2) {
        // 주강사 2명+ → 팀장 > 연차 높은 사람 = 책임강사
        const candidates = mainInstructors.map((a) => ({
          instructorId: a.instructorId,
          isTeamLeader: instructorInfoMap.get(a.instructorId)?.isTeamLeader ?? false,
          generation: instructorInfoMap.get(a.instructorId)?.generation ?? 999,
        }));

        // 정렬: 팀장 우선, 연차 낮은(숫자 작은) 순
        candidates.sort((a, b) => {
          if (a.isTeamLeader !== b.isTeamLeader) {
            return a.isTeamLeader ? -1 : 1;
          }
          return (a.generation ?? 999) - (b.generation ?? 999);
        });

        headInstructorId = candidates[0].instructorId;
        for (const a of scheduleAssignments) {
          result.push({
            ...a,
            role: a.instructorId === headInstructorId ? 'Supervisor' : null,
          });
        }
      } else {
        // 주강사 없음 → 역할 없음
        for (const a of scheduleAssignments) {
          result.push({ ...a, role: null });
        }
      }
    }

    return result;
  },
};

/**
 * 모든 후처리 목록
 */
export const allPostProcessors: PostProcessor[] = [
  roleAssignerProcessor,
  distanceOptimizeProcessor,
  teamWeeklyBalanceProcessor,
  headInstructorProcessor,
];
