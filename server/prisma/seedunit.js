// prisma/seedunit.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding process started...');

  // 1. 기초 데이터 생성 (팀, 덕목)
  const team = await prisma.team.create({ data: { name: '교육1팀' } });
  const virtue = await prisma.virtue.create({ data: { name: '성실' } });

  // 2. 강사 생성 (10명)
  const instructors = [];
  for (let i = 1; i <= 10; i++) {
    const user = await prisma.user.create({
      data: {
        userEmail: `instructor${i}@test.com`,
        password: '$2b$10$DUMMYHASHVALUE', // 실제론 bcrypt 해시 필요
        name: `강사_${i}`,
        userphoneNumber: `010-0000-000${i}`,
        status: 'APPROVED',
        instructor: {
          create: {
            teamId: team.id,
            category: 'Main',
            location: '서울시 강남구',
            profileCompleted: true,
            virtues: {
              create: { virtueId: virtue.id },
            },
          },
        },
      },
      include: { instructor: true }, // 생성된 instructor ID 확보
    });
    instructors.push(user.instructor);
  }
  console.log(`✅ Created ${instructors.length} instructors.`);

  // 3. 부대 및 일정 생성 (5개 부대, 각 부대당 내일 일정 1개)
  const units = [];
  const schedules = [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (let i = 1; i <= 5; i++) {
    const unit = await prisma.unit.create({
      data: {
        name: `제${i}부대`,
        region: '경기',
        addressDetail: `경기도 어딘가 ${i}번지`,
        schedules: {
          create: {
            date: tomorrow,
          },
        },
      },
      include: { schedules: true },
    });
    units.push(unit);
    schedules.push(...unit.schedules);
  }
  console.log(`✅ Created ${units.length} units & schedules.`);

  // 4. [핵심] 강사-부대 거리 데이터 랜덤 생성 (NxM 매트릭스)
  // 실제 로직 테스트를 위해 모든 강사와 모든 부대 사이의 거리를 랜덤으로 넣습니다.
  const distanceData = [];
  
  for (const instructor of instructors) {
    for (const unit of units) {
      // 5km ~ 100km 사이 랜덤
      const randomDist = Math.floor(Math.random() * 95) + 5; 
      
      distanceData.push({
        userId: instructor.userId, // 스키마에 정의된 field명 확인 (instructorId or userId)
        unitId: unit.id,
        distance: randomDist,
        duration: randomDist * 1.5 * 60, // 대략 km당 1.5분 소요로 계산 (초 단위)
      });
    }
  }

  // 대량 삽입
  await prisma.instructorUnitDistance.createMany({
    data: distanceData,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${distanceData.length} distance records.`);
  console.log('🏁 Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });