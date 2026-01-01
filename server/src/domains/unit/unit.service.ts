// server/src/domains/unit/unit.service.ts
import unitRepository from './unit.repository';
import { buildPaging, buildUnitWhere } from './unit.filters';
import { toCreateUnitDto, groupExcelRowsByUnit, RawUnitData } from './unit.mapper';
import AppError from '../../common/errors/AppError';
import { Prisma, MilitaryType } from '@prisma/client';
import { ScheduleInput, UnitQueryInput } from '../../types/unit.types';

// 서비스 입력 타입들
type RawUnitInput = RawUnitData;
type ScheduleData = ScheduleInput;

interface UnitBasicInfoInput {
  name?: string;
  unitType?: MilitaryType;
  wideArea?: string;
  region?: string;
  addressDetail?: string;
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
   * - educationStart ~ educationEnd 사이의 모든 날짜를 일정으로 생성
   * - excludedStart ~ excludedEnd 범위의 날짜는 isExcluded: true로 설정
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
      return await unitRepository.createUnitWithNested(
        cleanData,
        rawData.trainingLocations || [],
        schedules,
      );
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

    let created = 0;
    let updated = 0;
    let locationsAdded = 0;
    let locationsSkipped = 0;
    const errors: { name: string; error: string }[] = [];

    for (const rawData of dataArray) {
      try {
        const unitName = rawData.name?.trim();
        if (!unitName) {
          errors.push({ name: '(부대명 없음)', error: '부대명은 필수입니다.' });
          continue;
        }

        // DB에서 같은 부대명 조회
        const existingUnit = await unitRepository.findUnitByName(unitName);

        if (existingUnit) {
          // 기존 부대 → 교육장소만 추가 (중복 제외)
          if (rawData.trainingLocations && rawData.trainingLocations.length > 0) {
            const result = await unitRepository.addTrainingLocationsIfNotExists(
              existingUnit.id,
              rawData.trainingLocations,
            );
            locationsAdded += result.added;
            locationsSkipped += result.skipped;
          }
          updated++;
        } else {
          // 새 부대 생성
          await this.registerSingleUnit(rawData);
          created++;
          locationsAdded += rawData.trainingLocations?.length || 0;
        }
      } catch (e: unknown) {
        const name = rawData.name || '(부대명 없음)';
        const message = e instanceof Error ? e.message : '알 수 없는 오류';
        errors.push({ name, error: message });
      }
    }

    // 2. 비동기 좌표 변환 트리거 (응답 지연 없이 백그라운드 실행)
    this.updateUnitCoordsInBackground().catch((err) => {
      console.error('[UnitService] Background geocoding failed:', err);
    });

    return {
      created,
      updated,
      locationsAdded,
      locationsSkipped,
      errors: errors.length > 0 ? errors : undefined,
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

    // geocoding.service를 동적 import 하거나 상단 import 사용
    // 여기서는 상단에 import 했다고 가정하고 사용하지만,
    // 실제로는 circular dependency 방지를 위해 필요시 동적 import 사용 가능
    // (현재 구조상 unit.service -> geocoding.service는 문제 없음)
    const geocodingService = require('../../infra/geocoding.service').default;

    for (const unit of units) {
      if (!unit.addressDetail) continue;

      const coords = await geocodingService.addressToCoords(unit.addressDetail);
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
  async searchUnitList(query: UnitQueryInput) {
    const paging = buildPaging(query);
    const where = buildUnitWhere(query);

    const { total, units } = await unitRepository.findUnitsByFilterAndCount({
      skip: paging.skip,
      take: paging.take,
      where,
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

    if (rawData.name !== undefined) updateData.name = rawData.name === '' ? null : rawData.name;
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
   * 부대 담당자 정보 수정
   */
  async modifyUnitContactInfo(id: number | string, rawData: UnitContactInput) {
    const updateData = {
      officerName: rawData.officerName === '' ? null : rawData.officerName,
      officerPhone: rawData.officerPhone === '' ? null : rawData.officerPhone,
      officerEmail: rawData.officerEmail === '' ? null : rawData.officerEmail,
    };
    return await unitRepository.updateUnitById(id, updateData);
  }

  /**
   * 부대 전체 정보 수정 (기본정보 + 교육장소 + 일정)
   * - 일정은 항상 전송받은 schedules 배열로 덮어쓰기
   * - excludedStart/excludedEnd가 있으면 educationStart/End 기반으로 일정 재생성
   */
  async updateUnitFull(id: number | string, rawData: RawUnitInput) {
    const unit = await unitRepository.findUnitWithRelations(id);
    if (!unit) {
      throw new AppError('해당 부대를 찾을 수 없습니다.', 404, 'UNIT_NOT_FOUND');
    }

    // 기본 정보 업데이트 데이터 구성
    const unitUpdateData: Prisma.UnitUpdateInput = {};
    if (rawData.name !== undefined) unitUpdateData.name = rawData.name;
    if (rawData.unitType !== undefined)
      unitUpdateData.unitType =
        rawData.unitType as Prisma.NullableEnumMilitaryTypeFieldUpdateOperationsInput['set'];
    if (rawData.wideArea !== undefined) unitUpdateData.wideArea = rawData.wideArea;
    if (rawData.region !== undefined) unitUpdateData.region = rawData.region;
    if (rawData.addressDetail !== undefined && rawData.addressDetail !== unit.addressDetail) {
      unitUpdateData.addressDetail = rawData.addressDetail;
      unitUpdateData.lat = null;
      unitUpdateData.lng = null;
    }
    if (rawData.officerName !== undefined) unitUpdateData.officerName = rawData.officerName;
    if (rawData.officerPhone !== undefined) unitUpdateData.officerPhone = rawData.officerPhone;
    if (rawData.officerEmail !== undefined) unitUpdateData.officerEmail = rawData.officerEmail;
    if (rawData.educationStart !== undefined)
      unitUpdateData.educationStart = rawData.educationStart
        ? new Date(rawData.educationStart)
        : null;
    if (rawData.educationEnd !== undefined)
      unitUpdateData.educationEnd = rawData.educationEnd ? new Date(rawData.educationEnd) : null;
    if (rawData.workStartTime !== undefined)
      unitUpdateData.workStartTime = rawData.workStartTime ? new Date(rawData.workStartTime) : null;
    if (rawData.workEndTime !== undefined)
      unitUpdateData.workEndTime = rawData.workEndTime ? new Date(rawData.workEndTime) : null;
    if (rawData.lunchStartTime !== undefined)
      unitUpdateData.lunchStartTime = rawData.lunchStartTime
        ? new Date(rawData.lunchStartTime)
        : null;
    if (rawData.lunchEndTime !== undefined)
      unitUpdateData.lunchEndTime = rawData.lunchEndTime ? new Date(rawData.lunchEndTime) : null;

    // 일정 계산 로직:
    // 1. excludedDates가 정의되어 있으면 (빈 배열 포함) -> 일정 재계산
    // 2. excludedDates가 undefined이고 schedules가 있으면 -> 그 schedules 사용
    // 3. 둘 다 없으면 -> 기존 일정 유지
    let schedules: ScheduleData[] | undefined;
    if (rawData.excludedDates !== undefined) {
      // excludedDates가 정의되어 있으면 educationStart/End 기반으로 일정 재생성
      const start = rawData.educationStart || unit.educationStart || undefined;
      const end = rawData.educationEnd || unit.educationEnd || undefined;
      schedules = this._calculateSchedules(start, end, rawData.excludedDates);
    } else if (rawData.schedules && rawData.schedules.length > 0) {
      // excludedDates가 없고 schedules 배열이 있으면 그것으로 업데이트
      schedules = rawData.schedules.map((s) => ({
        date: typeof s.date === 'string' ? new Date(s.date) : s.date,
        isExcluded: s.isExcluded ?? false,
      }));
    }
    // schedules가 undefined이면 updateUnitWithNested에서 기존 일정 유지

    return await unitRepository.updateUnitWithNested(
      id,
      unitUpdateData,
      rawData.trainingLocations,
      schedules,
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
   * 교육 기간에서 일정 자동 계산 (isExcluded 포함)
   */
  _calculateSchedules(
    start: string | Date | undefined,
    end: string | Date | undefined,
    excludedDateStrings: string[] = [],
  ): ScheduleData[] {
    if (!start || !end) return [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const excludedSet = new Set(excludedDateStrings);

    const schedules: ScheduleData[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      schedules.push({
        date: new Date(current),
        isExcluded: excludedSet.has(dateStr),
      });
      current.setDate(current.getDate() + 1);
    }
    return schedules;
  }
}

export default new UnitService();

// CommonJS 호환
module.exports = new UnitService();
