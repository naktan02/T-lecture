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
    async findUnitsWithAssignments(startDate, endDate) {
        return await prisma.unit.findMany({
        where: {
            schedules: {
            some: {
                date: { gte: startDate, lte: endDate },
            },
            },
        },
        include: {
            trainingLocations: true, // 카드 UI 표현용
            schedules: {
            where: {
                date: { gte: startDate, lte: endDate },
            },
            orderBy: { date: 'asc' },
            include: {
                assignments: {
                where: { state: 'Active' }, // 유효한 배정만
                include: {
                    User: {
                    include: {
                        instructor: {
                        include: {
                            team: true, // 강사 팀 정보까지 필요
                        },
                        },
                    },
                    },
                },
                },
            },
            },
        },
        orderBy: { educationStart: 'asc' },
        });
    }
    //배정 생성
    async createAssignment(data, tx = prisma) {
        // data: { unitScheduleId, userId, classification, state, role? }
        return await tx.instructorUnitAssignment.create({
        data,
        });
    }
    async updateAssignmentStatusCondition(instructorId, unitScheduleId, updateData) {
        return await prisma.instructorUnitAssignment.updateMany({
            where: {
                userId: Number(instructorId),
                unitScheduleId: Number(unitScheduleId),
                // Race Condition 방지 조건: 이미 확정(Confirmed)이거나 취소(Canceled)된 건은 제외
                classification: { not: 'Confirmed' },
                state: { not: 'Canceled' }
            },
            data: updateData
        });
    }
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

}

module.exports = new AssignmentRepository();
