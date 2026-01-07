// server/src/domains/distance/distance.service.ts
import kakaoService from '../../infra/kakao.service';
import kakaoUsageRepository from './kakaoUsage.repository';

import distanceRepository from './distance.repository';
import instructorRepository from '../instructor/instructor.repository';
import unitRepository from '../unit/unit.repository';

import AppError from '../../common/errors/AppError';
import { ProcessResult, InstructorWithCoords, UnitWithCoords } from '../../types/distance.types';

const MAX_ROUTE_PER_DAY = 9000;
const MAX_GEOCODE_PER_DAY = 900;

class DistanceService {
  // 카카오 API 사용량(오늘) 조회
  async getTodayUsage() {
    const usage = await kakaoUsageRepository.getOrCreateToday();

    return {
      date: usage!.date,
      routeCount: usage!.routeCount,
      geocodeCount: usage!.geocodeCount,
      remainingRoute: Math.max(0, MAX_ROUTE_PER_DAY - usage!.routeCount),
      remainingGeocode: Math.max(0, MAX_GEOCODE_PER_DAY - usage!.geocodeCount),
      maxRoutePerDay: MAX_ROUTE_PER_DAY,
      maxGeocodePerDay: MAX_GEOCODE_PER_DAY,
    };
  }

  // 길찾기 쿼터 확인 + 사용량 증가
  async _ensureRouteQuotaOrThrow(need = 1) {
    const usage = await kakaoUsageRepository.getOrCreateToday();
    if (usage!.routeCount + need > MAX_ROUTE_PER_DAY) {
      throw new AppError('Kakao route daily quota exceeded', 429, 'KAKAO_ROUTE_QUOTA_EXCEEDED');
    }
    await kakaoUsageRepository.incrementRouteCount(need);
  }

  // 지오코드(주소→좌표) 쿼터 확인 + 사용량 증가
  async _ensureGeocodeQuotaOrThrow(need = 1) {
    const usage = await kakaoUsageRepository.getOrCreateToday();
    if (usage!.geocodeCount + need > MAX_GEOCODE_PER_DAY) {
      throw new AppError('Kakao geocode daily quota exceeded', 429, 'KAKAO_GEOCODE_QUOTA_EXCEEDED');
    }
    await kakaoUsageRepository.incrementGeocodeCount(need);
  }

  // 특정 좌표간 거리 계산
  async calculateDistance(originLat: number, originLng: number, destLat: number, destLng: number) {
    await this._ensureRouteQuotaOrThrow(1);

    const route = await kakaoService.getRouteDistance(originLat, originLng, destLat, destLng);
    return { distance: route.distance, duration: route.duration, route };
  }

  // 강사 좌표 조회
  async _getOrCreateInstructorCoords(instructor: InstructorWithCoords) {
    if (instructor.lat !== null && instructor.lng !== null) {
      return { lat: instructor.lat, lng: instructor.lng };
    }

    if (!instructor.location) {
      throw new AppError('Instructor location is not set', 400, 'INSTRUCTOR_LOCATION_MISSING');
    }

    await this._ensureGeocodeQuotaOrThrow(1);
    const { lat, lng } = await kakaoService.addressToCoordinates(instructor.location);

    const updated = await instructorRepository.updateCoords(instructor.userId, lat, lng);
    return { lat: updated.lat, lng: updated.lng };
  }

  // 부대 좌표 조회
  async _getOrCreateUnitCoords(unit: UnitWithCoords) {
    if (unit.lat !== null && unit.lng !== null) {
      return { lat: unit.lat, lng: unit.lng };
    }

    if (!unit.addressDetail) {
      throw new AppError('Unit address is not set', 400, 'UNIT_ADDRESS_MISSING');
    }

    await this._ensureGeocodeQuotaOrThrow(1);
    const { lat, lng } = await kakaoService.addressToCoordinates(unit.addressDetail);

    const updated = await unitRepository.updateCoords(unit.id, lat, lng);
    return { lat: updated.lat, lng: updated.lng };
  }

  // 특정 강사-부대 간 거리 계산 및 저장
  async calculateAndSaveDistance(instructorId: number, unitId: number) {
    const instructor = await instructorRepository.findById(instructorId);
    if (!instructor) throw new AppError('Instructor not found', 404, 'INSTRUCTOR_NOT_FOUND');

    const unit = await unitRepository.findUnitWithRelations(unitId);
    if (!unit) throw new AppError('Unit not found', 404, 'UNIT_NOT_FOUND');

    const origin = await this._getOrCreateInstructorCoords(instructor);
    const destination = await this._getOrCreateUnitCoords(unit);

    await this._ensureRouteQuotaOrThrow(1);
    const route = await kakaoService.getRouteDistance(
      origin.lat!,
      origin.lng!,
      destination.lat!,
      destination.lng!,
    );

    const saved = await distanceRepository.upsertDistance(instructorId, unitId, {
      distance: route.distance,
      duration: route.duration,
    });

    return saved;
  }

  // 특정 부대 기준으로 거리 범위 내 강사 리스트 조회 (유효 거리 사용)
  async getInstructorsWithinDistance(unitId: number, minDistance: number, maxDistance: number) {
    return distanceRepository.findInstructorsByEffectiveDistance(unitId, minDistance, maxDistance);
  }

  // ==================== 거리 재계산 시스템 ====================

  // 강사 주소 변경 시: 해당 강사의 모든 거리 무효화
  async invalidateDistancesForInstructor(instructorId: number) {
    return distanceRepository.markForRecalcByInstructor(instructorId);
  }

  // 부대 주소 변경 시: 해당 부대의 모든 거리 무효화
  async invalidateDistancesForUnit(unitId: number) {
    return distanceRepository.markForRecalcByUnit(unitId);
  }

  // 신규 부대 추가 시: 활성 강사들에 대해 거리 행 생성
  async createDistanceRowsForNewUnit(unitId: number) {
    const instructors = await instructorRepository.findActiveInstructors();
    const instructorIds = instructors.map((i) => i.userId);
    return distanceRepository.createManyForUnit(unitId, instructorIds);
  }

  // 신규 강사 추가 시: 스케줄 있는 부대들에 대해 거리 행 생성
  async createDistanceRowsForNewInstructor(instructorId: number) {
    const schedules = await unitRepository.findUpcomingSchedules(1000);
    // NOTE: unitId는 이제 trainingPeriod를 통해 접근
    const unitIds = [...new Set(schedules.map((s) => s.trainingPeriod.unitId))];
    return distanceRepository.createManyForInstructor(instructorId, unitIds);
  }

  // 배치: 스케줄 우선순위로 거리 계산 (needsRecalc=true 우선)
  async calculateDistancesBySchedulePriority(limit = 200) {
    const usage = await kakaoUsageRepository.getOrCreateToday();
    const remainingRouteQuota = Math.max(0, Math.min(MAX_ROUTE_PER_DAY - usage!.routeCount, limit));

    if (remainingRouteQuota <= 0) {
      return { processed: 0, message: 'No remaining Kakao route quota for today' };
    }

    // 1. 먼저 needsRecalc=true인 쌍 우선 처리
    const needsRecalcPairs = await distanceRepository.findNeedsRecalc(remainingRouteQuota);

    const CONCURRENCY = 5;
    let processed = 0;
    const results: ProcessResult[] = [];

    // needsRecalc=true 쌍 처리
    for (let i = 0; i < needsRecalcPairs.length; i += CONCURRENCY) {
      const batch = needsRecalcPairs.slice(i, i + CONCURRENCY);

      const batchResults = await Promise.all(
        batch.map(async (pair): Promise<ProcessResult> => {
          const { userId: instructorId, unitId, earliestSchedule } = pair;
          try {
            const saved = await this.calculateAndSaveDistance(instructorId, unitId);
            return {
              instructorId,
              unitId,
              scheduleDate: earliestSchedule,
              distance: Number(saved.distance),
              status: 'success',
            };
          } catch (error: unknown) {
            const err = error as { message?: string; code?: string; statusCode?: number };
            return {
              instructorId,
              unitId,
              scheduleDate: earliestSchedule,
              status: 'error',
              error: err.message || 'Unknown error',
              code: err.code || 'DISTANCE_CALC_FAILED',
              statusCode: err.statusCode || 500,
            };
          }
        }),
      );

      results.push(...batchResults);
      processed += batchResults.filter((r) => r.status === 'success').length;
    }

    // 2. 할당량 남으면 신규 쌍 계산 (기존 로직)
    const remainingAfterRecalc = remainingRouteQuota - processed;
    if (remainingAfterRecalc > 0) {
      const upcomingSchedules = await unitRepository.findUpcomingSchedules(50);
      if (upcomingSchedules.length > 0) {
        // NOTE: unitId는 이제 trainingPeriod를 통해 접근
        const unitIds = Array.from(
          new Set(upcomingSchedules.map((s) => s.trainingPeriod.unitId)),
        ) as number[];
        const existingDistances = await distanceRepository.findManyByUnitIds(unitIds);

        const existingByUnit = new Map<number, Set<number>>();
        for (const row of existingDistances) {
          let set = existingByUnit.get(row.unitId);
          if (!set) {
            set = new Set();
            existingByUnit.set(row.unitId, set);
          }
          set.add(row.userId);
        }

        const instructors = await instructorRepository.findActiveInstructors();
        const candidates: { instructorId: number; unitId: number; scheduleDate: Date | null }[] =
          [];

        for (const schedule of upcomingSchedules) {
          // NOTE: unitId는 이제 trainingPeriod를 통해 접근
          const unitId = schedule.trainingPeriod.unitId;
          let set = existingByUnit.get(unitId);
          if (!set) {
            set = new Set();
            existingByUnit.set(unitId, set);
          }

          for (const instructor of instructors) {
            const instructorId = instructor.userId;
            if (set.has(instructorId)) continue;
            candidates.push({ instructorId, unitId, scheduleDate: schedule.date });
          }
        }

        const toProcess = candidates.slice(0, remainingAfterRecalc);

        for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
          const batch = toProcess.slice(i, i + CONCURRENCY);

          const batchResults = await Promise.all(
            batch.map(async (pair): Promise<ProcessResult> => {
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
              } catch (error: unknown) {
                const err = error as { message?: string; code?: string; statusCode?: number };
                return {
                  instructorId,
                  unitId,
                  scheduleDate,
                  status: 'error',
                  error: err.message || 'Unknown error',
                  code: err.code || 'DISTANCE_CALC_FAILED',
                  statusCode: err.statusCode || 500,
                };
              }
            }),
          );

          results.push(...batchResults);
          processed += batchResults.filter((r) => r.status === 'success').length;
        }
      }
    }

    return {
      processed,
      needsRecalcCount: needsRecalcPairs.length,
      remainingQuotaAfter: remainingRouteQuota - processed,
      results,
    };
  }

  async getDistance(instructorId: number, unitId: number) {
    const record = await distanceRepository.findOne(instructorId, unitId);
    if (!record) throw new AppError('Distance not found', 404, 'DISTANCE_NOT_FOUND');
    return record;
  }

  async getUnitsWithinDistance(instructorId: number, minDistance: number, maxDistance: number) {
    return distanceRepository.findByDistanceRange(instructorId, minDistance, maxDistance);
  }

  // 재계산 필요 개수 조회 (모니터링용)
  async getNeedsRecalcCount() {
    return distanceRepository.countNeedsRecalc();
  }
}

export default new DistanceService();
