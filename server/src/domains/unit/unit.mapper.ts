// server/src/domains/unit/unit.mapper.ts
import { Prisma } from '@prisma/client';
import { TrainingLocationInput, RawUnitInput } from '../../types/unit.types';

// RawUnitData는 이 파일에서 export하므로 유지 (다른 파일에서 import)
export type RawUnitData = RawUnitInput;

// 헬퍼: 문자열 확인
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

// 헬퍼: 날짜 변환
const toDateOrUndef = (v: unknown): Date | undefined =>
  v ? new Date(v as string | Date) : undefined;

// 부대 생성용 데이터 변환 (CreateUnitDto 역할)
// 주의: trainingLocations와 schedules는 createUnitWithNested에서 별도로 처리하므로 여기서는 제외
export function toCreateUnitDto(rawData: RawUnitData = {}): Prisma.UnitCreateInput {
  // 필수값 검증 (Service 로직 단순화)
  if (!isNonEmptyString(rawData.name)) {
    throw new Error('부대명(name)은 필수입니다.');
  }

  return {
    name: rawData.name,
    unitType: rawData.unitType as Prisma.NullableEnumMilitaryTypeFieldUpdateOperationsInput['set'],
    wideArea: rawData.wideArea,
    region: rawData.region,
    addressDetail: rawData.addressDetail,
    lat: rawData.lat,
    lng: rawData.lng,

    // 시간/날짜 필드 변환
    educationStart: toDateOrUndef(rawData.educationStart),
    educationEnd: toDateOrUndef(rawData.educationEnd),
    workStartTime: toDateOrUndef(rawData.workStartTime),
    workEndTime: toDateOrUndef(rawData.workEndTime),
    lunchStartTime: toDateOrUndef(rawData.lunchStartTime),
    lunchEndTime: toDateOrUndef(rawData.lunchEndTime),

    officerName: rawData.officerName,
    officerPhone: rawData.officerPhone,
    officerEmail: rawData.officerEmail,
    // trainingLocations와 schedules는 createUnitWithNested에서 처리
  };
}

// 엑셀 Row -> API Raw Data 변환
// excel.service.ts에서 이미 내부 필드명으로 변환되어 오므로 직접 매핑
export function excelRowToRawUnit(row: Record<string, unknown> = {}): RawUnitData {
  // 교육장소 정보 추출 (엑셀 1줄에 1개 장소라고 가정)
  const hasLocationData = row.originalPlace || row.changedPlace || row.plannedCount;
  const trainingLocations: TrainingLocationInput[] = hasLocationData
    ? [
        {
          originalPlace: row.originalPlace as string | undefined,
          changedPlace: row.changedPlace as string | undefined,
          plannedCount: row.plannedCount as number | undefined,
          actualCount: row.actualCount as number | undefined,
          instructorsNumbers: row.instructorsNumbers as number | undefined,
          hasInstructorLounge: row.hasInstructorLounge as boolean | undefined,
          hasWomenRestroom: row.hasWomenRestroom as boolean | undefined,
          hasCateredMeals: row.hasCateredMeals as boolean | undefined,
          hasHallLodging: row.hasHallLodging as boolean | undefined,
          allowsPhoneBeforeAfter: row.allowsPhoneBeforeAfter as boolean | undefined,
          note: row.note as string | undefined,
        },
      ]
    : [];

  return {
    name: row.name as string | undefined,
    unitType: row.unitType as string | undefined,
    wideArea: row.wideArea as string | undefined,
    region: row.region as string | undefined,
    addressDetail: row.addressDetail as string | undefined,
    lat: row.lat as number | undefined,
    lng: row.lng as number | undefined,

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
    officerPhone: row.officerPhone as string | undefined,
    officerEmail: row.officerEmail as string | undefined,

    trainingLocations,
  };
}

// CommonJS 호환
module.exports = {
  toCreateUnitDto,
  excelRowToRawUnit,
};
