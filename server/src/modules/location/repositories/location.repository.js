// server/src/modules/location/repositories/location.repository.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.create = async (data) => {
  // 강의장소 생성 시, 일자별 세부정보도 함께 저장 가능하도록 구현
  const { dailyDetails, ...locationData } = data;
  return await prisma.lectureLocation.create({
    data: {
      ...locationData,
      dailyDetails: {
        create: dailyDetails || [], // 배열로 들어온 세부정보 동시 생성
      },
    },
    include: { dailyDetails: true },
  });
};

exports.findAll = async () => {
  return await prisma.lectureLocation.findMany({
    include: { dailyDetails: true }, // 조회 시 세부정보도 함께 가져옴
    orderBy: { createdAt: 'desc' }
  });
};

exports.findById = async (id) => {
  return await prisma.lectureLocation.findUnique({
    where: { id: parseInt(id) },
    include: { dailyDetails: true },
  });
};

exports.update = async (id, data) => {
  const { dailyDetails, ...locationData } = data;
  return await prisma.lectureLocation.update({
    where: { id: parseInt(id) },
    data: locationData,
    include: { dailyDetails: true },
  });
};

exports.delete = async (id) => {
  return await prisma.lectureLocation.delete({
    where: { id: parseInt(id) },
  });
};

exports.updateDailyDetails = async (locationId, dailyDetailsData) => {
  // dailyDetailsData는 프론트에서 보낸 배열 예: [{ date: '2023-10-01', traineeCount: 50, ... }, ...]

  const transaction = dailyDetailsData.map((detail) => {
    return prisma.dailyEducationDetail.upsert({
      where: {
        // @@unique([lectureLocationId, date]) 덕분에 이 조합으로 식별 가능
        lectureLocationId_date: {
          lectureLocationId: parseInt(locationId),
          date: new Date(detail.date),
        },
      },
      // 없으면 새로 만듦 (Insert)
      create: {
        lectureLocationId: parseInt(locationId),
        date: new Date(detail.date),
        traineeCount: detail.traineeCount,
        facilityNote: detail.facilityNote,
        specificLocation: detail.specificLocation || '', // 혹시 빠졌을 경우 대비
      },
      // 있으면 업데이트함 (Update)
      update: {
        traineeCount: detail.traineeCount,
        facilityNote: detail.facilityNote,
        specificLocation: detail.specificLocation,
      },
    });
  });

  // 여러 개의 upsert를 하나의 트랜잭션으로 처리
  return await prisma.$transaction(transaction);
};