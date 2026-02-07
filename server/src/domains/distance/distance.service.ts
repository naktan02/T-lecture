// server/src/domains/distance/distance.service.ts
import * as Sentry from '@sentry/node';
import kakaoService from '../../infra/kakao.service';
import kakaoUsageRepository from './kakaoUsage.repository';

import distanceRepository from './distance.repository';
import instructorRepository from '../instructor/instructor.repository';
import unitRepository from '../unit/unit.repository';

import AppError from '../../common/errors/AppError';
import logger from '../../config/logger';
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

  // 배치: 스케줄 우선순위로 거리 계산 (일일 할당량까지 반복)
  async calculateDistancesBySchedulePriority(batchSize = 200) {
    const CONCURRENCY = 5;
    let totalProcessed = 0;
    let totalErrors = 0;
    const allResults: ProcessResult[] = [];
    let iterations = 0;

    // 일일 할당량이 남아있고, 처리할 쌍이 있는 동안 반복
    while (true) {
      iterations++;

      // 현재 할당량 확인
      const usage = await kakaoUsageRepository.getOrCreateToday();
      const remainingQuota = MAX_ROUTE_PER_DAY - usage!.routeCount;

      if (remainingQuota <= 0) {
        break; // 할당량 소진
      }

      // 이번 반복에서 처리할 개수 (할당량과 batchSize 중 작은 값)
      const limit = Math.min(remainingQuota, batchSize);

      // needsRecalc=true인 쌍 조회
      const needsRecalcPairs = await distanceRepository.findNeedsRecalc(limit);

      if (needsRecalcPairs.length === 0) {
        break; // 더 이상 처리할 쌍 없음
      }

      // 배치 처리
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

        const successCount = batchResults.filter((r) => r.status === 'success').length;
        const errorCount = batchResults.filter((r) => r.status === 'error').length;

        totalProcessed += successCount;
        totalErrors += errorCount;
        allResults.push(...batchResults);
      }
    }

    // 최종 할당량 확인
    const finalUsage = await kakaoUsageRepository.getOrCreateToday();

    // 배치 완료 후 에러 종합 로깅 (한 번만)
    if (totalErrors > 0) {
      const errorResults = allResults.filter((r) => r.status === 'error');
      // 에러 코드별로 그룹화
      const errorsByCode: Record<string, { count: number; samples: string[] }> = {};
      for (const err of errorResults) {
        const code = err.code || 'UNKNOWN';
        if (!errorsByCode[code]) {
          errorsByCode[code] = { count: 0, samples: [] };
        }
        errorsByCode[code].count++;
        // 샘플은 최대 3개만 저장
        if (errorsByCode[code].samples.length < 3) {
          errorsByCode[code].samples.push(
            `instructor=${err.instructorId}, unit=${err.unitId}: ${err.error}`,
          );
        }
      }
      logger.error(`[DistanceBatch] Completed with ${totalErrors} errors`, { errorsByCode });

      // Sentry에 에러 요약 전송
      Sentry.captureMessage(`[DistanceBatch] ${totalErrors} errors occurred`, {
        level: 'error',
        extra: { errorsByCode, totalProcessed, iterations },
      });
    }

    return {
      processed: totalProcessed,
      errors: totalErrors,
      iterations,
      remainingQuotaAfter: MAX_ROUTE_PER_DAY - finalUsage!.routeCount,
      results: allResults,
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
