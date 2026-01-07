// server/src/domains/unit/unit.filters.ts
import { Prisma, MilitaryType } from '../../generated/prisma/client.js';
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

  // 날짜 범위 필터 (일정) - 이제 trainingPeriods.schedules로 접근
  if (startDate || endDate) {
    const gte = startDate ? new Date(`${startDate}T00:00:00.000Z`) : undefined;
    const lte = endDate ? new Date(`${endDate}T23:59:59.999Z`) : undefined;

    conditions.push({
      trainingPeriods: {
        some: {
          schedules: {
            some: {
              date: { gte, lte },
            },
          },
        },
      },
    });
  }

  // 인원수 범위 필터 - plannedCount는 이제 ScheduleLocation에 있음 (trainingPeriods.schedules.scheduleLocations)
  // TODO: 이 필터 로직은 스키마 변경에 따라 재검토 필요
  // 임시로 주석 처리:
  // if (minPersonnel || maxPersonnel) {
  //   conditions.push({ ... });
  // }

  // 주소 오류 필터 (좌표 변환 실패한 부대 조회)
  if (query.hasAddressError === 'true' || query.hasAddressError === true) {
    conditions.push({
      lat: null,
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

// CommonJS 호환
module.exports = {
  buildPaging,
  buildUnitWhere,
};
