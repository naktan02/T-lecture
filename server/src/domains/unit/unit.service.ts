// server/src/domains/unit/unit.service.ts
import unitRepository from './unit.repository';
import { buildPaging, buildUnitWhere } from './unit.filters';
import { toCreateUnitDto, groupExcelRowsByUnit, RawUnitData, normalizePhone } from './unit.mapper';
import kakaoService from '../../infra/kakao.service';
import distanceService from '../distance/distance.service';
import AppError from '../../common/errors/AppError';
import logger from '../../config/logger';
import { Prisma, MilitaryType } from '../../generated/prisma/client.js';
import ExcelJS from 'exceljs';
import {
  ScheduleInput,
  UnitQueryInput,
  TrainingLocationData,
  CreateTrainingPeriodInput,
  UpdateTrainingPeriodScheduleLocationsInput,
  UpdateUnitWithPeriodsInput,
  TrainingLocationUpdateInput,
} from '../../types/unit.types';

// 서비스 입력 타입들
type RawUnitInput = RawUnitData;
type ScheduleData = ScheduleInput;

/**
 * 날짜 문자열을 UTC 자정으로 변환 (시간 없는 날짜 전용)
 * 예: "2026-01-04" -> 2026-01-04T00:00:00.000Z
 */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const toDateOnlyString = (value: string): string | null => {
  if (!value) return null;
  if (DATE_ONLY_RE.test(value)) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
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
   * - 주소를 좌표로 변환 (실패해도 부대 생성 진행)
   */
  async registerSingleUnit(rawData: RawUnitInput, lectureYear?: number) {
    const errorMessages: string[] = [];
    let validationStatus: 'Valid' | 'Invalid' = 'Valid';

    try {
      const cleanData = toCreateUnitDto(rawData, lectureYear);

      // 1. 필수 교육 기간 정보 확인
      if (!rawData.educationStart || !rawData.educationEnd) {
        errorMessages.push('교육 시작일과 종료일은 필수입니다.');
      }

      // 2. 날짜 형식 및 논리성 검증
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (rawData.educationStart) {
        startDate = new Date(rawData.educationStart);
        if (isNaN(startDate.getTime())) {
          errorMessages.push(`교육 시작일 형식이 유효하지 않습니다: ${rawData.educationStart}`);
          startDate = null;
        }
      }
      if (rawData.educationEnd) {
        endDate = new Date(rawData.educationEnd);
        if (isNaN(endDate.getTime())) {
          errorMessages.push(`교육 종료일 형식이 유효하지 않습니다: ${rawData.educationEnd}`);
          endDate = null;
        }
      }

      if (startDate && endDate && startDate > endDate) {
        errorMessages.push('교육 종료일이 시작일보다 빠를 수 없습니다.');
      }

      // 3. 주소 → 좌표 변환 (일일 한도 체크 포함)
      let lat: number | null = null;
      let lng: number | null = null;
      if (cleanData.addressDetail) {
        const coords = await kakaoService.addressToCoordsWithLimit(cleanData.addressDetail);
        if (coords && !coords.limitExceeded) {
          lat = coords.lat;
          lng = coords.lng;
          logger.info(`[UnitService] Geocoded: ${cleanData.addressDetail} → (${lat}, ${lng})`);
        } else if (coords?.limitExceeded) {
          logger.warn(`[UnitService] Geocode limit exceeded for: ${cleanData.name}`);
        } else {
          errorMessages.push(`주소를 검색할 수 없습니다: ${cleanData.addressDetail}`);
        }
      } else {
        errorMessages.push('부대 주소 정보가 없습니다.');
      }

      // 4. 스케줄 계산
      let schedules: ScheduleData[] = [];
      if (startDate && endDate) {
        schedules = this._calculateSchedules(
          rawData.educationStart,
          rawData.educationEnd,
          rawData.excludedDates || [],
        );
      }

      if (schedules.length === 0 && startDate && endDate) {
        errorMessages.push('생성된 교육 일정이 없습니다. (교육 불가일자 확인 필요)');
      }

      // 5. 최초계획 데이터 계산 (보고서용)
      const initialPeriodDays = schedules.length; // 교육일정 개수
      const initialLocationCount = rawData.trainingLocations?.length || 0; // 교육장소 개수

      // 검증 상태 결정
      if (errorMessages.length > 0) {
        validationStatus = 'Invalid';
      }

      // 좌표 및 검증 상태를 Unit 데이터에 추가
      const unitDataToSave = {
        ...cleanData,
        lat,
        lng,
        validationStatus,
        validationMessage: errorMessages.length > 0 ? errorMessages.join('; ') : null,
      };

      // 부대 + 교육기간(모든 필드) + 일정 한 번에 생성
      const unit = await unitRepository.createUnitWithTrainingPeriod(unitDataToSave, {
        name: '정규교육',
        // 근무 시간
        workStartTime: rawData.workStartTime,
        workEndTime: rawData.workEndTime,
        lunchStartTime: rawData.lunchStartTime,
        lunchEndTime: rawData.lunchEndTime,
        // 담당관 정보
        officerName: rawData.officerName,
        officerPhone: normalizePhone(rawData.officerPhone),
        officerEmail: rawData.officerEmail,
        // 시설 정보 (RawUnitInput에서 가져옴 - 확장 필요)
        hasCateredMeals: (rawData as Record<string, unknown>).hasCateredMeals === true,
        hasHallLodging: (rawData as Record<string, unknown>).hasHallLodging === true,
        allowsPhoneBeforeAfter:
          (rawData as Record<string, unknown>).allowsPhoneBeforeAfter === true,
        // 교육장소 및 일정
        locations: rawData.trainingLocations || [],
        schedules,
        // 최초계획 (보고서용)
        initialPeriodDays,
        initialLocationCount,
      });

      // 스케줄이 있으면 활성 강사들에 대해 거리 행 미리 생성
      if (unit && schedules.length > 0) {
        await distanceService.createDistanceRowsForNewUnit(unit.id).catch((err) => {
          logger.error(`[UnitService] Failed to create distance rows: ${err}`);
        });
      }

      return unit;
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('부대명(name)은 필수입니다.')) {
        throw new AppError(e.message, 400, 'VALIDATION_ERROR');
      }
      logger.error(`[UnitService] Unexpected error in registerSingleUnit: ${e}`);
      throw e;
    }
  }

  /**
   * 엑셀 파일 처리 및 일괄 등록 (Upsert 로직)
   * - 부대명이 DB에 없으면: 새 부대 생성
   * - 부대명이 DB에 있으면: 기존 부대에 새 교육장소만 추가 (중복 제외)
   * @param lectureYear 메타데이터에서 추출한 강의년도 (모든 부대에 적용)
   */
  async processExcelDataAndRegisterUnits(rawRows: Record<string, unknown>[], lectureYear?: number) {
    const rawDataList = groupExcelRowsByUnit(rawRows);
    return await this.upsertMultipleUnits(rawDataList, lectureYear);
  }

  /**
   * Upsert 로직으로 부대 등록/업데이트
   */
  async upsertMultipleUnits(dataArray: RawUnitInput[], lectureYear?: number) {
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
            await this.registerSingleUnit(data, lectureYear);
            created++;
            locationsAdded += data.trainingLocations?.length || 0;
          } catch (e) {
            // registerSingleUnit이 name이 없는 경우 등에 대헤 throw 할 수 있음
            logger.error(`[UnitService] Critical failure registering unit ${data.name}: ${e}`);
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
      logger.error(`Background Geocoding Error: ${err}`);
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
    logger.info('[UnitService] Starting background geocoding...');

    // 1. 좌표가 없는 부대 조회 (최대 100개씩 처리)
    const units = await unitRepository.findUnitsWithoutCoords(100);
    if (units.length === 0) {
      logger.info('[UnitService] No units needing geocoding.');
      return;
    }

    logger.info(`[UnitService] Found ${units.length} units to geocode.`);

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

    logger.info(`[UnitService] Finished geocoding. Updated ${successCount}/${units.length} units.`);
  }

  /**
   * 일괄 등록 (내부 로직 - 기존 호환용)
   * 각 부대별로 registerSingleUnit을 호출하여 일정 자동 생성
   */
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
   * 부대 기본 정보 수정 (하위 호환용)
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
      updateData.lat = null;
      updateData.lng = null;
    }

    // 수정 시 검증 상태 초기화 ('Valid')
    updateData.validationStatus = 'Valid';
    updateData.validationMessage = null;

    const updated = await unitRepository.updateUnitById(id, updateData);

    return updated;
  }

  /**
   * 부대 기본정보 + 교육기간별 정보 업데이트
   * - 기본정보: name, unitType, wideArea, region, detailAddress
   * - 교육기간: 근무시간, 담당관, 시설정보, 장소
   * - 일정/주소/교육기간 생성·삭제는 별도 API로 처리
   */
  async updateUnitWithPeriods(unitId: number, data: UpdateUnitWithPeriodsInput) {
    // 1. 기존 Unit 조회
    const existingUnit = await unitRepository.findUnitWithRelations(unitId);
    if (!existingUnit) {
      throw new AppError('해당 부대를 찾을 수 없습니다.', 404, 'UNIT_NOT_FOUND');
    }

    // 2. Unit 기본정보 업데이트
    const unitUpdateData: Prisma.UnitUpdateInput = {};
    if (data.name !== undefined) unitUpdateData.name = data.name;
    if (data.unitType !== undefined)
      unitUpdateData.unitType =
        data.unitType as Prisma.NullableEnumMilitaryTypeFieldUpdateOperationsInput['set'];
    if (data.wideArea !== undefined) unitUpdateData.wideArea = data.wideArea || null;
    if (data.region !== undefined) unitUpdateData.region = data.region || null;
    if (data.detailAddress !== undefined) unitUpdateData.detailAddress = data.detailAddress || null;

    // 수정 시 검증 상태 초기화
    unitUpdateData.validationStatus = 'Valid';
    unitUpdateData.validationMessage = null;

    if (Object.keys(unitUpdateData).length > 0) {
      await unitRepository.updateUnitById(unitId, unitUpdateData);
    }

    // 업데이트된 결과 반환
    return await unitRepository.findUnitWithRelations(unitId);
  }

  /**
   * 교육장소 동기화 (기존/신규/삭제 처리)
   */
  private async _syncLocations(periodId: number, locations: TrainingLocationUpdateInput[]) {
    // 기존 장소 조회
    const existingLocations = await unitRepository.findLocationsByPeriodId(periodId);
    const existingIds = existingLocations.map((l) => l.id);
    const incomingIds = locations.filter((l) => l.id).map((l) => l.id as number);

    // 삭제할 장소
    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));
    for (const locId of toDelete) {
      await unitRepository.deleteLocation(locId);
    }

    // 업데이트/생성
    for (const loc of locations) {
      if (loc.id) {
        await unitRepository.updateLocation(loc.id, {
          originalPlace: loc.originalPlace,
          changedPlace: loc.changedPlace || null,
          hasInstructorLounge: loc.hasInstructorLounge ?? false,
          hasWomenRestroom: loc.hasWomenRestroom ?? false,
          note: loc.note || null,
        });
      } else {
        await unitRepository.createLocation(periodId, {
          originalPlace: loc.originalPlace || '',
          changedPlace: loc.changedPlace || null,
          hasInstructorLounge: loc.hasInstructorLounge ?? false,
          hasWomenRestroom: loc.hasWomenRestroom ?? false,
          note: loc.note || null,
        });
      }
    }
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
      officerPhone: rawData.officerPhone === '' ? null : normalizePhone(rawData.officerPhone),
      officerEmail: rawData.officerEmail === '' ? null : rawData.officerEmail,
    };
    const updated = await unitRepository.updateTrainingPeriod(targetPeriodId, updateData);

    return updated;
  }

  /**
   * 교육기간 생성 (신규 추가)
   * - start/end/excluded를 기반으로 일정 자동 생성
   */
  async createTrainingPeriod(unitId: number, data: CreateTrainingPeriodInput) {
    const unit = await unitRepository.findUnitWithRelations(unitId);
    if (!unit) {
      throw new AppError('해당 부대를 찾을 수 없습니다.', 404, 'UNIT_NOT_FOUND');
    }

    let schedules: ScheduleData[] | undefined;
    if (data.startDate && data.endDate) {
      const normalizedStart = toDateOnlyString(data.startDate);
      const normalizedEnd = toDateOnlyString(data.endDate);
      if (!normalizedStart || !normalizedEnd) {
        throw new AppError('날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)', 400, 'INVALID_DATE');
      }
      if (normalizedStart > normalizedEnd) {
        throw new AppError('시작일이 종료일보다 늦습니다.', 400, 'INVALID_DATE_RANGE');
      }

      const normalizedExcludedDates = [
        ...new Set(
          (data.excludedDates || []).map((d) => toDateOnlyString(d)).filter(Boolean) as string[],
        ),
      ].sort();

      schedules = this._calculateSchedules(normalizedStart, normalizedEnd, normalizedExcludedDates);
    }

    // 최초계획 데이터 계산 (보고서용)
    const initialPeriodDays = schedules?.length || 0;
    const initialLocationCount = data.locations?.length || 0;

    const created = await unitRepository.createTrainingPeriod(unitId, {
      name: data.name,
      workStartTime: data.workStartTime
        ? new Date(`2000-01-01T${data.workStartTime}:00.000Z`)
        : null,
      workEndTime: data.workEndTime ? new Date(`2000-01-01T${data.workEndTime}:00.000Z`) : null,
      lunchStartTime: data.lunchStartTime
        ? new Date(`2000-01-01T${data.lunchStartTime}:00.000Z`)
        : null,
      lunchEndTime: data.lunchEndTime ? new Date(`2000-01-01T${data.lunchEndTime}:00.000Z`) : null,
      officerName: data.officerName || null,
      officerPhone: normalizePhone(data.officerPhone) || null,
      officerEmail: data.officerEmail || null,
      hasCateredMeals: data.hasCateredMeals ?? false,
      hasHallLodging: data.hasHallLodging ?? false,
      allowsPhoneBeforeAfter: data.allowsPhoneBeforeAfter ?? false,
      schedules,
      locations: data.locations,
      // 최초계획 (보고서용)
      initialPeriodDays,
      initialLocationCount,
    });

    return created;
  }

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

    const result = await unitRepository.insertUnitSchedule(unitId, dateOnly);

    return result;
  }

  /**
   * 특정 교육 일정 삭제
   */
  async removeScheduleFromUnit(scheduleId: number | string) {
    if (!scheduleId || isNaN(Number(scheduleId))) {
      throw new AppError('유효하지 않은 일정 ID입니다.', 400, 'VALIDATION_ERROR');
    }

    const result = await unitRepository.deleteUnitSchedule(scheduleId);

    return result;
  }

  // --- 삭제 ---

  /**
   * 부대 영구 삭제
   */
  async removeUnitPermanently(id: number | string) {
    const result = await unitRepository.deleteUnitById(id);
    return result;
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

  // ===== TrainingPeriod 일정 관리 =====

  /**
   * 교육기간 일정 삭제 전 배정 확인
   * - 삭제될 날짜에 배정된 강사가 있는지 확인
   */
  async checkScheduleAssignments(
    trainingPeriodId: number,
    schedulesToDelete: string[],
  ): Promise<{ hasAssignments: boolean; affectedInstructors: { name: string; date: string }[] }> {
    if (schedulesToDelete.length === 0) {
      return { hasAssignments: false, affectedInstructors: [] };
    }

    // 해당 TrainingPeriod의 일정 조회
    const schedules = await unitRepository.findSchedulesWithAssignments(trainingPeriodId);

    const affectedInstructors: { name: string; date: string }[] = [];
    const toDeleteSet = new Set(schedulesToDelete);

    for (const schedule of schedules) {
      const dateStr = schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : '';
      if (toDeleteSet.has(dateStr) && schedule.assignments.length > 0) {
        for (const assignment of schedule.assignments) {
          affectedInstructors.push({
            name: assignment.User?.name || '알 수 없음',
            date: dateStr,
          });
        }
      }
    }

    return {
      hasAssignments: affectedInstructors.length > 0,
      affectedInstructors,
    };
  }

  /**
   * 교육기간 일정 수정 (시작일, 종료일, 불가일자)
   * - 기존 일정과 비교하여 삭제/추가 계산
   * - 삭제 시 크레딧 부여 및 자동 재배정
   */
  /**
   * 교육기간 일정-장소 매칭 수정
   */
  async updateTrainingPeriodScheduleLocations(
    trainingPeriodId: number,
    data: UpdateTrainingPeriodScheduleLocationsInput,
  ) {
    const period = await unitRepository.findTrainingPeriodById(trainingPeriodId);
    if (!period) {
      throw new AppError('교육기간을 찾을 수 없습니다.', 404, 'TRAINING_PERIOD_NOT_FOUND');
    }

    // 1. 장소 동기화 (새 장소 생성, 기존 장소 업데이트)
    if (data.locations && data.locations.length > 0) {
      await this._syncLocations(trainingPeriodId, data.locations);
    }

    // 2. 갱신된 장소 목록 조회 (이름 -> id 매핑용)
    const updatedLocations = await unitRepository.findLocationsByPeriodId(trainingPeriodId);
    const locationNameToId = new Map<string, number>();
    for (const loc of updatedLocations) {
      if (loc.originalPlace) {
        locationNameToId.set(loc.originalPlace, loc.id);
      }
    }

    // 3. 일정 검증
    const schedules = await unitRepository.findSchedulesByPeriodId(trainingPeriodId);
    const scheduleIdSet = new Set(schedules.map((s) => s.id));

    const inputs = data.scheduleLocations || [];
    for (const item of inputs) {
      if (!scheduleIdSet.has(item.unitScheduleId)) {
        throw new AppError('유효하지 않은 일정 ID입니다.', 400, 'INVALID_SCHEDULE');
      }
    }

    // 유효한 장소 ID 목록 (현재 교육기간에 속한 장소만)
    const validLocationIds = new Set(updatedLocations.map((l) => l.id));

    // 4. 매칭 데이터 변환 (locationName -> trainingLocationId)
    const resolvedInputs = inputs
      .map((item) => {
        let locationId = item.trainingLocationId;

        // id가 없고 이름이 있으면 이름으로 id 찾기
        if (!locationId && item.locationName) {
          locationId = locationNameToId.get(item.locationName);
        }

        return {
          unitScheduleId: item.unitScheduleId,
          trainingLocationId: locationId || 0,
          plannedCount: item.plannedCount,
          actualCount: item.actualCount,
          requiredCount: item.requiredCount,
        };
      })
      // 유효한 id만 (0보다 크고, 현재 교육기간에 속한 장소)
      .filter(
        (item) => item.trainingLocationId > 0 && validLocationIds.has(item.trainingLocationId),
      );

    // 5. 일정별 장소 매칭 저장
    const byScheduleId = new Map<number, typeof resolvedInputs>();
    for (const item of resolvedInputs) {
      const arr = byScheduleId.get(item.unitScheduleId) || [];
      arr.push(item);
      byScheduleId.set(item.unitScheduleId, arr);
    }

    for (const schedule of schedules) {
      const scheduleInputs = byScheduleId.get(schedule.id) || [];
      await unitRepository.syncScheduleLocations(schedule.id, scheduleInputs);
    }

    return { updated: resolvedInputs.length };
  }

  /**
   * 교육기간 삭제
   */
  async deleteTrainingPeriod(trainingPeriodId: number) {
    const period = await unitRepository.findTrainingPeriodById(trainingPeriodId);
    if (!period) {
      throw new AppError('교육기간을 찾을 수 없습니다.', 404, 'TRAINING_PERIOD_NOT_FOUND');
    }

    await unitRepository.deleteTrainingPeriod(trainingPeriodId);

    return { deleted: true };
  }

  async updateTrainingPeriodSchedule(
    trainingPeriodId: number,
    data: {
      startDate: string;
      endDate: string;
      excludedDates: string[];
      forceUpdate?: boolean;
    },
  ) {
    const period = await unitRepository.findTrainingPeriodById(trainingPeriodId);
    if (!period) {
      throw new AppError('교육기간을 찾을 수 없습니다.', 404, 'TRAINING_PERIOD_NOT_FOUND');
    }

    const normalizedStart = toDateOnlyString(data.startDate);
    const normalizedEnd = toDateOnlyString(data.endDate);
    if (!normalizedStart || !normalizedEnd) {
      throw new AppError('날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)', 400, 'INVALID_DATE');
    }
    if (normalizedStart > normalizedEnd) {
      throw new AppError('시작일이 종료일보다 늦습니다.', 400, 'INVALID_DATE_RANGE');
    }

    const normalizedExcludedDates = [
      ...new Set(
        (data.excludedDates || []).map((d) => toDateOnlyString(d)).filter(Boolean) as string[],
      ),
    ].sort();

    // 1. 기존 일정 조회
    const existingSchedules = await unitRepository.findSchedulesByPeriodId(trainingPeriodId);
    const existingDates = new Set(
      existingSchedules.map((s) => (s.date ? new Date(s.date).toISOString().split('T')[0] : '')),
    );

    // 2. 새 일정 범위 계산
    const newSchedules = this._calculateSchedules(
      normalizedStart,
      normalizedEnd,
      normalizedExcludedDates,
    );
    const newDates = new Set(
      newSchedules.map((s) => (s.date ? new Date(s.date).toISOString().split('T')[0] : '')),
    );

    const datesToDelete = [...existingDates].filter((d) => d && !newDates.has(d));
    const datesToAdd = [...newDates].filter((d) => d && !existingDates.has(d));

    // 4. 삭제 처리 (크레딧 부여 + 자동 재배정)
    let deleteResult = { deleted: 0, creditsGiven: 0, reassigned: 0 };
    if (datesToDelete.length > 0) {
      const scheduleIdsToDelete = existingSchedules
        .filter((s) => {
          const dateStr = s.date ? new Date(s.date).toISOString().split('T')[0] : '';
          return datesToDelete.includes(dateStr);
        })
        .map((s) => s.id);

      if (scheduleIdsToDelete.length > 0) {
        // TrainingPeriod -> Unit 이름 조회
        const unitName = period.unit?.name;

        deleteResult = await unitRepository.removeSchedulesFromPeriod(
          scheduleIdsToDelete,
          unitName,
        );
      }
    }

    // 5. 추가 처리
    let addResult = { count: 0 };
    if (datesToAdd.length > 0) {
      addResult = await unitRepository.addSchedulesToPeriod(trainingPeriodId, datesToAdd);
    }

    return {
      deleted: deleteResult.deleted,
      added: addResult.count,
      creditsGiven: deleteResult.creditsGiven,
      reassigned: deleteResult.reassigned,
    };
  }

  // ===== 엑셀 템플릿 생성 =====

  /**
   * 부대 업로드용 엑셀 템플릿 생성
   * - 컬럼 헤더 및 예시 데이터 포함
   * - 복수 교육장소 작성 방법 안내
   */
  async generateExcelTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'T-Lecture';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('부대 업로드 양식');

    // 메타데이터 행 (강의년도) - A1: 라벨, B1: 연도
    const metaLabelCell = sheet.getCell('A1');
    metaLabelCell.value = '강의년도';
    metaLabelCell.font = { bold: true };
    metaLabelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD700' }, // 골드 배경색
    };
    metaLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const metaValueCell = sheet.getCell('B1');
    metaValueCell.value = new Date().getFullYear();
    metaValueCell.font = { bold: true };
    metaValueCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF9C4' }, // 연한 노란색
    };
    metaValueCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // 안내 문구 1: 복수 장소
    sheet.mergeCells('A2:Z2');
    const guideCell = sheet.getCell('A2');
    guideCell.value =
      '※ 복수 교육장소: 동일 부대에 장소를 추가하려면 부대명을 비우고 교육장소 정보만 입력하세요.';
    guideCell.font = { color: { argb: 'FF0000FF' }, italic: true };

    // 안내 문구 2: 날짜/시간 형식
    sheet.mergeCells('A3:Z3');
    const guideCell2 = sheet.getCell('A3');
    guideCell2.value =
      '※ 날짜: YYYY-MM-DD, YYYY/MM/DD, 엑셀날짜셀 가능 | 시간: HH:MM, HH:MM:SS, 9시30분 가능 | 전화번호: 하이픈(-) 있어도/없어도 가능';
    guideCell2.font = { color: { argb: 'FF0000FF' }, italic: true };

    // 안내 문구 3: O/X 및 교육불가일자
    sheet.mergeCells('A4:Z4');
    const guideCell3 = sheet.getCell('A4');
    guideCell3.value =
      '※ O/X 필드: O, ○, 예, Y, 1 → 예 | X, 아니오, N, 0, 빈값 → 아니오 | 교육불가일자: 복수 시 콤마(,) 또는 세미콜론(;)으로 구분';
    guideCell3.font = { color: { argb: 'FF0000FF' }, italic: true };

    // 안내 문구 4: 열 순서 안내
    sheet.mergeCells('A5:Z5');
    const guideCell4 = sheet.getCell('A5');
    guideCell4.value =
      '※ 열 순서는 자유롭게 변경해도 됩니다. 헤더명(부대명, 군구분 등)만 일치하면 자동으로 인식됩니다.';
    guideCell4.font = { color: { argb: 'FF008000' }, italic: true };

    // 헤더 정의
    const headers = [
      { header: '부대명', key: 'name', width: 25, required: true, example: '육군1사단' },
      {
        header: '군구분',
        key: 'unitType',
        width: 12,
        required: false,
        example: '육군',
        note: '육군/해군/공군/해병대/국직부대',
      },
      { header: '광역', key: 'wideArea', width: 15, required: false, example: '서울특별시' },
      { header: '지역', key: 'region', width: 15, required: false, example: '강남구' },
      {
        header: '부대주소',
        key: 'addressDetail',
        width: 40,
        required: false,
        example: '서울특별시 강남구 테헤란로 152, 강남파이낸스센터',
        note: '도로명주소 + 지번(건물명)까지 작성 시 더 정확한 좌표 변환',
      },
      {
        header: '부대상세주소',
        key: 'detailAddress',
        width: 20,
        required: false,
        example: '본관 3층',
      },
      {
        header: '교육시작일자',
        key: 'educationStart',
        width: 15,
        required: true,
        example: '2026-03-02',
        note: 'YYYY-MM-DD, YYYY/MM/DD, 엑셀날짜셀 가능',
      },
      {
        header: '교육종료일자',
        key: 'educationEnd',
        width: 15,
        required: true,
        example: '2026-03-06',
        note: 'YYYY-MM-DD, YYYY/MM/DD, 엑셀날짜셀 가능',
      },
      {
        header: '교육불가일자',
        key: 'excludedDates',
        width: 30,
        required: false,
        example: '2026-03-03,2026-03-04',
        note: '복수 시 콤마(,) 또는 세미콜론(;)으로 구분',
      },
      {
        header: '근무시작시간',
        key: 'workStartTime',
        width: 15,
        required: false,
        example: '09:00',
        note: 'HH:MM, HH:MM:SS, 9시30분 형식 가능',
      },
      {
        header: '근무종료시간',
        key: 'workEndTime',
        width: 15,
        required: false,
        example: '18:00',
        note: 'HH:MM, HH:MM:SS, 9시30분 형식 가능',
      },
      {
        header: '점심시작시간',
        key: 'lunchStartTime',
        width: 15,
        required: false,
        example: '12:00',
        note: 'HH:MM, HH:MM:SS, 9시30분 형식 가능',
      },
      {
        header: '점심종료시간',
        key: 'lunchEndTime',
        width: 15,
        required: false,
        example: '13:00',
        note: 'HH:MM, HH:MM:SS, 9시30분 형식 가능',
      },
      { header: '간부명', key: 'officerName', width: 12, required: false, example: '홍길동' },
      {
        header: '간부 전화번호',
        key: 'officerPhone',
        width: 18,
        required: false,
        example: '010-1234-5678',
        note: '하이픈(-) 있어도/없어도 가능 (01012345678)',
      },
      {
        header: '간부 이메일 주소',
        key: 'officerEmail',
        width: 25,
        required: false,
        example: 'officer@army.mil.kr',
      },
      {
        header: '수탁급식여부',
        key: 'hasCateredMeals',
        width: 14,
        required: false,
        example: 'O',
        note: 'O, ○, 예, Y, 1 또는 X, 아니오, N, 0',
      },
      {
        header: '회관숙박여부',
        key: 'hasHallLodging',
        width: 14,
        required: false,
        example: 'X',
        note: 'O, ○, 예, Y, 1 또는 X, 아니오, N, 0',
      },
      {
        header: '사전사후 휴대폰 불출 여부',
        key: 'allowsPhoneBeforeAfter',
        width: 25,
        required: false,
        example: 'O',
        note: 'O, ○, 예, Y, 1 또는 X, 아니오, N, 0',
      },
      {
        header: '기존교육장소',
        key: 'originalPlace',
        width: 20,
        required: false,
        example: '대강당',
      },
      {
        header: '변경교육장소',
        key: 'changedPlace',
        width: 20,
        required: false,
        example: '',
        note: '변경 시에만 입력',
      },
      {
        header: '강사휴게실 여부',
        key: 'hasInstructorLounge',
        width: 16,
        required: false,
        example: 'O',
        note: 'O, ○, 예, Y, 1 또는 X, 아니오, N, 0',
      },
      {
        header: '여자화장실 여부',
        key: 'hasWomenRestroom',
        width: 16,
        required: false,
        example: 'O',
        note: 'O, ○, 예, Y, 1 또는 X, 아니오, N, 0',
      },
      {
        header: '계획인원',
        key: 'plannedCount',
        width: 12,
        required: false,
        example: '100',
        note: '숫자',
      },
      {
        header: '참여인원',
        key: 'actualCount',
        width: 12,
        required: false,
        example: '95',
        note: '숫자',
      },
      { header: '특이사항', key: 'note', width: 30, required: false, example: '주차 가능' },
    ];

    // 헤더 행 (6행)
    const headerRow = sheet.getRow(6);
    headers.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: col.required ? 'FF2E7D32' : 'FF1976D2' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      // 컬럼 너비 설정
      sheet.getColumn(index + 1).width = col.width;

      // 주석 추가 (입력 형식 안내)
      if (col.note) {
        cell.note = {
          texts: [{ text: col.note }],
        };
      }
    });

    // 데이터 셀 스타일 함수
    const applyDataCellStyle = (
      row: ReturnType<typeof sheet.getRow>,
      colIndex: number,
      value: string | number | undefined,
      colKey: string,
    ) => {
      const cell = row.getCell(colIndex);
      cell.value = value ?? '';
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      // 숫자 필드는 오른쪽 정렬
      const numberFields = ['plannedCount', 'actualCount'];
      // 중앙 정렬 필드
      const centerFields = [
        'unitType',
        'educationStart',
        'educationEnd',
        'excludedDates',
        'workStartTime',
        'workEndTime',
        'lunchStartTime',
        'lunchEndTime',
        'hasCateredMeals',
        'hasHallLodging',
        'allowsPhoneBeforeAfter',
        'hasInstructorLounge',
        'hasWomenRestroom',
      ];

      if (numberFields.includes(colKey)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (centerFields.includes(colKey)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    };

    // 예시 데이터 1: 기본 부대 (단일 장소, 교육불가일자 복수)
    const example1 = sheet.getRow(7);
    headers.forEach((col, index) => {
      applyDataCellStyle(example1, index + 1, col.example, col.key);
    });

    // 예시 데이터 2: 복수 장소가 있는 부대 (첫 번째 장소, 교육불가일자 없음)
    const example2Values: Record<string, string | number> = {
      name: '해군2함대',
      unitType: '해군',
      wideArea: '경기도',
      region: '평택시',
      addressDetail: '경기도 평택시 평택로 51, 평택시청',
      detailAddress: '해군회관',
      educationStart: '2026-04-01',
      educationEnd: '2026-04-05',
      excludedDates: '',
      workStartTime: '08:30',
      workEndTime: '17:30',
      lunchStartTime: '12:00',
      lunchEndTime: '13:00',
      officerName: '김철수',
      officerPhone: '010-9876-5432',
      officerEmail: 'navy@navy.mil.kr',
      hasCateredMeals: 'O',
      hasHallLodging: 'O',
      allowsPhoneBeforeAfter: 'X',
      originalPlace: 'A강의실',
      changedPlace: '',
      hasInstructorLounge: 'O',
      hasWomenRestroom: 'O',
      plannedCount: 80,
      actualCount: 75,
      note: '',
    };
    const example2 = sheet.getRow(8);
    headers.forEach((col, index) => {
      applyDataCellStyle(example2, index + 1, example2Values[col.key], col.key);
    });

    // 예시 데이터 3: 동일 부대의 추가 장소 (부대명 비움)
    const example3Values: Record<string, string | number> = {
      name: '', // 부대명 비움 → 위 부대에 장소 추가
      unitType: '',
      wideArea: '',
      region: '',
      addressDetail: '',
      detailAddress: '',
      educationStart: '',
      educationEnd: '',
      excludedDates: '',
      workStartTime: '',
      workEndTime: '',
      lunchStartTime: '',
      lunchEndTime: '',
      officerName: '',
      officerPhone: '',
      officerEmail: '',
      hasCateredMeals: '',
      hasHallLodging: '',
      allowsPhoneBeforeAfter: '',
      originalPlace: 'B강의실', // 추가 장소
      changedPlace: '',
      hasInstructorLounge: 'X',
      hasWomenRestroom: 'O',
      plannedCount: 60,
      actualCount: 58,
      note: '프로젝터 있음',
    };
    const example3 = sheet.getRow(9);
    headers.forEach((col, index) => {
      const cell = example3.getCell(index + 1);
      applyDataCellStyle(example3, index + 1, example3Values[col.key], col.key);
      // 복수 장소 행 강조
      if (col.key === 'originalPlace' || col.key === 'plannedCount' || col.key === 'actualCount') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF9C4' }, // 연한 노란색
        };
      }
    });

    // 안내 행 추가
    sheet.mergeCells('A10:Z10');
    const noteRow = sheet.getCell('A10');
    noteRow.value =
      '↑ 9행은 8행 부대에 추가되는 교육장소입니다. 부대명을 비우면 직전 부대에 장소가 추가됩니다.';
    noteRow.font = { color: { argb: 'FFFF6600' }, italic: true, size: 10 };

    // 버퍼로 변환
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

export default new UnitService();

// CommonJS 호환
module.exports = new UnitService();
