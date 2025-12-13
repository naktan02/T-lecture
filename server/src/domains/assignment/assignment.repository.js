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
    async findScheduleCandidates(startDate, endDate) {
        return await prisma.unit.findMany({
            where: {
                schedules: {
                    some: {
                        date: {
                            gte: new Date(startDate), 
                            lte: new Date(endDate),
                        },
                    },
                },
            },
            include: {
                trainingLocations: true,
                schedules: {
                    where: {
                        date: {
                            gte: new Date(startDate),
                            lte: new Date(endDate),
                        },
                    },
                    orderBy: { date: 'asc' },
                    include: {
                        assignments: {
                            where: { state: { in: ['Pending', 'Accepted'] } },
                            include: {
                                User: {
                                    include: {
                                        instructor: {
                                            include: {
                                                team: true, 
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
            },
            orderBy: {
                educationStart: 'asc',
            }
        });
    }
    async createAssignmentsBulk(matchResults) {
        const summary = { requested: matchResults.length, created: 0, skipped: 0 };

        await prisma.$transaction(async (tx) => {
            for (const match of matchResults) {
                try {
                    await tx.instructorUnitAssignment.create({
                        data: {
                            unitScheduleId: match.unitScheduleId,
                            userId: match.instructorId,
                            classification: 'Temporary', // 기존 분류 유지
                            state: 'Pending',            // [핵심] 초기 상태는 Pending
                        },
                    });
                    summary.created += 1;
                } catch (e) {
                    if (e.code === 'P2002') { // 중복 배정 시 스킵
                        summary.skipped += 1;
                        continue;
                    }
                    throw e;
                }
            }
        });
        return summary;
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
                // 취소(Canceled)나 거절(Rejected)된 것은 제외하고 날짜 점유로 인정
                state: { in: ['Pending', 'Accepted'] }, 
                UnitSchedule: {
                    date: { gte: startDate, lte: endDate },
                },
            },
            select: {
                UnitSchedule: { select: { date: true } },
            },
        });

        return assignments.map((a) => a.UnitSchedule.date);
    }


    /**
     * ID로 배정 정보 단건 조회 (Prisma)
     */
    async findAssignmentByKey(instructorId, unitScheduleId) {
        return await prisma.instructorUnitAssignment.findUnique({
            where: {
                unitScheduleId_userId: {
                    userId: Number(instructorId),
                    unitScheduleId: Number(unitScheduleId),
                },
            },
            include: {
                User: true,
            },
        });
    }
    // findAssignments (Service에서 호출하는 검색 메서드 예시)
    async findAllByInstructorId(instructorId, whereCondition) {
        // Service에서 넘겨준 where 조건(state, UnitSchedule 등)을 그대로 사용
        // 실제 구현 시 where 객체 구조를 Prisma에 맞게 조정 필요할 수 있음
        return await prisma.instructorUnitAssignment.findMany({
        where: {
            userId: Number(instructorId),
            ...whereCondition
        },
        include: {
            UnitSchedule: { include: { unit: true } } 
        },
        orderBy: {
            UnitSchedule: { date: 'asc' }
        }
        });
    }


    async updateStatusByKey(instructorId, unitScheduleId, newState) {
        return await prisma.instructorUnitAssignment.update({
            where: {
                unitScheduleId_userId: {
                    userId: Number(instructorId),
                    unitScheduleId: Number(unitScheduleId),
                },
            },
            data: {
                state: newState,
            },
        });
    }
}

module.exports = new AssignmentRepository();
