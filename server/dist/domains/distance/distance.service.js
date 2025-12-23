"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/domains/distance/distance.service.ts
const kakao_service_1 = __importDefault(require("../../infra/kakao.service"));
const kakaoUsage_repository_1 = __importDefault(require("./kakaoUsage.repository"));
const distance_repository_1 = __importDefault(require("./distance.repository"));
const instructor_repository_1 = __importDefault(require("../instructor/instructor.repository"));
// @ts-ignore - JS 파일, unit 도메인 마이그레이션 후 제거 예정
const unit_repository_1 = __importDefault(require("../unit/unit.repository"));
const AppError_1 = __importDefault(require("../../common/errors/AppError"));
const MAX_ROUTE_PER_DAY = 9000;
const MAX_GEOCODE_PER_DAY = 900;
class DistanceService {
    // 카카오 API 사용량(오늘) 조회
    async getTodayUsage() {
        const usage = await kakaoUsage_repository_1.default.getOrCreateToday();
        return {
            date: usage.date,
            routeCount: usage.routeCount,
            geocodeCount: usage.geocodeCount,
            remainingRoute: Math.max(0, MAX_ROUTE_PER_DAY - usage.routeCount),
            remainingGeocode: Math.max(0, MAX_GEOCODE_PER_DAY - usage.geocodeCount),
            maxRoutePerDay: MAX_ROUTE_PER_DAY,
            maxGeocodePerDay: MAX_GEOCODE_PER_DAY,
        };
    }
    // 길찾기 쿼터 확인 + 사용량 증가
    async _ensureRouteQuotaOrThrow(need = 1) {
        const usage = await kakaoUsage_repository_1.default.getOrCreateToday();
        if (usage.routeCount + need > MAX_ROUTE_PER_DAY) {
            throw new AppError_1.default('Kakao route daily quota exceeded', 429, 'KAKAO_ROUTE_QUOTA_EXCEEDED');
        }
        await kakaoUsage_repository_1.default.incrementRouteCount(need);
    }
    // 지오코드(주소→좌표) 쿼터 확인 + 사용량 증가
    async _ensureGeocodeQuotaOrThrow(need = 1) {
        const usage = await kakaoUsage_repository_1.default.getOrCreateToday();
        if (usage.geocodeCount + need > MAX_GEOCODE_PER_DAY) {
            throw new AppError_1.default('Kakao geocode daily quota exceeded', 429, 'KAKAO_GEOCODE_QUOTA_EXCEEDED');
        }
        await kakaoUsage_repository_1.default.incrementGeocodeCount(need);
    }
    // 특정 좌표간 거리 계산
    async calculateDistance(originLat, originLng, destLat, destLng) {
        await this._ensureRouteQuotaOrThrow(1);
        const route = await kakao_service_1.default.getRouteDistance(originLat, originLng, destLat, destLng);
        return { distance: route.distance, duration: route.duration, route };
    }
    // 강사 좌표 조회
    async _getOrCreateInstructorCoords(instructor) {
        if (instructor.lat !== null && instructor.lng !== null) {
            return { lat: instructor.lat, lng: instructor.lng };
        }
        if (!instructor.location) {
            throw new AppError_1.default('Instructor location is not set', 400, 'INSTRUCTOR_LOCATION_MISSING');
        }
        await this._ensureGeocodeQuotaOrThrow(1);
        const { lat, lng } = await kakao_service_1.default.addressToCoordinates(instructor.location);
        const updated = await instructor_repository_1.default.updateCoords(instructor.userId, lat, lng);
        return { lat: updated.lat, lng: updated.lng };
    }
    // 부대 좌표 조회
    async _getOrCreateUnitCoords(unit) {
        if (unit.lat !== null && unit.lng !== null) {
            return { lat: unit.lat, lng: unit.lng };
        }
        if (!unit.addressDetail) {
            throw new AppError_1.default('Unit address is not set', 400, 'UNIT_ADDRESS_MISSING');
        }
        await this._ensureGeocodeQuotaOrThrow(1);
        const { lat, lng } = await kakao_service_1.default.addressToCoordinates(unit.addressDetail);
        const updated = await unit_repository_1.default.updateCoords(unit.id, lat, lng);
        return { lat: updated.lat, lng: updated.lng };
    }
    // 특정 강사-부대 간 거리 계산 및 저장
    async calculateAndSaveDistance(instructorId, unitId) {
        const instructor = await instructor_repository_1.default.findById(instructorId);
        if (!instructor)
            throw new AppError_1.default('Instructor not found', 404, 'INSTRUCTOR_NOT_FOUND');
        const unit = await unit_repository_1.default.findUnitWithRelations(unitId);
        if (!unit)
            throw new AppError_1.default('Unit not found', 404, 'UNIT_NOT_FOUND');
        const origin = await this._getOrCreateInstructorCoords(instructor);
        const destination = await this._getOrCreateUnitCoords(unit);
        await this._ensureRouteQuotaOrThrow(1);
        const route = await kakao_service_1.default.getRouteDistance(origin.lat, origin.lng, destination.lat, destination.lng);
        const saved = await distance_repository_1.default.upsertDistance(instructorId, unitId, {
            distance: route.distance,
            duration: route.duration,
        });
        return saved;
    }
    // 특정 부대 기준으로 거리 범위 내 강사 리스트 조회
    async getInstructorsWithinDistance(unitId, minDistance, maxDistance) {
        return distance_repository_1.default.findInstructorsByDistanceRange(unitId, minDistance, maxDistance);
    }
    async calculateDistancesBySchedulePriority(limit = 200) {
        const usage = await kakaoUsage_repository_1.default.getOrCreateToday();
        const remainingRouteQuota = Math.max(0, Math.min(MAX_ROUTE_PER_DAY - usage.routeCount, limit));
        if (remainingRouteQuota <= 0) {
            return { processed: 0, message: 'No remaining Kakao route quota for today' };
        }
        const upcomingSchedules = await unit_repository_1.default.findUpcomingSchedules(50);
        if (!upcomingSchedules.length)
            return { processed: 0, message: 'No upcoming unit schedules' };
        const unitIds = Array.from(new Set(upcomingSchedules.map((s) => s.unitId)));
        const existingDistances = await distance_repository_1.default.findManyByUnitIds(unitIds);
        const existingByUnit = new Map();
        for (const row of existingDistances) {
            let set = existingByUnit.get(row.unitId);
            if (!set) {
                set = new Set();
                existingByUnit.set(row.unitId, set);
            }
            set.add(row.userId);
        }
        const instructors = await instructor_repository_1.default.findActiveInstructors();
        const candidates = [];
        for (const schedule of upcomingSchedules) {
            const unitId = schedule.unitId;
            let set = existingByUnit.get(unitId);
            if (!set) {
                set = new Set();
                existingByUnit.set(unitId, set);
            }
            for (const instructor of instructors) {
                const instructorId = instructor.userId;
                if (set.has(instructorId))
                    continue;
                candidates.push({ instructorId, unitId, scheduleDate: schedule.date });
            }
        }
        const toProcess = candidates.slice(0, remainingRouteQuota);
        const CONCURRENCY = 5;
        let processed = 0;
        const results = [];
        for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
            const batch = toProcess.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.all(batch.map(async (pair) => {
                const { instructorId, unitId, scheduleDate } = pair;
                try {
                    const saved = await this.calculateAndSaveDistance(instructorId, unitId);
                    return {
                        instructorId,
                        unitId,
                        scheduleDate,
                        distance: Number(saved.distance),
                        status: 'success',
                    };
                }
                catch (error) {
                    const prismaCode = typeof error?.code === 'string' && error.code.startsWith('P') ? error.code : null;
                    return {
                        instructorId,
                        unitId,
                        scheduleDate,
                        status: 'error',
                        error: error.message,
                        code: error.code || 'DISTANCE_CALC_FAILED',
                        statusCode: error.statusCode || 500,
                        prismaCode,
                    };
                }
            }));
            results.push(...batchResults);
            processed += batchResults.filter((r) => r.status === 'success').length;
        }
        return {
            processed,
            remainingQuotaAfter: remainingRouteQuota - processed,
            results,
        };
    }
    async getDistance(instructorId, unitId) {
        const record = await distance_repository_1.default.findOne(instructorId, unitId);
        if (!record)
            throw new AppError_1.default('Distance not found', 404, 'DISTANCE_NOT_FOUND');
        return record;
    }
    async getUnitsWithinDistance(instructorId, minDistance, maxDistance) {
        return distance_repository_1.default.findByDistanceRange(instructorId, minDistance, maxDistance);
    }
}
exports.default = new DistanceService();
// CommonJS 호환
module.exports = new DistanceService();
