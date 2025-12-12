// server/src/domains/assignment/assignment.service.js
const assignmentRepository = require('./assignment.repository');

/**
 * 강사 배정 비즈니스 로직 전담 Service
 */
class AssignmentService {
    /**
     * 근무 이력 조회 (Confirmed + Past)
     */
    async getWorkHistory(instructorId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return await assignmentRepository.findAssignments(instructorId, {
        classification: 'Confirmed', // 확정된 건만
        state: 'Active',             // 취소되지 않은 건
        UnitSchedule: {
            date: {
            lt: today, // 과거 일정
            },
        },
        });
    }

    /**
     * 배정 목록 조회 (Upcoming: Active + Future)
     */
    async getUpcomingAssignments(instructorId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return await assignmentRepository.findAssignments(instructorId, {
        state: 'Active',
        UnitSchedule: {
            date: {
            gte: today, // 오늘 포함 미래
            },
        },
        });
    }

    /**
     * 임시 배정 응답 (수락/거절)
     */
    async respondToAssignment(instructorId, unitScheduleId, response) {
        // 1. 배정 건 존재 확인
        const assignment =
        await assignmentRepository.findAssignmentByScheduleId(
            instructorId,
            unitScheduleId,
        );

        if (!assignment) {
        throw new Error('해당 배정 정보를 찾을 수 없습니다.');
        }

        if (assignment.classification === 'Confirmed') {
        throw new Error('이미 확정된 배정입니다.');
        }
        if (assignment.state === 'Canceled') {
        throw new Error('이미 취소된 배정입니다.');
        }

        // 2. 응답 처리
        let updateData = {};
        if (response === 'ACCEPT') {
        updateData = { classification: 'Confirmed' };
        } else if (response === 'REJECT') {
        updateData = { state: 'Canceled' };
        } else {
        throw new Error('잘못된 응답입니다. (ACCEPT 또는 REJECT)');
        }

        await assignmentRepository.updateAssignment(
        instructorId,
        unitScheduleId,
        updateData,
        );

        return {
        message:
            response === 'ACCEPT'
            ? '배정을 수락했습니다.'
            : '배정을 거절했습니다.',
        };
    }

    /**
     * 확정 배정 상세 조회
     */
    async getAssignmentDetail(instructorId, unitScheduleId) {
        const assignment =
        await assignmentRepository.findAssignmentByScheduleId(
            instructorId,
            unitScheduleId,
        );

        if (!assignment) {
        throw new Error('배정 정보를 찾을 수 없습니다.');
        }

        // 확정된 일정만 상세 정보 노출
        if (
        assignment.classification !== 'Confirmed' ||
        assignment.state !== 'Active'
        ) {
        throw new Error(
            '확정된 배정 일정만 상세 정보를 조회할 수 있습니다.',
        );
        }

        return assignment;
    }
}

module.exports = new AssignmentService();
