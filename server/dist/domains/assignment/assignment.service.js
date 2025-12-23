"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/domains/assignment/assignment.service.ts
const assignment_repository_1 = __importDefault(require("./assignment.repository"));
const instructor_repository_1 = __importDefault(require("../instructor/instructor.repository"));
const AppError_1 = __importDefault(require("../../common/errors/AppError"));
const assignment_algorithm_1 = __importDefault(require("./assignment.algorithm"));
const assignment_dto_1 = __importDefault(require("./assignment.dto"));
/**
 * 강사 배정 비즈니스 로직 전담 Service
 */
class AssignmentService {
    /**
     * 배정 후보 데이터 조회 (Raw Data 반환)
     */
    async getAssignmentCandidatesRaw(startDate, endDate) {
        const unitsRaw = await assignment_repository_1.default.findScheduleCandidates(startDate, endDate);
        const instructorsRaw = await instructor_repository_1.default.findAvailableInPeriod(startDate, endDate);
        return { unitsRaw, instructorsRaw };
    }
    async createAutoAssignments(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new AppError_1.default('유효하지 않은 날짜 형식입니다.', 400, 'VALIDATION_ERROR');
        }
        if (start > end) {
            throw new AppError_1.default('시작일은 종료일보다 클 수 없습니다.', 400, 'VALIDATION_ERROR');
        }
        // 1) 데이터 준비
        const units = await assignment_repository_1.default.findScheduleCandidates(start, end);
        const instructors = await instructor_repository_1.default.findAvailableInPeriod(start.toISOString(), end.toISOString());
        if (!units || units.length === 0) {
            throw new AppError_1.default('해당 기간에 조회되는 부대 일정이 없습니다.', 404, 'NO_UNITS');
        }
        if (!instructors || instructors.length === 0) {
            throw new AppError_1.default('해당 기간에 배정 가능한 강사가 없습니다.', 404, 'NO_INSTRUCTORS');
        }
        // 2) 알고리즘 실행
        const matchResults = assignment_algorithm_1.default.execute(units, instructors);
        if (!matchResults || matchResults.length === 0) {
            throw new AppError_1.default('배정 가능한 매칭 결과가 없습니다.', 404, 'NO_MATCHES');
        }
        const summary = await assignment_repository_1.default.createAssignmentsBulk(matchResults);
        const updatedUnits = await assignment_repository_1.default.findScheduleCandidates(start, end);
        return {
            summary,
            data: assignment_dto_1.default.toHierarchicalResponse(updatedUnits),
        };
    }
    /**
     * 임시 배정 응답 (수락/거절)
     */
    async respondToAssignment(instructorId, unitScheduleId, response) {
        const assignment = await assignment_repository_1.default.findAssignmentByKey(instructorId, Number(unitScheduleId));
        if (!assignment) {
            throw new AppError_1.default('해당 배정 정보를 찾을 수 없습니다.', 404, 'NOT_FOUND');
        }
        if (assignment.state === 'Accepted') {
            throw new AppError_1.default('이미 확정된 배정입니다.', 409, 'ALREADY_CONFIRMED');
        }
        if (['Canceled', 'Rejected'].includes(assignment.state)) {
            throw new AppError_1.default('이미 취소되거나 거절된 배정입니다.', 409, 'ALREADY_CANCELED');
        }
        let newState;
        if (response === 'ACCEPT') {
            newState = 'Accepted';
        }
        else if (response === 'REJECT') {
            newState = 'Rejected';
        }
        else {
            throw new AppError_1.default('잘못된 응답입니다. (ACCEPT 또는 REJECT)', 400, 'VALIDATION_ERROR');
        }
        await assignment_repository_1.default.updateStatusByKey(instructorId, Number(unitScheduleId), newState);
        return {
            message: response === 'ACCEPT' ? '배정을 수락했습니다.' : '배정을 거절했습니다.',
        };
    }
    /**
     * 관리자 배정 취소
     */
    async cancelAssignment(userId, userRole, targetInstructorId, unitScheduleId) {
        const assignment = await assignment_repository_1.default.findAssignmentByKey(targetInstructorId, unitScheduleId);
        if (!assignment) {
            throw new AppError_1.default('배정 정보를 찾을 수 없습니다.', 404, 'ASSIGNMENT_NOT_FOUND');
        }
        const isOwner = Number(targetInstructorId) === Number(userId);
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER';
        if (!isAdmin && !isOwner) {
            throw new AppError_1.default('이 배정을 취소할 권한이 없습니다.', 403, 'FORBIDDEN');
        }
        return await assignment_repository_1.default.updateStatusByKey(targetInstructorId, unitScheduleId, 'Canceled');
    }
    /**
     * 근무 이력 조회 (Confirmed + Past)
     */
    async getWorkHistory(instructorId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return await assignment_repository_1.default.findAllByInstructorId(instructorId, {
            state: 'Accepted',
            UnitSchedule: { date: { lt: today } },
        });
    }
    /**
     * 배정 목록 조회 (Active + Future)
     */
    async getUpcomingAssignments(instructorId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return await assignment_repository_1.default.findAllByInstructorId(instructorId, {
            state: { in: ['Pending', 'Accepted'] },
            UnitSchedule: { date: { gte: today } },
        });
    }
}
exports.default = new AssignmentService();
// CommonJS 호환
module.exports = new AssignmentService();
