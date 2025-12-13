// server/src/domains/unit/unit.filters.js

/**
 * 페이지네이션 계산 (Paging DTO)
 */
function buildPaging(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 20);
  const skip = (page - 1) * limit;
  
  return { page, limit, skip, take: limit };
}

/**
 * 검색 조건 빌더 (Filter DTO -> Prisma Where)
 */
function buildUnitWhere(query = {}) {
  const {
    keyword,
    region,
    wideArea,
    unitType,
    startDate,
    endDate,
    minPersonnel,
    maxPersonnel,
  } = query;

  const where = { AND: [] };

  // 1. 통합 검색 (이름, 지역, 상세주소)
  if (keyword && String(keyword).trim() !== '') {
    const k = String(keyword).trim();
    where.AND.push({
      OR: [
        { name: { contains: k } },
        { region: { contains: k } },
        { addressDetail: { contains: k } },
      ],
    });
  }

  // 2. 단일 필드 필터
  if (region) where.AND.push({ region: { contains: String(region).trim() } });
  if (wideArea) where.AND.push({ wideArea: String(wideArea).trim() });
  if (unitType) where.AND.push({ unitType: String(unitType).trim() });

  // 3. 날짜 범위 필터 (일정)
  if (startDate || endDate) {
    const gte = startDate ? new Date(startDate) : undefined;
    const lte = endDate ? new Date(endDate) : undefined;

    where.AND.push({
      schedules: {
        some: {
          date: { gte, lte },
        },
      },
    });
  }

  // 4. 인원수 범위 필터 (교육장소)
  if (minPersonnel || maxPersonnel) {
    const min = minPersonnel ? Number(minPersonnel) : undefined;
    const max = maxPersonnel ? Number(maxPersonnel) : undefined;

    where.AND.push({
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

  return where.AND.length > 0 ? where : {};
}

module.exports = {
  buildPaging,
  buildUnitWhere,
};