// server/src/domains/unit/unit.mapper.ts
import { Prisma } from '@prisma/client';

interface TrainingLocationInput {
  originalPlace?: string;
  changedPlace?: string;
  plannedCount?: number | string;
  instructorsNumbers?: number | string;
  hasInstructorLounge?: boolean | string;
  hasWomenRestroom?: boolean | string;
  hasCateredMeals?: boolean | string;
  hasHallLodging?: boolean | string;
  allowsPhoneBeforeAfter?: boolean | string;
  note?: string;
}

interface RawUnitData {
  name?: string;
  unitType?: string;
  wideArea?: string;
  region?: string;
  addressDetail?: string;
  lat?: number;
  lng?: number;
  educationStart?: string | Date;
  educationEnd?: string | Date;
  workStartTime?: string | Date;
  workEndTime?: string | Date;
  lunchStartTime?: string | Date;
  lunchEndTime?: string | Date;
  officerName?: string;
  officerPhone?: string;
  officerEmail?: string;
  trainingLocations?: TrainingLocationInput[];
  schedules?: string[];
}

interface ExcelRow {
  [key: string]: any;
}

// 헬퍼: 문자열 확인
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

// 헬퍼: 날짜 변환
const toDateOrUndef = (v: unknown): Date | undefined =>
  v ? new Date(v as string | Date) : undefined;

// 헬퍼: 불리언 변환 ('true'/'false', 'O'/'X' 등 다양한 입력 처리)
const toBoolOrUndef = (v: unknown): boolean | undefined => {
  if (v === true || v === 'true' || v === 'O') return true;
  if (v === false || v === 'false' || v === 'X') return false;
  return undefined;
};

// 부대 생성용 데이터 변환 (CreateUnitDto 역할)
export function toCreateUnitDto(rawData: RawUnitData = {}): Prisma.UnitCreateInput {
  // 필수값 검증 (Service 로직 단순화)
  if (!isNonEmptyString(rawData.name)) {
    throw new Error('부대명(name)은 필수입니다.');
  }

  return {
    name: rawData.name,
    unitType: rawData.unitType as any,
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

    // 교육장소 (Nested Create)
    trainingLocations:
      Array.isArray(rawData.trainingLocations) && rawData.trainingLocations.length > 0
        ? {
            create: rawData.trainingLocations.map((loc) => ({
              originalPlace: loc.originalPlace,
              changedPlace: loc.changedPlace,

              // 숫자 필드
              plannedCount: Number(loc.plannedCount || 0),
              instructorsNumbers: loc.instructorsNumbers
                ? Number(loc.instructorsNumbers)
                : undefined,

              // 시설 정보 (Boolean)
              hasInstructorLounge: toBoolOrUndef(loc.hasInstructorLounge),
              hasWomenRestroom: toBoolOrUndef(loc.hasWomenRestroom),
              hasCateredMeals: toBoolOrUndef(loc.hasCateredMeals),
              hasHallLodging: toBoolOrUndef(loc.hasHallLodging),
              allowsPhoneBeforeAfter: toBoolOrUndef(loc.allowsPhoneBeforeAfter),

              note: loc.note,
            })),
          }
        : undefined,
  };
}

// 엑셀 Row(한글) -> API Raw Data 변환
export function excelRowToRawUnit(row: ExcelRow = {}): RawUnitData {
  // 콤마로 구분된 일정 문자열 처리
  const schedules = isNonEmptyString(row['교육일정'])
    ? row['교육일정']
        .split(',')
        .map((d: string) => d.trim())
        .filter(Boolean)
    : [];

  // 교육장소 단순화 (엑셀 1줄에 1개 장소라고 가정)
  const trainingLocations: TrainingLocationInput[] = isNonEmptyString(row['교육장소명'])
    ? [
        {
          originalPlace: row['교육장소명'],
          changedPlace: row['변경교육장소명'],

          plannedCount: row['계획인원'] || 0,
          instructorsNumbers: row['투입강사수'],

          // 시설 여부 매핑 (O/X 또는 TRUE/FALSE)
          hasInstructorLounge: row['강사휴게실여부'],
          hasWomenRestroom: row['여자화장실여부'],
          hasCateredMeals: row['수탁급식여부'],
          hasHallLodging: row['회관숙박여부'],
          allowsPhoneBeforeAfter: row['휴대폰불출여부'],

          note: row['비고'] || undefined,
        },
      ]
    : [];

  return {
    name: row['부대명'],
    unitType: row['군구분'],
    wideArea: row['광역'],
    region: row['지역'],
    addressDetail: row['주소'],

    // 시간 정보 매핑
    educationStart: row['교육시작일자'],
    educationEnd: row['교육종료일자'],
    workStartTime: row['근무시작시간'],
    workEndTime: row['근무종료시간'],
    lunchStartTime: row['점심시작시간'],
    lunchEndTime: row['점심종료시간'],

    officerName: row['담당자명'],
    officerPhone: row['연락처'],
    officerEmail: row['이메일'],

    schedules,
    trainingLocations,
  };
}

// CommonJS 호환
module.exports = {
  toCreateUnitDto,
  excelRowToRawUnit,
};
