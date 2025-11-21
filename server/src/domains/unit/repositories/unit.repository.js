// server/src/modules/unit/repositories/unit.repository.js
const prisma = require('../../../libs/prisma');

/**
 * 부대(Unit) 생성
 * data 예시:
 * {
 *   unitType: 'Army',
 *   name: '육군 00부대',
 *   wideArea: '경기',
 *   region: '양주',
 *   addressDetail: '경기도 양주시 ...',
 *   lat: 37.123,
 *   lng: 127.456,
 *   educationStart: '2025-02-17T00:00:00.000Z',
 *   educationEnd: '2025-02-19T00:00:00.000Z',
 *   workStartTime: '2025-02-17T09:00:00.000Z',
 *   workEndTime: '2025-02-17T18:00:00.000Z',
 *   lunchStartTime: ...,
 *   lunchEndTime: ...,
 *   officerName: '홍길동',
 *   officerPhone: '010-0000-0000',
 *   officerEmail: '...',
 *   // 선택:
 *   trainingLocations: [
 *     { originalPlace: '기존교육장', changedPlace: '변경교육장', ... },
 *   ],
 *   schedules: [
 *     { date: '2025-02-17T00:00:00.000Z' }
 *   ]
 * }
 */
exports.create = async (data) => {
  const { trainingLocations, schedules, ...unitData } = data;

  return await prisma.unit.create({
    data: {
      ...unitData,
      // 교육장소(TrainingLocation) 같이 만들고 싶으면 여기서 nested create
      ...(trainingLocations && trainingLocations.length
        ? {
            trainingLocations: {
              create: trainingLocations,
            },
          }
        : {}),
      // 부대일정(UnitSchedule) 같이 만들고 싶으면 여기서 nested create
      ...(schedules && schedules.length
        ? {
            schedules: {
              create: schedules,
            },
          }
        : {}),
    },
    include: {
      trainingLocations: true,
      schedules: true,
    },
  });
};

/**
 * 전체 부대 목록 조회
 */
exports.findAll = async () => {
  return await prisma.unit.findMany({
    include: {
      trainingLocations: true,
      schedules: true,
    },
    orderBy: {
      id: 'desc', // 필요에 따라 educationStart로 바꿔도 됨
    },
  });
};

/**
 * 특정 부대 상세 조회
 */
exports.findById = async (id) => {
  return await prisma.unit.findUnique({
    where: { id: Number(id) },
    include: {
      trainingLocations: true,
      schedules: true,
    },
  });
};

/**
 * 부대 정보 수정
 * - 여기서는 Unit 기본 정보만 수정
 * - 교육장소/일정 수정은 별도 로직으로 분리하는 게 깔끔함
 */
exports.update = async (id, data) => {
  const { trainingLocations, schedules, ...unitData } = data;

  // 기본 Unit 정보만 업데이트
  // trainingLocations, schedules를 같이 수정하고 싶으면
  // 별도 서비스/레포지토리에서 $transaction으로 다루는 게 좋음
  return await prisma.unit.update({
    where: { id: Number(id) },
    data: unitData,
  });
};

/**
 * 부대 삭제
 */
exports.delete = async (id) => {
  return await prisma.unit.delete({
    where: { id: Number(id) },
  });
};

/**
 * 📌 거리 배치용: 다가오는 부대 일정 가져오기
 * - UnitSchedule.date 기준으로 오늘 이후 일정만
 * - 가까운 날짜 순으로 정렬
 */
exports.findUpcomingSchedules = async (limit = 50) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return await prisma.unitSchedule.findMany({
    where: {
      date: {
        gte: today,
      },
    },
    orderBy: {
      date: 'asc',
    },
    take: limit,
    include: {
      unit: true, // unit.addressDetail, unit.lat/lng 필요하니까 같이 가져옴
    },
  });
};


exports.updateCoords = async (unitId, lat, lng) => {
  return prisma.unit.update({
    where: { id: Number(unitId) },
    data: { lat, lng },
  });
};