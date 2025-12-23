"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//server/src/domains/unit/unit.repository.ts
const prisma_1 = __importDefault(require("../../libs/prisma"));
class UnitRepository {
    // 부대 단건 DB 삽입 (Insert)
    async insertOneUnit(data) {
        return prisma_1.default.unit.create({
            data,
            include: {
                trainingLocations: true,
                schedules: true,
            },
        });
    }
    // 부대 다건 일괄 삽입 (Bulk Insert with Transaction)
    async insertManyUnits(dataArray) {
        return prisma_1.default.$transaction(dataArray.map((data) => prisma_1.default.unit.create({
            data,
        })));
    }
    // 필터 조건으로 부대 목록 및 개수 조회
    async findUnitsByFilterAndCount({ skip, take, where }) {
        const [total, units] = await prisma_1.default.$transaction([
            prisma_1.default.unit.count({ where }),
            prisma_1.default.unit.findMany({
                where,
                skip,
                take,
                orderBy: { id: 'desc' },
            }),
        ]);
        return { total, units };
    }
    // 부대 상세 정보(하위 데이터 포함) 조회
    async findUnitWithRelations(id) {
        return prisma_1.default.unit.findUnique({
            where: { id: Number(id) },
            include: {
                trainingLocations: true,
                schedules: {
                    orderBy: { date: 'asc' },
                },
            },
        });
    }
    // 부대 데이터 업데이트
    async updateUnitById(id, data) {
        return prisma_1.default.unit.update({
            where: { id: Number(id) },
            data,
        });
    }
    // 부대 데이터 영구 삭제
    async deleteUnitById(id) {
        return prisma_1.default.unit.delete({
            where: { id: Number(id) },
        });
    }
    // 부대 일정 추가
    async insertUnitSchedule(unitId, date) {
        // date는 'YYYY-MM-DD' 형태라고 가정
        const dt = new Date(`${date}T00:00:00.000Z`);
        return prisma_1.default.unitSchedule.create({
            data: {
                unitId: Number(unitId),
                date: dt,
            },
        });
    }
    // 부대 일정 삭제
    async deleteUnitSchedule(scheduleId) {
        return prisma_1.default.unitSchedule.delete({
            where: { id: Number(scheduleId) },
        });
    }
    // 거리 배치용: 다가오는 부대 일정 가져오기
    async findUpcomingSchedules(limit = 50) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return prisma_1.default.unitSchedule.findMany({
            where: {
                date: {
                    gte: today,
                },
            },
            orderBy: {
                date: 'asc',
            },
            take: limit,
            include: {
                unit: true,
            },
        });
    }
    // 위/경도 갱신
    async updateCoords(unitId, lat, lng) {
        return prisma_1.default.unit.update({
            where: { id: Number(unitId) },
            data: { lat, lng },
        });
    }
}
exports.default = new UnitRepository();
// CommonJS 호환
module.exports = new UnitRepository();
