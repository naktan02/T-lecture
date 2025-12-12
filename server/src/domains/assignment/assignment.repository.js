// server/src/domains/assignment.repository.js
const prisma = require('../../libs/prisma');

/**
 * 강사 배정 관련 DB 접근 전담 Repository
 */
class AssignmentRepository {
    /**
     * [신규] 특정 기간 내 활성화된(Active) 배정 날짜 목록 조회
     * - 가능일 수정 시, 이미 배정된 날짜를 삭제하지 못하게 하기 위함
     */
    async findActiveAssignmentsDate(instructorId, startDate, endDate) {
        const assignments = await prisma.instructorUnitAssignment.findMany({
        where: {
            userId: Number(instructorId),
            state: 'Active', // 취소되지 않은 배정만
            UnitSchedule: {
            date: {
                gte: startDate,
                lte: endDate,
            },
            },
        },
        select: {
            UnitSchedule: {
            select: { date: true },
            },
        },
        });

        // 날짜 배열로 변환하여 반환
        return assignments.map((a) => a.UnitSchedule.date);
    }

    /**
     * [신규] 강사의 배정 목록 조회 (필터링 지원)
     * - 근무 이력 (past + confirmed)
     * - 배정 목록 (future + active)
     */
    async findAssignments(instructorId, whereCondition) {
        return await prisma.instructorUnitAssignment.findMany({
        where: {
            userId: Number(instructorId),
            ...whereCondition,
        },
        include: {
            UnitSchedule: {
            include: {
                unit: true, // 부대 정보
            },
            },
        },
        orderBy: {
            UnitSchedule: {
            date: 'asc',
            },
        },
        });
    }

    /**
     * [신규] 특정 배정 건 조회 (단건)
     * - 상세 조회 및 응답 처리용
     */
    async findAssignmentByScheduleId(instructorId, unitScheduleId) {
        return await prisma.instructorUnitAssignment.findUnique({
        where: {
            assignment_instructor_schedule_unique: {
            userId: Number(instructorId),
            unitScheduleId: Number(unitScheduleId),
            },
        },
        include: {
            UnitSchedule: {
            include: {
                unit: {
                include: {
                    trainingLocations: true, // 교육장소 정보 (상세용)
                },
                },
            },
            },
        },
        });
    }

    /**
     * [신규] 배정 상태 업데이트 (수락/거절 등)
     */
    async updateAssignment(instructorId, unitScheduleId, data) {
        return await prisma.instructorUnitAssignment.update({
        where: {
            assignment_instructor_schedule_unique: {
            userId: Number(instructorId),
            unitScheduleId: Number(unitScheduleId),
            },
        },
        data,
        });
    }
}

module.exports = new AssignmentRepository();
