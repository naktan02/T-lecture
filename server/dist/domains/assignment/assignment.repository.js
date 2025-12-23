"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/domains/assignment/assignment.repository.ts
const prisma_1 = __importDefault(require("../../libs/prisma"));
/**
 * 강사 배정 관련 DB 접근 전담 Repository
 */
class AssignmentRepository {
    /**
     * 특정 기간 내 활성화된(Active) 배정 날짜 목록 조회
     */
    async findScheduleCandidates(startDate, endDate) {
        return await prisma_1.default.unit.findMany({
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
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                educationStart: 'asc',
            },
        });
    }
    // 자동 배정 결과를 DB에 일괄 생성
    async createAssignmentsBulk(matchResults) {
        const summary = { requested: matchResults.length, created: 0, skipped: 0 };
        await prisma_1.default.$transaction(async (tx) => {
            for (const match of matchResults) {
                try {
                    await tx.instructorUnitAssignment.create({
                        data: {
                            unitScheduleId: match.unitScheduleId,
                            userId: match.instructorId,
                            classification: 'Temporary',
                            state: 'Pending',
                        },
                    });
                    summary.created += 1;
                }
                catch (e) {
                    if (e.code === 'P2002') {
                        summary.skipped += 1;
                        continue;
                    }
                    throw e;
                }
            }
        });
        return summary;
    }
    // 배정 상태 업데이트
    async updateAssignmentStatusCondition(instructorId, unitScheduleId, updateData) {
        return await prisma_1.default.instructorUnitAssignment.updateMany({
            where: {
                userId: Number(instructorId),
                unitScheduleId: Number(unitScheduleId),
                classification: { not: 'Confirmed' },
                state: { not: 'Canceled' },
            },
            data: updateData,
        });
    }
    // 특정 기간 내 활성화된 배정 날짜 목록 조회
    async findActiveAssignmentsDate(instructorId, startDate, endDate) {
        const assignments = await prisma_1.default.instructorUnitAssignment.findMany({
            where: {
                userId: Number(instructorId),
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
    // ID로 배정 정보 단건 조회
    async findAssignmentByKey(instructorId, unitScheduleId) {
        return await prisma_1.default.instructorUnitAssignment.findUnique({
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
    // 특정 강사의 모든 배정 목록을 조회
    async findAllByInstructorId(instructorId, whereCondition = {}) {
        return await prisma_1.default.instructorUnitAssignment.findMany({
            where: {
                userId: Number(instructorId),
                ...whereCondition,
            },
            include: {
                UnitSchedule: { include: { unit: true } },
            },
            orderBy: {
                UnitSchedule: { date: 'asc' },
            },
        });
    }
    async updateStatusByKey(instructorId, unitScheduleId, newState) {
        return await prisma_1.default.instructorUnitAssignment.update({
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
exports.default = new AssignmentRepository();
// CommonJS 호환
module.exports = new AssignmentRepository();
