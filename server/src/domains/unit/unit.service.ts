// server/src/domains/unit/unit.service.ts
import unitRepository from './unit.repository';
import { buildPaging, buildUnitWhere } from './unit.filters';
import { toCreateUnitDto, groupExcelRowsByUnit, RawUnitData } from './unit.mapper';
import kakaoService from '../../infra/kakao.service';
import distanceService from '../distance/distance.service';
import AppError from '../../common/errors/AppError';
import { Prisma, MilitaryType } from '../../generated/prisma/client.js';
import { ScheduleInput, UnitQueryInput, TrainingLocationData } from '../../types/unit.types';

// 서비스 입력 타입들
type RawUnitInput = RawUnitData;
type ScheduleData = ScheduleInput;

/**
 * 날짜 문자열을 UTC 자정으로 변환 (시간 없는 날짜 전용)
 * 예: "2026-01-04" -> 2026-01-04T00:00:00.000Z
 */
const toUTCMidnight = (dateValue: string | Date | null | undefined): Date | null => {
  if (!dateValue) return null;
  const dateStr =
    typeof dateValue === 'string' ? dateValue.split('T')[0] : dateValue.toISOString().split('T')[0];
  return new Date(`${dateStr}T00:00:00.000Z`);
};

interface UnitBasicInfoInput {
  name?: string;
  unitType?: MilitaryType;
  wideArea?: string;
  region?: string;
  addressDetail?: string;
  detailAddress?: string;
}

interface UnitContactInput {
  officerName?: string;
  officerPhone?: string;
  officerEmail?: string;
}

class UnitService {
  // --- 등록 ---

  /**
   * 부대 단건 등록 (일정 자동 생성 포함)
   * - educationStart ~ educationEnd 사이의 날짜를 일정으로 생성
   * - excludedDates는 제외하고 교육 가능한 날만 스케줄에 추가
   */
  async registerSingleUnit(rawData: RawUnitInput) {
    try {
      const cleanData = toCreateUnitDto(rawData);

      // 교육 기간에서 일정 자동 계산 (excludedDates 배열 직접 사용)
      const schedules = this._calculateSchedules(
        rawData.educationStart,
        rawData.educationEnd,
        rawData.excludedDates || [],
      );

      // 부대 + 교육장소 + 일정 한 번에 생성
      const unit = await unitRepository.createUnitWithNested(
        cleanData,
        rawData.trainingLocations || [],
        schedules,
      );

      // 스케줄이 있으면 활성 강사들에 대해 거리 행 미리 생성
      if (schedules.length > 0) {
        await distanceService.createDistanceRowsForNewUnit(unit.id);
      }

      return unit;
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('부대명(name)은 필수입니다.')) {
        throw new AppError(e.message, 400, 'VALIDATION_ERROR');
      }
      throw e;
    }
  }

  /**
   * 엑셀 파일 처리 및 일괄 등록 (Upsert 로직)
   * - 부대명이 DB에 없으면: 새 부대 생성
   * - 부대명이 DB에 있으면: 기존 부대에 새 교육장소만 추가 (중복 제외)
   */
  async processExcelDataAndRegisterUnits(rawRows: Record<string, unknown>[]) {
    const rawDataList = groupExcelRowsByUnit(rawRows);
    return await this.upsertMultipleUnits(rawDataList);
  }

  /**
   * Upsert 로직으로 부대 등록/업데이트
   */
  async upsertMultipleUnits(dataArray: RawUnitInput[]) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new AppError('등록할 데이터가 없습니다.', 400, 'VALIDATION_ERROR');
    }

    // 1. 모든 부대명 추출 (중복 제거)
    const allNames = dataArray.map((d) => d.name?.trim()).filter((n): n is string => !!n);
    const uniqueNames = Array.from(new Set(allNames));

    if (uniqueNames.length === 0) {
      throw new AppError('유효한 부대명이 없습니다.', 400, 'VALIDATION_ERROR');
    }

    // 2. 부대 일괄 조회 (Bulk Read)
    const existingUnits = await unitRepository.findUnitsByNames(uniqueNames);
    const existingUnitMap = new Map(existingUnits.map((u) => [u.name, u]));

    let created = 0;
    let updated = 0;
    let locationsAdded = 0;
    let locationsSkipped = 0;

    const newUnitsToCreate: RawUnitInput[] = [];
    const trainingLocationsToCreate: {
      trainingPeriodId: number;
      location: TrainingLocationData;
    }[] = [];

    // 3. 데이터 분류 및 처리
    for (const rawData of dataArray) {
      const unitName = rawData.name?.trim();
      if (!unitName) continue;

      const existingUnit = existingUnitMap.get(unitName);

      if (existingUnit) {
        // [기존 부대] -> 첫 번째 TrainingPeriod의 교육장소에 중복 체크 후 추가
        updated++;

        // 첫 번째 TrainingPeriod 가져오기
        const firstPeriod = existingUnit.trainingPeriods[0];
        if (!firstPeriod) {
          // TrainingPeriod가 없으면 스킵 (나중에 별도로 생성 필요)
          continue;
        }

        if (rawData.trainingLocations && rawData.trainingLocations.length > 0) {
          // 기존 장소 이름 Set (TrainingPeriod 내 모든 locations)
          const existingPlaceNames = new Set(
            firstPeriod.locations.map((l: { originalPlace: string | null }) => l.originalPlace),
          );

          for (const loc of rawData.trainingLocations) {
            const placeName = loc.originalPlace;
            // 메모리 상 중복 체크
            if (placeName && existingPlaceNames.has(placeName)) {
              locationsSkipped++;
            } else {
              // 신규 장소 매핑 대기 (엑셀 내 중복 방지 위해 Set에도 추가)
              if (placeName) existingPlaceNames.add(placeName);
              trainingLocationsToCreate.push({
                trainingPeriodId: firstPeriod.id,
                location: loc,
              });
              locationsAdded++;
            }
          }
        }
      } else {
        // [신규 부대] -> 리스트에 추가 (나중에 청크 처리)
        newUnitsToCreate.push(rawData);
      }
    }

    // 4. 실행
    // 4-1. 신규 부대 등록 (청크 처리: 50개씩)
    const CHUNK_SIZE = 50;
    for (let i = 0; i < newUnitsToCreate.length; i += CHUNK_SIZE) {
      const chunk = newUnitsToCreate.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (data) => {
          try {
            await this.registerSingleUnit(data);
            created++;
            locationsAdded += data.trainingLocations?.length || 0;
          } catch (e) {
            console.error(`[UnitService] Failed to register unit ${data.name}:`, e);
          }
        }),
      );
    }

    // 4-2. 기존 부대 장소 일괄 추가 (Bulk Insert)
    if (trainingLocationsToCreate.length > 0) {
      await unitRepository.bulkAddTrainingLocations(trainingLocationsToCreate);
    }

    // 5. 비동기 좌표 변환 (백그라운드)
    this.updateUnitCoordsInBackground().catch((err) => {
      console.error('Background Geocoding Error:', err);
    });

    return {
      created,
      updated,
      locationsAdded,
      locationsSkipped,
    };
  }

  /**
   * 좌표가 없는 부대들을 찾아 Geocoding 수행 (비동기 처리용)
   * - lat이 null이고 addressDetail이 있는 부대 대상
   */
  async updateUnitCoordsInBackground() {
    console.log('[UnitService] Starting background geocoding...');

    // 1. 좌표가 없는 부대 조회 (최대 100개씩 처리)
    const units = await unitRepository.findUnitsWithoutCoords(100);
    if (units.length === 0) {
      console.log('[UnitService] No units needing geocoding.');
      return;
    }

    console.log(`[UnitService] Found ${units.length} units to geocode.`);

    // 2. 순차적으로 처리 (Rate Limit 고려)
    let successCount = 0;

    for (const unit of units) {
      if (!unit.addressDetail) continue;

      const coords = await kakaoService.addressToCoordsOrNull(unit.addressDetail);
      if (coords) {
        await unitRepository.updateCoords(unit.id, coords.lat, coords.lng);
        successCount++;
        // 약간의 딜레이
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    console.log(`[UnitService] Finished geocoding. Updated ${successCount}/${units.length} units.`);
  }

  /**
   * 일괄 등록 (내부 로직 - 기존 호환용)
   * 각 부대별로 registerSingleUnit을 호출하여 일정 자동 생성
   */
  async registerMultipleUnits(dataArray: RawUnitInput[]) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new AppError('등록할 데이터가 없습니다.', 400, 'VALIDATION_ERROR');
    }

    const results: unknown[] = [];
    const errors: { name: string; error: string }[] = [];

    for (const rawData of dataArray) {
      try {
        const unit = await this.registerSingleUnit(rawData);
        results.push(unit);
      } catch (e: unknown) {
        const name = rawData.name || '(부대명 없음)';
        const message = e instanceof Error ? e.message : '알 수 없는 오류';
        errors.push({ name, error: message });
      }
    }

    return {
      count: results.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // --- 조회 ---

  /**
   * 목록 조회
   */
  /**
   * 목록 조회
   */
  async searchUnitList(query: UnitQueryInput & { sortField?: string; sortOrder?: 'asc' | 'desc' }) {
    const paging = buildPaging(query);
    const where = buildUnitWhere(query);

    let orderBy: Prisma.UnitOrderByWithRelationInput | undefined;
    if (query.sortField && query.sortOrder) {
      if (query.sortField === 'name') orderBy = { name: query.sortOrder };
      else if (query.sortField === 'unitType') orderBy = { unitType: query.sortOrder };
      else if (query.sortField === 'region') orderBy = { region: query.sortOrder };
      else if (query.sortField === 'wideArea') orderBy = { wideArea: query.sortOrder };
      else if (query.sortField === 'date') orderBy = { id: query.sortOrder };
      // NOTE: educationStart는 이제 TrainingPeriod에 있음 - 정렬 지원 안 함 (id로 대체)
    }

    const { total, units } = await unitRepository.findUnitsByFilterAndCount({
      skip: paging.skip,
      take: paging.take,
      where,
      orderBy,
    });

    return {
      data: units,
      meta: {
        total,
        page: paging.page,
        limit: paging.limit,
        lastPage: Math.ceil(total / paging.limit),
      },
    };
  }

  /**
   * 부대 상세 정보 조회
   */
  async getUnitDetailWithSchedules(id: number | string) {
    const unit = await unitRepository.findUnitWithRelations(id);
    if (!unit) {
      throw new AppError('해당 부대를 찾을 수 없습니다.', 404, 'UNIT_NOT_FOUND');
    }
    return unit;
  }

  // --- 수정 ---

  /**
   * 부대 기본 정보 수정
   */
  async modifyUnitBasicInfo(id: number | string, rawData: UnitBasicInfoInput) {
    const updateData: Prisma.UnitUpdateInput = {};

    if (rawData.name !== undefined) updateData.name = rawData.name || undefined; // name은 필수라 null 불가
    if (rawData.unitType !== undefined) updateData.unitType = rawData.unitType;
    if (rawData.wideArea !== undefined)
      updateData.wideArea = rawData.wideArea === '' ? null : rawData.wideArea;
    if (rawData.region !== undefined)
      updateData.region = rawData.region === '' ? null : rawData.region;

    // 기존 정보 조회하여 주소 변경 여부 확인
    const existingUnit = await unitRepository.findUnitWithRelations(id);
    if (!existingUnit) {
      throw new AppError('해당 부대를 찾을 수 없습니다.', 404, 'UNIT_NOT_FOUND');
    }

    if (
      rawData.addressDetail !== undefined &&
      rawData.addressDetail !== existingUnit.addressDetail
    ) {
      updateData.addressDetail = rawData.addressDetail === '' ? null : rawData.addressDetail;
      updateData.lat = null;
      updateData.lng = null;
    }

    return await unitRepository.updateUnitById(id, updateData);
  }

  /**
   * 부대 담당자 정보 수정 (TrainingPeriod에 저장)
   * NOTE: 이제 officer 정보는 TrainingPeriod에 있음
   */
  async modifyUnitContactInfo(
    id: number | string,
    rawData: UnitContactInput,
    trainingPeriodId?: number,
  ) {
    // 부대 조회
    const unit = await unitRepository.findUnitWithRelations(id);
    if (!unit) {
      throw new AppError('해당 부대를 찾을 수 없습니다.', 404, 'UNIT_NOT_FOUND');
    }

    // TrainingPeriod ID가 없으면 첫 번째 period 사용
    const targetPeriodId = trainingPeriodId ?? unit.trainingPeriods[0]?.id;
    if (!targetPeriodId) {
      throw new AppError('교육기간이 없습니다.', 400, 'NO_TRAINING_PERIOD');
    }

    const updateData = {
      officerName: rawData.officerName === '' ? null : rawData.officerName,
      officerPhone: rawData.officerPhone === '' ? null : rawData.officerPhone,
      officerEmail: rawData.officerEmail === '' ? null : rawData.officerEmail,
    };
    return await unitRepository.updateTrainingPeriod(targetPeriodId, updateData);
  }

  /**
   * 부대 기본 정보만 수정
   * - 일정/장소/주소는 별도 API로 처리
   * NOTE: officer 정보는 TrainingPeriod에 있으므로 별도 API 사용
   */
  async updateUnitFull(id: number | string, rawData: RawUnitInput) {
    const unit = await unitRepository.findUnitWithRelations(id);
    if (!unit) {
      throw new AppError('해당 부대를 찾을 수 없습니다.', 404, 'UNIT_NOT_FOUND');
    }

    // 기본 정보만 업데이트 (Unit 테이블 필드들만)
    const unitUpdateData: Prisma.UnitUpdateInput = {};
    if (rawData.name !== undefined) unitUpdateData.name = rawData.name;
    if (rawData.unitType !== undefined)
      unitUpdateData.unitType =
        rawData.unitType as Prisma.NullableEnumMilitaryTypeFieldUpdateOperationsInput['set'];
    if (rawData.wideArea !== undefined) unitUpdateData.wideArea = rawData.wideArea;
    if (rawData.region !== undefined) unitUpdateData.region = rawData.region;
    if (rawData.addressDetail !== undefined) unitUpdateData.addressDetail = rawData.addressDetail;
    if (rawData.detailAddress !== undefined) unitUpdateData.detailAddress = rawData.detailAddress;
    // NOTE: officerName/Phone/Email은 이제 TrainingPeriod에 있음 - modifyUnitContactInfo 사용

    // 주소 변경 시 좌표 재계산
    if (rawData.addressDetail !== undefined && rawData.addressDetail !== unit.addressDetail) {
      if (!rawData.addressDetail || rawData.addressDetail.trim() === '') {
        unitUpdateData.lat = null;
        unitUpdateData.lng = null;
      } else {
        const coords = await kakaoService.addressToCoordsOrNull(rawData.addressDetail);
        if (coords) {
          unitUpdateData.lat = coords.lat;
          unitUpdateData.lng = coords.lng;
        } else {
          unitUpdateData.lat = null;
          unitUpdateData.lng = null;
        }
      }
    }

    return await unitRepository.updateUnitById(id, unitUpdateData);
  }

  /**
   * 부대 주소만 수정 (좌표 재계산)
   */
  async updateUnitAddress(id: number | string, addressDetail: string) {
    const unit = await unitRepository.findUnitWithRelations(id);
    if (!unit) {
      throw new AppError('해당 부대를 찾을 수 없습니다.', 404, 'UNIT_NOT_FOUND');
    }

    // 주소가 같으면 아무것도 하지 않음
    if (addressDetail === unit.addressDetail) {
      return unit;
    }

    const updateData: Prisma.UnitUpdateInput = {
      addressDetail: addressDetail === '' ? null : addressDetail,
    };

    // 주소가 비어있으면 좌표도 null
    if (!addressDetail || addressDetail.trim() === '') {
      updateData.lat = null;
      updateData.lng = null;
    } else {
      // 주소가 변경되었으면 즉시 좌표 재계산
      const coords = await kakaoService.addressToCoordsOrNull(addressDetail);
      if (coords) {
        updateData.lat = coords.lat;
        updateData.lng = coords.lng;
      } else {
        updateData.lat = null;
        updateData.lng = null;
      }
    }

    const updated = await unitRepository.updateUnitById(id, updateData);

    // 주소 변경 시 해당 부대의 모든 거리 무효화 (재계산 대기열에 추가)
    await distanceService.invalidateDistancesForUnit(Number(id));

    return updated;
  }

  /**
   * @deprecated 새 구조에서는 updateTrainingPeriod 사용
   * 부대 일정만 수정 (교육시작, 교육종료, 교육불가일자)
   */
  async updateUnitSchedule(
    _id: number | string,
    _rawData: {
      educationStart?: string | Date | null;
      educationEnd?: string | Date | null;
      excludedDates?: string[];
    },
  ) {
    throw new AppError(
      '이 함수는 더 이상 사용되지 않습니다. 대신 TrainingPeriod를 수정하세요.',
      400,
      'DEPRECATED',
    );
  }

  // --- 일정 관리 ---

  /**
   * 부대 일정 추가
   */
  async addScheduleToUnit(unitId: number | string, dateStr: string) {
    const unit = await unitRepository.findUnitWithRelations(unitId);
    if (!unit) {
      throw new AppError('해당 부대를 찾을 수 없습니다.', 404, 'NOT_FOUND');
    }

    // date 필수 체크
    if (!dateStr || typeof dateStr !== 'string') {
      throw new AppError('date는 필수입니다.', 400, 'VALIDATION_ERROR');
    }

    // ISO가 오면 YYYY-MM-DD만 잘라서 date-only로 정규화
    const dateOnly = dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr;

    // YYYY-MM-DD 기본 검증
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      throw new AppError('유효하지 않은 날짜 형식입니다. (YYYY-MM-DD)', 400, 'VALIDATION_ERROR');
    }

    return await unitRepository.insertUnitSchedule(unitId, dateOnly);
  }

  /**
   * 특정 교육 일정 삭제
   */
  async removeScheduleFromUnit(scheduleId: number | string) {
    if (!scheduleId || isNaN(Number(scheduleId))) {
      throw new AppError('유효하지 않은 일정 ID입니다.', 400, 'VALIDATION_ERROR');
    }

    return await unitRepository.deleteUnitSchedule(scheduleId);
  }

  // --- 삭제 ---

  /**
   * 부대 영구 삭제
   */
  async removeUnitPermanently(id: number | string) {
    return await unitRepository.deleteUnitById(id);
  }

  /**
   * 부대 다건 일괄 삭제 (JS 기능 유지)
   */
  async removeMultipleUnits(ids: (number | string)[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('삭제할 부대 ID가 없습니다.', 400, 'VALIDATION_ERROR');
    }
    return await unitRepository.deleteManyUnits(ids);
  }

  /**
   * 검색 조건에 맞는 모든 부대 삭제
   */
  async removeUnitsByFilter(query: UnitQueryInput) {
    const where = buildUnitWhere(query);
    return await unitRepository.deleteUnitsByFilter(where);
  }

  // --- 헬퍼 (JS에서 이식) ---

  /**
   * 교육불가 기간(시작~종료)을 YYYY-MM-DD 문자열 배열로 변환
   */
  _getExcludedDateStrings(excludedStart?: string | Date, excludedEnd?: string | Date): string[] {
    if (!excludedStart || !excludedEnd) return [];

    const start = new Date(excludedStart);
    const end = new Date(excludedEnd);
    const dates: string[] = [];

    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * 교육 기간에서 일정 자동 계산 (제외된 날짜는 스킵)
   * 날짜는 UTC 자정으로 저장
   */
  _calculateSchedules(
    start: string | Date | undefined,
    end: string | Date | undefined,
    excludedDateStrings: string[] = [],
  ): ScheduleData[] {
    if (!start || !end) return []; // 수정: 둘 다 있어야 함
    const startDate = new Date(start);
    const endDate = new Date(end);
    const excludedSet = new Set(excludedDateStrings);

    const schedules: ScheduleData[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      // 제외된 날짜는 스케줄에 추가하지 않음
      if (!excludedSet.has(dateStr)) {
        // UTC 자정으로 저장 (타임존 일관성)
        schedules.push({
          date: new Date(`${dateStr}T00:00:00.000Z`),
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return schedules;
  }

  // ===== 일정 삭제/추가 비즈니스 로직 =====

  /**
   * 일정 삭제 처리
   * - Repository에서 크레딧 부여 및 자동 재배정 로직 수행
   */
  async handleScheduleDeletion(scheduleIds: number[], unitName?: string) {
    return unitRepository.removeSchedulesFromPeriod(scheduleIds, unitName);
  }

  /**
   * 일정 추가 처리 (비즈니스 로직 포함)
   * - 크레딧 있는 강사 자동 배정 시도
   * - 배정 성공 시 크레딧 차감
   */
  async handleScheduleAddition(trainingPeriodId: number, dates: (Date | string)[]) {
    if (dates.length === 0) return { added: 0, autoAssigned: 0 };

    // 일정 추가
    const result = await unitRepository.addSchedulesToPeriod(trainingPeriodId, dates);

    // TODO: 크레딧 있는 강사 자동 배정 로직 (필요시 추가)
    // 현재는 일정만 추가하고, 자동배정은 별도 API로 처리

    return { added: result.count, autoAssigned: 0 };
  }
}

export default new UnitService();

// CommonJS 호환
module.exports = new UnitService();
