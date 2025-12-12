const kakaoService = require('../../infra/kakao.service');
const kakaoUsageRepository = require('./kakaoUsage.repository');

const distanceRepository = require('./distance.repository');
const instructorRepository = require('../instructor/instructor.repository');
const unitRepository = require('../unit/unit.repository');

const MAX_ROUTE_PER_DAY = 9000;
const MAX_GEOCODE_PER_DAY = 900;

class DistanceService {
  _todayDateOnly() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /**
   * 길찾기 쿼터 확인 + 사용량 증가
   */
  async _ensureRouteQuotaOrThrow(need = 1) {
    const usage = await kakaoUsageRepository.getOrCreateToday();
    if (usage.routeCount + need > MAX_ROUTE_PER_DAY) {
      throw new Error('Kakao route daily quota exceeded');
    }
    await kakaoUsageRepository.incrementRouteCount(need);
  }

  /**
   * 지오코드(주소→좌표) 쿼터 확인 + 사용량 증가
   */
  async _ensureGeocodeQuotaOrThrow(need = 1) {
    const usage = await kakaoUsageRepository.getOrCreateToday();
    if (usage.geocodeCount + need > MAX_GEOCODE_PER_DAY) {
      throw new Error('Kakao geocode daily quota exceeded');
    }
    await kakaoUsageRepository.incrementGeocodeCount(need);
  }

  /**
   * ✅ 테스트/단일 호출용: 좌표 2개로 거리 계산만 하는 함수
   *  - test/test-kakao-navi-multi.js 에서 사용
   */
  async calculateDistance(originLat, originLng, destLat, destLng) {
    // 1. route 쿼터 체크 + 사용량 +1
    await this._ensureRouteQuotaOrThrow(1);

    // 2. 카카오 길찾기 호출
    const route = await kakaoService.getRouteDistance(
      originLat,
      originLng,
      destLat,
      destLng,
    );

    // 3. 테스트에서 쓰기 좋은 형태로 리턴
    return {
      distance: route.distance,
      duration: route.duration,
      route, // 필요 없으면 빼도 됨
    };
  }

  /**
   * 강사 좌표 확보 (없으면 Kakao geocode로 생성)
   */
  async _getOrCreateInstructorCoords(instructor) {
    if (instructor.lat != null && instructor.lng != null) {
      return { lat: instructor.lat, lng: instructor.lng };
    }

    if (!instructor.location) {
      throw new Error('Instructor location is not set');
    }

    await this._ensureGeocodeQuotaOrThrow(1);
    const { lat, lng } = await kakaoService.addressToCoordinates(
      instructor.location,
    );
    const updated = await instructorRepository.updateCoords(
      instructor.userId,
      lat,
      lng,
    );
    return { lat: updated.lat, lng: updated.lng };
  }

  /**
   * 부대 좌표 확보 (없으면 Kakao geocode로 생성)
   */
  async _getOrCreateUnitCoords(unit) {
    if (unit.lat != null && unit.lng != null) {
      return { lat: unit.lat, lng: unit.lng };
    }

    if (!unit.addressDetail) {
      throw new Error('Unit address is not set');
    }

    await this._ensureGeocodeQuotaOrThrow(1);
    const { lat, lng } = await kakaoService.addressToCoordinates(
      unit.addressDetail,
    );
    const updated = await unitRepository.updateCoords(unit.id, lat, lng);
    return { lat: updated.lat, lng: updated.lng };
  }

  /**
   * (2-2) 강사-부대 한 쌍 거리 계산 + 저장
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
      destination.lng,
    );

    const saved = await distanceRepository.upsertDistance(instructorId, unitId, {
      distance: route.distance,
      duration: route.duration,
    });

    return saved;
  }

  /**
   * (2-3) 부대 일정(educationStart) 기준, 오늘 쿼터 안에서 여러 개 배치 처리
   *  - unitRepository.findUpcomingSchedules(limit)
   *    => prisma.unitSchedule.findMany({ include: { unit: true } }) 형태라고 가정
   *  - instructorRepository.findAll()
   *    => 활성화된 전체 강사 목록
   */

  async calculateDistancesBySchedulePriority(limit = 200) {
    // [Step 0] 오늘 남은 쿼터 계산
    const usage = await kakaoUsageRepository.getOrCreateToday(); //
    const remainingRouteQuota = Math.max(
      0,
      Math.min(MAX_ROUTE_PER_DAY - usage.routeCount, limit)
    );

    // 쿼터가 없으면 즉시 종료
    if (remainingRouteQuota <= 0) {
      return { processed: 0, message: 'No remaining Kakao route quota for today' };
    }

    // [Step 1] 데이터 준비 (V3 로직: 필요한 데이터 한 번에 조회)
    // 1. 다가오는 부대 일정 조회
    const upcomingSchedules = await unitRepository.findUpcomingSchedules(50); //
    if (!upcomingSchedules.length) {
      return { processed: 0, message: 'No upcoming unit schedules' };
    }

    // 2. 해당 부대들의 기존 거리 데이터 조회 (DB 부하 최소화)
    const unitIds = Array.from(new Set(upcomingSchedules.map((s) => s.unitId)));
    // *주의: repository에 findManyByUnitIds 구현 필요 (WHERE unitId IN (...))
    const existingDistances = await distanceRepository.findManyByUnitIds(unitIds);

    // 3. 조회 편의를 위해 Map<unitId, Set<instructorId>> 구조로 변환
    const existingByUnit = new Map();
    for (const row of existingDistances) {
      let set = existingByUnit.get(row.unitId);
      if (!set) {
        set = new Set();
        existingByUnit.set(row.unitId, set);
      }
      set.add(row.instructorId);
    }

    // 4. 전체 강사 목록 조회
    const instructors = await instructorRepository.findActiveInstructors(); 

    // [Step 2] 실행 후보군(Candidates) 추출 (V3 로직)
    // 실제 API 호출은 하지 않고, "무엇을 해야 하는지" 목록만 만듭니다.
    const candidates = [];
    for (const schedule of upcomingSchedules) {
      const unitId = schedule.unitId;
      let set = existingByUnit.get(unitId);
      // Set이 없으면 빈 Set 생성 (에러 방지)
      if (!set) {
        set = new Set();
        existingByUnit.set(unitId, set);
      }

      for (const instructor of instructors) {
        const instructorId = instructor.userId;
        // 이미 DB에 있으면 스킵 (Set 조회라 빠름)
        if (set.has(instructorId)) continue;

        // 계산 대상 추가
        candidates.push({
          instructorId,
          unitId,
          scheduleDate: schedule.date,
        });
      }
    }

    // [Step 3] 쿼터만큼 자르기 (V3 로직: 확실한 제한)
    // 5000개가 대상이어도, 오늘 쿼터가 200개면 정확히 200개만 자릅니다.
    const toProcess = candidates.slice(0, remainingRouteQuota);

    // [Step 4] 병렬 실행 (Parallel 로직: 속도 향상)
    const CONCURRENCY = 5; // 한 번에 5개씩 동시 요청 (카카오 API 제한 고려)
    let processed = 0;
    const results = [];

    // 청크(Chunk) 단위로 반복
    for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
      const batch = toProcess.slice(i, i + CONCURRENCY);

      // Promise.all로 병렬 처리
      const batchResults = await Promise.all(
        batch.map(async (pair) => {
          const { instructorId, unitId, scheduleDate } = pair;
          try {
            // 실제 API 호출 및 저장
            const saved = await this.calculateAndSaveDistance(instructorId, unitId); //
            return {
              instructorId,
              unitId,
              scheduleDate,
              distance: saved.distance,
              status: 'success',
            };
          } catch (error) {
            return {
              instructorId,
              unitId,
              scheduleDate,
              status: 'error',
              error: error.message,
            };
          }
        })
      );

      results.push(...batchResults);
      // 성공한 개수만큼만 카운트 증가
      processed += batchResults.filter((r) => r.status === 'success').length;
    }

    return {
      processed,
      remainingQuotaAfter: remainingRouteQuota - processed,
      results, // 필요 시 로깅이나 응답으로 확인 가능
    };
  }

  /**
   * 이미 계산된 거리 1건 조회
   */
  async getDistance(instructorId, unitId) {
    const record = await distanceRepository.findOne(instructorId, unitId);
    if (!record) throw new Error('Distance not found');
    return record;
  }

  /**
   * 특정 강사 기준, 거리 범위 안의 부대 리스트 조회
   */
  async getUnitsWithinDistance(instructorId, minDistance, maxDistance) {
    return distanceRepository.findByDistanceRange(
      instructorId,
      minDistance,
      maxDistance,
    );
  }
}

module.exports = new DistanceService();
