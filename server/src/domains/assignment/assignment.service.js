// server/src/domains/assignment/assignment.service.js
const assignmentRepository = require('./assignment.repository');
const instructorRepository = require('../instructor/instructor.repository');
const AppError = require('../../common/errors/AppError');
const assignmentAlgorithm = require('./assignment.algorithm');
const assignmentDTO = require('./assignment.dto');
/**
 * 강사 배정 비즈니스 로직 전담 Service
 */
class AssignmentService {
    /**
     * 배정 후보 데이터 조회 (Raw Data 반환)
     * - DTO에서 UI 형태로 변환하도록 Raw만 반환
     */
    async getAssignmentCandidatesRaw(startDate, endDate) {
        const unitsRaw = await assignmentRepository.findScheduleCandidates(startDate, endDate);
        const instructorsRaw = await instructorRepository.findAvailableInPeriod(startDate, endDate);
        return { unitsRaw, instructorsRaw };
    }

    async createAutoAssignments(startDate, endDate) {
        // 🟢 0) 입력 검증 (문자열 -> Date 변환 및 유효성 체크)
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new AppError('유효하지 않은 날짜 형식입니다.', 400, 'VALIDATION_ERROR');
        }
        if (start > end) {
            throw new AppError('시작일은 종료일보다 클 수 없습니다.', 400, 'VALIDATION_ERROR');
        }

        // 1) 데이터 준비 (Repository 사용)
        const units = await assignmentRepository.findScheduleCandidates(start, end);
        const instructors = await instructorRepository.findAvailableInPeriod(start, end);

        // 데이터 존재 여부 검증
        if (!units || units.length === 0) {
            throw new AppError('해당 기간에 조회되는 부대 일정이 없습니다.', 404, 'NO_UNITS');
        }
        if (!instructors || instructors.length === 0) {
            throw new AppError('해당 기간에 배정 가능한 강사가 없습니다.', 404, 'NO_INSTRUCTORS');
        }

        // 2) 알고리즘 실행 (순수 로직)
        const matchResults = assignmentAlgorithm.execute(units, instructors);

        if (!matchResults || matchResults.length === 0) {
            throw new AppError('배정 가능한 매칭 결과가 없습니다.', 404, 'NO_MATCHES');
        }

        // 3) DB 저장 (Repository에 위임)
        // - 트랜잭션, 중복 처리 로직을 완전히 리포지토리로 분리했습니다.
        const summary = await assignmentRepository.createAssignmentsBulk(matchResults);

        // 4) 최신 데이터 재조회 (화면 갱신용)
        const updatedUnits = await assignmentRepository.findScheduleCandidates(start, end);

        // 5) 결과 반환
        return {
            summary,
            data: assignmentDTO.toHierarchicalResponse(updatedUnits),
        };
    }
    /**
     * 임시 배정 응답 (수락/거절)
     */
    async respondToAssignment(instructorId, unitScheduleId, response) {
        // 복합키로 조회
        const assignment = await assignmentRepository.findAssignmentByKey(instructorId, unitScheduleId);

        if (!assignment) {
            throw new AppError('해당 배정 정보를 찾을 수 없습니다.', 404, 'NOT_FOUND');
        }

        // [변경] 이미 처리된 상태인지 체크
        if (assignment.state === 'Accepted') {
            throw new AppError('이미 확정된 배정입니다.', 409, 'ALREADY_CONFIRMED');
        }
        if (['Canceled', 'Rejected'].includes(assignment.state)) {
            throw new AppError('이미 취소되거나 거절된 배정입니다.', 409, 'ALREADY_CANCELED');
        }

        let newState;
        // [변경] 응답에 따른 상태 결정
        if (response === 'ACCEPT') {
            newState = 'Accepted';
        } else if (response === 'REJECT') {
            newState = 'Rejected';
        } else {
            throw new AppError('잘못된 응답입니다. (ACCEPT 또는 REJECT)', 400, 'VALIDATION_ERROR');
        }

        // 상태 업데이트 실행
        await assignmentRepository.updateStatusByKey(instructorId, unitScheduleId, newState);

        return {
            message: response === 'ACCEPT' ? '배정을 수락했습니다.' : '배정을 거절했습니다.',
        };
    }

    /**
     * 관리자 배정 취소
     * - 관리자가 강제로 취소할 때 실행
     */
    async cancelAssignment(userId, userRole, targetInstructorId, unitScheduleId) {
        // 1. 배정 정보 조회
        const assignment = await assignmentRepository.findAssignmentByKey(targetInstructorId, unitScheduleId);
        
        if (!assignment) {
            const error = new Error('배정 정보를 찾을 수 없습니다.');
            error.status = 404;
            throw error;
        }

        // 2. 권한 체크 (관리자거나 본인)
        const isOwner = (Number(targetInstructorId) === Number(userId)); 
        const isAdmin = (userRole === 'ADMIN' || userRole === 'SUPER');

        if (!isAdmin && !isOwner) {
            const error = new Error('이 배정을 취소할 권한이 없습니다.');
            error.status = 403; 
            throw error;
        }

        // 3. 상태 업데이트 ('Canceled')
        return await assignmentRepository.updateStatusByKey(
            targetInstructorId, 
            unitScheduleId, 
            'Canceled'
        );
    }
    /**
     * 근무 이력 조회 (Confirmed + Past)
     */
    async getWorkHistory(instructorId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return await assignmentRepository.findAllByInstructorId(instructorId, {
            state: 'Accepted', // [변경] 확정된 것만 이력으로 인정
            UnitSchedule: { date: { lt: today } },
        });
    }

    /**
     * 배정 목록 조회 (Active + Future)
     */
    async getUpcomingAssignments(instructorId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return await assignmentRepository.findAllByInstructorId(instructorId, {
            state: { in: ['Pending', 'Accepted'] }, // [변경] 임시 배정과 확정 배정 모두 노출
            UnitSchedule: { date: { gte: today } },
        });
    }
}

module.exports = new AssignmentService();
