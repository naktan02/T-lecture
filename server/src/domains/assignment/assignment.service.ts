// server/src/domains/assignment/assignment.service.ts
// Facade: 분리된 서비스들을 통합 export
// 컨트롤러에서 기존 import 경로 유지를 위해 facade 패턴 사용

import { assignmentQueryService } from './services/assignment-query.service';
import { assignmentCommandService } from './services/assignment-command.service';
import { assignmentResponseService } from './services/assignment-response.service';

/**
 * Assignment Service Facade
 * - 기존 컨트롤러 호환성 유지를 위한 통합 서비스
 * - 실제 로직은 분리된 서비스에서 처리
 */
class AssignmentService {
  // =============================================================================
  // Query Service Methods
  // =============================================================================

  getTraineesPerInstructor() {
    return assignmentQueryService.getTraineesPerInstructor();
  }

  getAssignmentCandidatesWithCache(startDate: string, endDate: string, userId: number) {
    return assignmentQueryService.getAssignmentCandidatesWithCache(startDate, endDate, userId);
  }

  getWorkHistory(instructorId: number) {
    return assignmentQueryService.getWorkHistory(instructorId);
  }

  getUpcomingAssignments(instructorId: number) {
    return assignmentQueryService.getUpcomingAssignments(instructorId);
  }

  getMyAssignments(userId: number) {
    return assignmentQueryService.getMyAssignments(userId);
  }

  // =============================================================================
  // Command Service Methods
  // =============================================================================

  createAutoAssignmentsByIds(scheduleIds: number[], instructorIds: number[]) {
    return assignmentCommandService.createAutoAssignmentsByIds(scheduleIds, instructorIds);
  }

  previewAutoAssignments(startDate: Date, endDate: Date, debugTopK = 0) {
    return assignmentCommandService.previewAutoAssignments(startDate, endDate, debugTopK);
  }

  bulkSaveAssignments(
    assignments: Array<{
      unitScheduleId: number;
      instructorId: number;
      trainingLocationId?: number | null;
    }>,
  ) {
    return assignmentCommandService.bulkSaveAssignments(assignments);
  }

  batchUpdateAssignments(changes: {
    add: Array<{ unitScheduleId: number; instructorId: number; trainingLocationId: number | null }>;
    remove: Array<{ unitScheduleId: number; instructorId: number }>;
    roleChanges?: Array<{
      unitId: number;
      instructorId: number;
      role: 'Head' | 'Supervisor' | null;
    }>;
    staffLockChanges?: Array<{
      unitId: number;
      isStaffLocked: boolean;
    }>;
  }) {
    return assignmentCommandService.batchUpdateAssignments(changes);
  }

  toggleStaffLock(unitId: number, isStaffLocked: boolean) {
    return assignmentCommandService.toggleStaffLock(unitId, isStaffLocked);
  }

  updateRoleForUnit(unitId: number, instructorId: number, role: 'Head' | 'Supervisor' | null) {
    return assignmentCommandService.updateRoleForUnit(unitId, instructorId, role);
  }

  // =============================================================================
  // Response Service Methods
  // =============================================================================

  respondToAssignment(instructorId: number, unitScheduleId: number | string, response: string) {
    return assignmentResponseService.respondToAssignment(instructorId, unitScheduleId, response);
  }

  cancelAssignment(
    userId: number,
    userRole: string,
    targetInstructorId: number,
    unitScheduleId: number,
  ) {
    return assignmentResponseService.cancelAssignment(
      userId,
      userRole,
      targetInstructorId,
      unitScheduleId,
    );
  }
}

export default new AssignmentService();

// CommonJS 호환
module.exports = new AssignmentService();
