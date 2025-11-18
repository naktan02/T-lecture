// server/src/modules/distance/services/distance.service.js
const distanceRepository = require('../repositories/distance.repository');
const kakaoUsageRepository = require('../repositories/kakaoUsage.repository');

const instructorRepository = require('../../instructor/repositories/instructor.repository');
const unitRepository = require('../../unit/repositories/unit.repository');

const kakaoService = require('../../../infra/kakao/kakao.service');

const MAX_ROUTE_PER_DAY = 9000;
const MAX_GEOCODE_PER_DAY = 900;

class DistanceService {
    _todayDateOnly() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    async _ensureRouteQuotaOrThrow(need = 1) {
        const usage = await kakaoUsageRepository.getOrCreateToday();
        if (usage.routeCount + need > MAX_ROUTE_PER_DAY) {
        throw new Error('Kakao route daily quota exceeded');
        }
        await kakaoUsageRepository.incrementRouteCount(need);
    }

    async _ensureGeocodeQuotaOrThrow(need = 1) {
        const usage = await kakaoUsageRepository.getOrCreateToday();
        if (usage.geocodeCount + need > MAX_GEOCODE_PER_DAY) {
        throw new Error('Kakao geocode daily quota exceeded');
        }
        await kakaoUsageRepository.incrementGeocodeCount(need);
    }

    async _getOrCreateInstructorCoords(instructor) {
        if (instructor.lat != null && instructor.lng != null) {
        return { lat: instructor.lat, lng: instructor.lng };
        }

        if (!instructor.location) {
        throw new Error('Instructor location is not set');
        }

        await this._ensureGeocodeQuotaOrThrow(1);
        const { lat, lng } = await kakaoService.addressToCoordinates(instructor.location);
        const updated = await instructorRepository.updateCoords(instructor.userId, lat, lng);
        return { lat: updated.lat, lng: updated.lng };
    }

    async _getOrCreateUnitCoords(unit) {
        if (unit.lat != null && unit.lng != null) {
        return { lat: unit.lat, lng: unit.lng };
        }

        if (!unit.addressDetail) {
        throw new Error('Unit addressDetail is not set');
        }

        await this._ensureGeocodeQuotaOrThrow(1);
        const { lat, lng } = await kakaoService.addressToCoordinates(unit.addressDetail);
        const updated = await unitRepository.updateCoords(unit.id, lat, lng);
        return { lat: updated.lat, lng: updated.lng };
    }

    /**
     * (2-2) 강사-부대 한 쌍 거리 계산
     */
    async calculateAndSaveDistance(instructorId, unitId) {
        // 1. 강사/부대 조회
        const instructor = await instructorRepository.findById(instructorId);
        if (!instructor) throw new Error('Instructor not found');

        const unit = await unitRepository.findById(unitId);
        if (!unit) throw new Error('Unit not found');

        // 2. 좌표 확보
        const origin = await this._getOrCreateInstructorCoords(instructor);
        const destination = await this._getOrCreateUnitCoords(unit);

        // 3. 카카오 길찾기
        await this._ensureRouteQuotaOrThrow(1);
        const route = await kakaoService.getRouteDistance(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng
        );

        const saved = await distanceRepository.upsertDistance(instructorId, unitId, {
        distance: route.distance,
        duration: route.duration,
        });

        return saved;
    }

    /**
     * (2-3) 부대 일정(educationStart) 기준, 오늘 쿼터 안에서 여러 개 배치 처리
     */
    async calculateDistancesBySchedulePriority(limit = 200) {
    // 0. 오늘 남은 쿼터 계산
        const usage = await kakaoUsageRepository.getOrCreateToday();
        const remainingRouteQuota = Math.max(
            0,
            Math.min(MAX_ROUTE_PER_DAY - usage.routeCount, limit)
        );

        if (remainingRouteQuota <= 0) {
            return { processed: 0, message: 'No remaining Kakao route quota for today' };
        }

        // 1. 다가오는 부대 일정들 (UnitSchedule 기준)
        //    unitRepository.findUpcomingSchedules는
        //    prisma.unitSchedule.findMany({ include: { unit: true } }) 형태라고 가정
        const upcomingSchedules = await unitRepository.findUpcomingSchedules(50);
        if (upcomingSchedules.length === 0) {
            return { processed: 0, message: 'No upcoming unit schedules' };
        }

        // 2. 모든 강사 (추후에 가능일자 기준으로 줄일 수 있음)
        //    instructorRepository에 findAll() 하나 만든다고 가정
        const instructors = await instructorRepository.findAll();

        let processed = 0;
        const results = [];

        // 3. “가까운 일정 순”으로 스케줄을 돌면서, 강사-부대 조합 거리 계산
        for (const schedule of upcomingSchedules) {
            const unit = schedule.unit;   // include: { unit: true } 로 가져온 Unit
            const unitId = schedule.unitId;

            for (const instructor of instructors) {
            if (processed >= remainingRouteQuota) break;

            const instructorId = instructor.userId;

            // 이미 거리 계산된 조합이면 스킵
            const existing = await distanceRepository.findOne(instructorId, unitId);
            if (existing) continue;

            try {
                const saved = await this.calculateAndSaveDistance(instructorId, unitId);
                results.push({
                instructorId,
                unitId,
                scheduleDate: schedule.date,
                distance: saved.distance,
                status: 'success',
                });
                processed += 1;
            } catch (error) {
                results.push({
                instructorId,
                unitId,
                scheduleDate: schedule.date,
                status: 'error',
                error: error.message,
                });
            }
            }

            if (processed >= remainingRouteQuota) break;
        }

        return {
            processed,
            remainingQuotaAfter: remainingRouteQuota - processed,
            results,
        };
    }

    async getDistance(instructorId, unitId) {
        const record = await distanceRepository.findOne(instructorId, unitId);
        if (!record) throw new Error('Distance not found');
        return record;
    }

    async getUnitsWithinDistance(instructorId, minDistance, maxDistance) {
        return distanceRepository.findByDistanceRange(instructorId, minDistance, maxDistance);
    }
}

module.exports = new DistanceService();
