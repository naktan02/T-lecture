// server/src/domains/assignment/engine/post-processors.ts
// 배정 알고리즘 후처리 모음

import { PostProcessor, AssignmentResult, AssignmentContext } from './assignment.types';

/**
 * 역할 부여 후처리
 * - 배정된 강사들 중 총괄/책임강사 결정
 * - 우선순위: 팀장 > 연차 높은 순 > 주강사
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
 * 모든 후처리 목록
 */
export const allPostProcessors: PostProcessor[] = [roleAssignerProcessor];
