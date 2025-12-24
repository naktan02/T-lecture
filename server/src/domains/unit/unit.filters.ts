// server/src/domains/unit/unit.filters.ts
import { Prisma, MilitaryType } from '@prisma/client';
import { PagingResult } from '../../types/common.types';
import { UnitQueryInput } from '../../types/unit.types';

// UnitQuery는 UnitQueryInput의 별칭
type UnitQuery = UnitQueryInput;

// 페이지네이션 계산 (Paging DTO)
export function buildPaging(query: UnitQuery = {}): PagingResult {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 20);
  const skip = (page - 1) * limit;

  return { page, limit, skip, take: limit };
}

// 검색 조건 빌더 (Filter DTO -> Prisma Where)
export function buildUnitWhere(query: UnitQuery = {}): Prisma.UnitWhereInput {
  const { keyword, region, wideArea, unitType, startDate, endDate, minPersonnel, maxPersonnel } =
    query;

  const conditions: Prisma.UnitWhereInput[] = [];

  // 통합 검색 (이름, 지역, 상세주소)
  if (keyword && String(keyword).trim() !== '') {
    const k = String(keyword).trim();
    conditions.push({
      OR: [
        { name: { contains: k } },
        { region: { contains: k } },
        { addressDetail: { contains: k } },
      ],
    });
  }

  // 단일 필드 필터
  if (region) conditions.push({ region: { contains: String(region).trim() } });
  if (wideArea) conditions.push({ wideArea: String(wideArea).trim() });
  if (unitType) conditions.push({ unitType: String(unitType).trim() as MilitaryType });

  // 날짜 범위 필터 (일정)
  if (startDate || endDate) {
    const gte = startDate ? new Date(startDate) : undefined;
    const lte = endDate ? new Date(endDate) : undefined;

    conditions.push({
      schedules: {
        some: {
          date: { gte, lte },
        },
      },
    });
  }

  // 인원수 범위 필터 (교육장소)
  if (minPersonnel || maxPersonnel) {
    const min = minPersonnel ? Number(minPersonnel) : undefined;
    const max = maxPersonnel ? Number(maxPersonnel) : undefined;

    conditions.push({
      trainingLocations: {
        some: {
          plannedCount: {
            gte: min,
            lte: max,
          },
        },
      },
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

// CommonJS 호환
module.exports = {
  buildPaging,
  buildUnitWhere,
};
