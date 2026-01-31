// server/src/domains/unit/unit.mapper.ts
import { Prisma, MilitaryType } from '../../generated/prisma/client.js';
import { TrainingLocationInput, RawUnitInput } from '../../types/unit.types';

// RawUnitData는 이 파일에서 export하므로 유지 (다른 파일에서 import)
export type RawUnitData = RawUnitInput;

// 헬퍼: 문자열 확인
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

// 헬퍼: 전화번호 정규화 (숫자만 추출)
export const normalizePhone = (phone: unknown): string | undefined => {
  if (!phone) return undefined;
  const numbers = String(phone).replace(/[^\d]/g, '');
  return numbers.length > 0 ? numbers : undefined;
};

// 헬퍼: 날짜 변환 (UTC 자정으로 변환 - 시간 없는 날짜 전용)
const toDateOrUndef = (v: unknown): Date | undefined => {
  if (!v) return undefined;
  const dateStr = typeof v === 'string' ? v.split('T')[0] : (v as Date).toISOString().split('T')[0];
  return new Date(`${dateStr}T00:00:00.000Z`);
};

// 헬퍼: 한글 군구분 -> MilitaryType enum 변환
const UNIT_TYPE_MAP: Record<string, MilitaryType> = {
  육군: MilitaryType.Army,
  해군: MilitaryType.Navy,
  공군: MilitaryType.AirForce,
  해병대: MilitaryType.Marines,
  국직부대: MilitaryType.MND,
  // 영문 enum 값도 허용
  Army: MilitaryType.Army,
  Navy: MilitaryType.Navy,
  AirForce: MilitaryType.AirForce,
  Marines: MilitaryType.Marines,
  MND: MilitaryType.MND,
};

function toMilitaryType(value: unknown): MilitaryType | undefined {
  if (!value) return undefined;
  const strValue = String(value).trim();
  return UNIT_TYPE_MAP[strValue] || undefined;
}

// 부대 생성용 데이터 변환 (CreateUnitDto 역할)
// 주의: trainingPeriods는 createUnitWithTrainingPeriod에서 별도로 처리하므로 여기서는 제외
// Unit은 기본 정보만 저장. 시간/날짜 필드들은 TrainingPeriod에 있음
// @param overrideLectureYear 엑셀 메타데이터에서 추출한 강의년도 (우선 적용)
export function toCreateUnitDto(
  rawData: RawUnitData = {},
  overrideLectureYear?: number,
): Prisma.UnitCreateInput {
  // 필수값 검증 (Service 로직 단순화)
  if (!isNonEmptyString(rawData.name)) {
    throw new Error('부대명(name)은 필수입니다.');
  }

  // lectureYear 결정: 1) 메타데이터 우선, 2) educationStart에서 추출, 3) 현재 년도
  let lectureYear = overrideLectureYear;
  if (!lectureYear && rawData.educationStart) {
    const d = new Date(rawData.educationStart as string | Date);
    if (!isNaN(d.getTime())) {
      lectureYear = d.getFullYear();
    }
  }
  if (!lectureYear) {
    lectureYear = new Date().getFullYear();
  }

  return {
    lectureYear,
    name: rawData.name,
    unitType: toMilitaryType(rawData.unitType),
    wideArea: rawData.wideArea,
    region: rawData.region,
    addressDetail: rawData.addressDetail,
    detailAddress: rawData.detailAddress,
    // lat/lng는 의도적으로 무시 - 주소 기반 좌표 변환 로직을 통해 자동 계산됨
    // 엘셀에 좌표가 포함되어 있어도 무시하고 주소로부터 새로 계산
    // NOTE: educationStart, educationEnd, workStartTime 등은 이제 TrainingPeriod에 있음
    // trainingPeriods는 createUnitWithTrainingPeriod에서 처리
  };
}

// 엑셀 Row -> 교육장소 데이터 추출
// NOTE: plannedCount, actualCount는 ScheduleLocation에 저장되지만, location 생성 시 함께 전달
function extractTrainingLocation(
  row: Record<string, unknown>,
): (TrainingLocationInput & { plannedCount?: number; actualCount?: number }) | null {
  const hasLocationData = row.originalPlace || row.changedPlace;
  if (!hasLocationData) return null;

  // plannedCount/actualCount 파싱
  const parsedPlanned = row.plannedCount !== undefined ? Number(row.plannedCount) : undefined;
  const parsedActual = row.actualCount !== undefined ? Number(row.actualCount) : undefined;

  return {
    originalPlace: row.originalPlace as string | undefined,
    changedPlace: row.changedPlace as string | undefined,
    hasInstructorLounge: row.hasInstructorLounge as boolean | undefined,
    hasWomenRestroom: row.hasWomenRestroom as boolean | undefined,
    note: row.note as string | undefined,
    plannedCount: parsedPlanned && !isNaN(parsedPlanned) ? parsedPlanned : undefined,
    actualCount: parsedActual && !isNaN(parsedActual) ? parsedActual : undefined,
  };
}

// 엑셀 Row -> API Raw Data 변환
// excel.service.ts에서 이미 내부 필드명으로 변환되어 오므로 직접 매핑
export function excelRowToRawUnit(row: Record<string, unknown> = {}): RawUnitData & {
  hasCateredMeals?: boolean;
  hasHallLodging?: boolean;
  allowsPhoneBeforeAfter?: boolean;
} {
  const trainingLocation = extractTrainingLocation(row);
  const trainingLocations: TrainingLocationInput[] = trainingLocation ? [trainingLocation] : [];

  return {
    name: row.name as string | undefined,
    unitType: row.unitType as string | undefined,
    wideArea: row.wideArea as string | undefined,
    region: row.region as string | undefined,
    addressDetail: row.addressDetail as string | undefined,

    // 날짜/시간 정보 (excel.service.ts에서 Date로 변환됨)
    educationStart: row.educationStart as Date | string | undefined,
    educationEnd: row.educationEnd as Date | string | undefined,
    workStartTime: row.workStartTime as Date | string | undefined,
    workEndTime: row.workEndTime as Date | string | undefined,
    lunchStartTime: row.lunchStartTime as Date | string | undefined,
    lunchEndTime: row.lunchEndTime as Date | string | undefined,

    // 교육불가일자 (배열로 파싱됨)
    excludedDates: row.excludedDates as string[] | undefined,

    // 담당자 정보
    officerName: row.officerName as string | undefined,
    officerPhone: normalizePhone(row.officerPhone),
    officerEmail: row.officerEmail as string | undefined,

    // 시설 정보 (TrainingPeriod에 저장)
    hasCateredMeals:
      row.hasCateredMeals === true ||
      row.hasCateredMeals === 'true' ||
      String(row.hasCateredMeals).toUpperCase() === 'O',
    hasHallLodging:
      row.hasHallLodging === true ||
      row.hasHallLodging === 'true' ||
      String(row.hasHallLodging).toUpperCase() === 'O',
    allowsPhoneBeforeAfter:
      row.allowsPhoneBeforeAfter === true ||
      row.allowsPhoneBeforeAfter === 'true' ||
      String(row.allowsPhoneBeforeAfter).toUpperCase() === 'O',

    trainingLocations,
  };
}

/**
 * 엑셀 행들을 부대별로 그룹핑
 * - 부대명이 있는 행: 새로운 부대 시작
 * - 부대명이 비어있는 행: 직전 부대에 교육장소 추가
 * - 부대명이 이미 등장한 부대명과 같으면: 해당 부대에 교육장소 추가
 */
export function groupExcelRowsByUnit(rows: Record<string, unknown>[]): RawUnitData[] {
  const unitMap = new Map<string, RawUnitData>(); // 부대명 -> 부대 데이터
  const unitOrder: string[] = []; // 부대명 순서 유지
  let lastUnitName: string | null = null;

  for (const row of rows) {
    const rowUnitName = (row.name as string | undefined)?.trim() || '';
    const trainingLocation = extractTrainingLocation(row);

    if (rowUnitName) {
      // 부대명이 있는 경우
      if (unitMap.has(rowUnitName)) {
        // 이미 등장한 부대명 -> 교육장소만 추가
        const existingUnit = unitMap.get(rowUnitName)!;
        if (trainingLocation) {
          existingUnit.trainingLocations = existingUnit.trainingLocations || [];
          existingUnit.trainingLocations.push(trainingLocation);
        }
      } else {
        // 새로운 부대
        const unitData = excelRowToRawUnit(row);
        unitMap.set(rowUnitName, unitData);
        unitOrder.push(rowUnitName);
      }
      lastUnitName = rowUnitName;
    } else {
      // 부대명이 비어있는 경우 -> 직전 부대에 교육장소 추가
      if (lastUnitName && trainingLocation) {
        const lastUnit = unitMap.get(lastUnitName);
        if (lastUnit) {
          lastUnit.trainingLocations = lastUnit.trainingLocations || [];
          lastUnit.trainingLocations.push(trainingLocation);
        }
      }
      // 부대명도 없고 교육장소도 없으면 무시
    }
  }

  // 순서대로 반환
  return unitOrder.map((name) => unitMap.get(name)!);
}

// CommonJS 호환
module.exports = {
  toCreateUnitDto,
  excelRowToRawUnit,
  groupExcelRowsByUnit,
  normalizePhone,
};
