"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/domains/instructor/instructor.repository.ts
const prisma_1 = __importDefault(require("../../libs/prisma"));
class InstructorRepository {
    // 특정 기간의 근무 가능일 조회
    async findAvailabilities(instructorId, startDate, endDate) {
        return await prisma_1.default.instructorAvailability.findMany({
            where: {
                instructorId: Number(instructorId),
                availableOn: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { availableOn: 'asc' },
        });
    }
    // 근무 가능일 일괄 업데이트
    async replaceAvailabilities(instructorId, startDate, endDate, newDates) {
        return await prisma_1.default.$transaction(async (tx) => {
            // 1. 해당 기간의 기존 설정 삭제
            await tx.instructorAvailability.deleteMany({
                where: {
                    instructorId: Number(instructorId),
                    availableOn: { gte: startDate, lte: endDate },
                },
            });
            // 2. 새로운 날짜들 일괄 삽입
            if (newDates.length > 0) {
                await tx.instructorAvailability.createMany({
                    data: newDates.map((date) => ({
                        instructorId: Number(instructorId),
                        availableOn: new Date(date),
                    })),
                });
            }
        });
    }
    // 승인된 강사 조회
    async findActiveInstructors() {
        return prisma_1.default.instructor.findMany({
            where: {
                user: {
                    status: 'APPROVED',
                },
            },
            include: {
                user: true,
            },
        });
    }
    // 강사 ID로 조회
    async findById(instructorId) {
        return prisma_1.default.instructor.findUnique({
            where: { userId: Number(instructorId) },
            include: { user: true },
        });
    }
    // 강사 좌표 업데이트
    async updateCoords(instructorId, lat, lng) {
        return prisma_1.default.instructor.update({
            where: { userId: Number(instructorId) },
            data: { lat, lng },
        });
    }
    // 강사 덕목(Virtue/ 과목) 추가
    async addVirtues(instructorId, virtueIds) {
        if (!virtueIds || virtueIds.length === 0)
            return;
        await prisma_1.default.instructorVirtue.createMany({
            data: virtueIds.map((vId) => ({
                instructorId: Number(instructorId),
                virtueId: vId,
            })),
            skipDuplicates: true,
        });
    }
    // 기간 내 가용 강사 조회
    async findAvailableInPeriod(startDate, endDate) {
        return await prisma_1.default.instructor.findMany({
            where: {
                availabilities: {
                    some: {
                        availableOn: { gte: new Date(startDate), lte: new Date(endDate) },
                    },
                },
                user: { status: 'APPROVED' },
            },
            include: {
                user: {
                    select: { name: true, userphoneNumber: true, userEmail: true },
                },
                availabilities: {
                    where: {
                        availableOn: { gte: new Date(startDate), lte: new Date(endDate) },
                    },
                    orderBy: { availableOn: 'asc' },
                },
                team: true,
                virtues: { include: { virtue: true } },
            },
        });
    }
    // =========================================================================
    // ▼ [신규 추가] 과제 요건 충족(API 5개) 및 기능 구현을 위한 신규 메서드
    // =========================================================================
    /**
     * [신규] 기간 내 배정된(Active) 일정 날짜 조회
     * - 원래 AssignmentRepository에 있던 로직과 유사하지만,
     * '강사 근무 가능일 수정' 시 유효성 검사를 위해 이곳에 추가했습니다.
     */
    async findActiveAssignmentsDate(instructorId, startDate, endDate) {
        const assignments = await prisma_1.default.instructorUnitAssignment.findMany({
            where: {
                userId: Number(instructorId),
                // ✅ 수정: 'Active' 대신 유효한 상태 ['Pending', 'Accepted'] 사용
                state: { in: ['Pending', 'Accepted'] },
                UnitSchedule: {
                    date: { gte: startDate, lte: endDate },
                },
            },
            include: { UnitSchedule: true },
        });
        return assignments.map((a) => a.UnitSchedule.date);
    }
    /**
     * [신규] 통계 데이터 계산 (Real DB Query)
     * - '내 통계 조회' API용
     * - 실제 배정 횟수와 강의 시간을 DB에서 계산합니다.
     */
    // 1. 배정 횟수 조회 (DB Count)
    async countActiveAssignments(instructorId) {
        return await prisma_1.default.instructorUnitAssignment.count({
            where: {
                userId: Number(instructorId),
                // ✅ 수정: 통계는 확정된 'Accepted' 상태를 기준으로 합니다.
                state: 'Accepted',
            },
        });
    }
    // 2. 강의 시간 계산용 데이터 조회 (단순 조회)
    async findAssignmentsForCalc(instructorId) {
        return await prisma_1.default.instructorUnitAssignment.findMany({
            where: {
                userId: Number(instructorId),
                // ✅ 수정: 'Accepted' 상태 사용
                state: 'Accepted',
            },
            select: {
                UnitSchedule: {
                    select: {
                        unit: {
                            select: { workStartTime: true, workEndTime: true },
                        },
                    },
                },
            },
        });
    }
    // 3. 레거시 통계 조회
    async findLegacyStats(instructorId) {
        return await prisma_1.default.instructorStats.findUnique({
            where: { instructorId: Number(instructorId) },
        });
    }
    /**
     * [신규] 강의 과목 수정 (트랜잭션)
     * - '강의 과목 수정' API용
     * - 기존 addVirtues는 추가만 하므로, 수정(교체)을 위해 deleteMany 후 createMany 수행
     */
    async updateVirtues(instructorId, virtueIds) {
        const id = Number(instructorId);
        return await prisma_1.default.$transaction(async (tx) => {
            // 기존 연결 삭제
            await tx.instructorVirtue.deleteMany({ where: { instructorId: id } });
            // 새 연결 생성
            if (virtueIds.length > 0) {
                await tx.instructorVirtue.createMany({
                    data: virtueIds.map((vId) => ({ instructorId: id, virtueId: vId })),
                });
            }
        });
    }
}
exports.default = new InstructorRepository();
// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = new InstructorRepository();
