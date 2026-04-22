// server/src/domains/unit/unit.filters.ts
import { Prisma, MilitaryType } from '../../generated/prisma/client.js';
import { PagingResult } from '../../types/common.types';
import { UnitQueryInput } from '../../types/unit.types';

// UnitQuery는 UnitQueryInput의 별칭
type UnitQuery = UnitQueryInput;

// 입력받은 번호 문자열(하이픈 제거)로부터 가능한 전화번호 하이픈 패턴 생성 (검색 지원용)
function generatePhonePatterns(str: string): string[] {
  const digits = str.replace(/[^0-9]/g, '');
  if (!digits) return [];
  const len = digits.length;
  const patterns: string[] = [];

  if (len === 11) {
    patterns.push(`${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`);
  } else if (len === 10) {
    if (digits.startsWith('02')) {
      patterns.push(`${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`);
    } else {
      patterns.push(`${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`);
    }
  } else if (len === 9 && digits.startsWith('02')) {
    patterns.push(`${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`);
  } else if (len === 8) {
    patterns.push(`${digits.slice(0, 4)}-${digits.slice(4)}`);
  } else if (len === 7) {
    patterns.push(`${digits.slice(0, 3)}-${digits.slice(3)}`);
    patterns.push(`${digits.slice(0, 4)}-${digits.slice(4)}`);
  } else if (len === 6) {
    patterns.push(`${digits.slice(0, 2)}-${digits.slice(2)}`);
    patterns.push(`${digits.slice(0, 3)}-${digits.slice(3)}`);
    patterns.push(`${digits.slice(0, 4)}-${digits.slice(4)}`);
  }
  return [...new Set(patterns)]; // 중복 제거
}

// 페이지네이션 계산 (Paging DTO)
export function buildPaging(query: UnitQuery = {}): PagingResult {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 20);
  const skip = (page - 1) * limit;

  return { page, limit, skip, take: limit };
}

// 검색 조건 빌더 (Filter DTO -> Prisma Where)
export function buildUnitWhere(query: UnitQuery = {}): Prisma.UnitWhereInput {
  const {
    keyword,
    region,
    wideArea,
    unitType,
    startDate,
    endDate,
    // minPersonnel,
    // maxPersonnel,
    hasError,
  } = query;

  const conditions: Prisma.UnitWhereInput[] = [];

  // 통합 검색 (이름, 지역, 상세주소)
  if (keyword && String(keyword).trim() !== '') {
    const k = String(keyword).trim();
    const kWithoutHyphen = k.replace(/-/g, ''); // 하이픈 제거된 검색어

    // 일반 검색어와 하이픈이 제거된 번호, 그리고 하이픈이 추가된 발생 가능한 모든 전화번호 패턴
    const phonePatterns = [k, kWithoutHyphen, ...generatePhonePatterns(kWithoutHyphen)];
    const uniquePhonePatterns = Array.from(new Set(phonePatterns));

    const orConditions: Prisma.UnitWhereInput[] = [
      { name: { contains: k } },
      { region: { contains: k } },
      { addressDetail: { contains: k } },
      { trainingPeriods: { some: { officerName: { contains: k } } } },
      // 강사 이름 검색
      {
        trainingPeriods: {
          some: {
            schedules: {
              some: {
                assignments: {
                  some: { User: { name: { contains: k } } },
                },
              },
            },
          },
        },
      },
    ];

    // 생성된 전화번호 패턴 문자열들을 각 연락처 검색 조건에 동적으로 추가
    uniquePhonePatterns.forEach((pattern) => {
      // 1. 부대 담당관 전화번호 검색
      orConditions.push({
        trainingPeriods: { some: { officerPhone: { contains: pattern } } },
      });
      // 2. 강사 전화번호 검색
      orConditions.push({
        trainingPeriods: {
          some: {
            schedules: {
              some: {
                assignments: {
                  some: { User: { userphoneNumber: { contains: pattern } } },
                },
              },
            },
          },
        },
      });
    });

    conditions.push({ OR: orConditions });
  }

  // 단일 필드 필터
  if (region) conditions.push({ region: { contains: String(region).trim() } });
  if (wideArea) conditions.push({ wideArea: String(wideArea).trim() });
  if (unitType) conditions.push({ unitType: String(unitType).trim() as MilitaryType });

  // 데이터 오류 필터 (검증 실패 OR 주소 좌표 누락)
  if (hasError === 'true' || hasError === true) {
    conditions.push({
      OR: [{ validationStatus: 'Invalid' }, { lat: null }],
    });
  }

  // 날짜 범위 필터 (교육기간)
  if (startDate || endDate) {
    const gte = startDate ? new Date(`${startDate}T00:00:00.000Z`) : undefined;
    const lte = endDate ? new Date(`${endDate}T23:59:59.999Z`) : undefined;

    conditions.push({
      trainingPeriods: {
        some: {
          ...(gte ? { endDate: { gte } } : {}),
          ...(lte ? { startDate: { lte } } : {}),
        },
      },
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}
