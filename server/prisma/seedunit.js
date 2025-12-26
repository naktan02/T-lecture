// prisma/seedunit.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up previous data...');

  try {
    await prisma.instructorUnitAssignment.deleteMany();
    await prisma.instructorUnitDistance.deleteMany();
    await prisma.instructorAvailability.deleteMany();
    await prisma.instructorVirtue.deleteMany();
    await prisma.unitSchedule.deleteMany();
    await prisma.trainingLocation.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.instructor.deleteMany();
    await prisma.user.deleteMany({
      where: { userEmail: { endsWith: '@test.com' } },
    });
  } catch (e) {
    console.error('⚠️ Cleanup failed.');
    console.error(e);
    process.exit(1);
  }

  console.log('🌱 Seeding process started...');

  // 팀 준비
  let team1 = await prisma.team.findFirst({ where: { name: '교육1팀' } });
  if (!team1) team1 = await prisma.team.create({ data: { name: '교육1팀' } });
  let team2 = await prisma.team.findFirst({ where: { name: '교육2팀' } });
  if (!team2) team2 = await prisma.team.create({ data: { name: '교육2팀' } });
  let team3 = await prisma.team.findFirst({ where: { name: '교육3팀' } });
  if (!team3) team3 = await prisma.team.create({ data: { name: '교육3팀' } });

  // 덕목 준비
  let virtue1 = await prisma.virtue.findFirst({ where: { name: '성실' } });
  if (!virtue1) virtue1 = await prisma.virtue.create({ data: { name: '성실' } });
  let virtue2 = await prisma.virtue.findFirst({ where: { name: '책임' } });
  if (!virtue2) virtue2 = await prisma.virtue.create({ data: { name: '책임' } });

  // ===== 날짜 기준: 12/15 ~ 1/15 범위로 설정 =====
  // 현재 날짜 기준으로 이전/이후 모두 포함
  const dec15 = new Date('2025-12-15');
  dec15.setHours(0, 0, 0, 0);

  console.log('📅 Date range: 2025-12-15 ~ 2026-01-15');

  // =========================================
  // 강사 25명 생성
  // =========================================
  console.log('👥 Creating 25 instructors...');

  const instructors = [];
  // 40명 강사 - Main 15명, Co 10명, Assistant 10명, Practicum 5명
  // 일부 강사는 팀에 속하지 않음 (null)
  const teams = [
    // Main 15명 (팀 골고루 분배, 일부는 팀 없음)
    team1,
    team1,
    team1,
    team2,
    team2,
    team2,
    team3,
    team3,
    team3,
    null,
    null,
    null,
    team1,
    team2,
    team3,
    // Co 10명 (일부는 팀 없음)
    team1,
    team1,
    team2,
    team2,
    team3,
    team3,
    null,
    null,
    team1,
    team2,
    // Assistant 10명 (일부는 팀 없음)
    team1,
    team2,
    team3,
    null,
    null,
    team1,
    team2,
    team3,
    team1,
    team2,
    // Practicum 5명 (일부는 팀 없음)
    team1,
    team2,
    null,
    team3,
    null,
  ];
  const categories = [
    // Main 15명 (주강사)
    'Main',
    'Main',
    'Main',
    'Main',
    'Main',
    'Main',
    'Main',
    'Main',
    'Main',
    'Main',
    'Main',
    'Main',
    'Main',
    'Main',
    'Main',
    // Co 10명 (부강사)
    'Co',
    'Co',
    'Co',
    'Co',
    'Co',
    'Co',
    'Co',
    'Co',
    'Co',
    'Co',
    // Assistant 10명 (보조강사)
    'Assistant',
    'Assistant',
    'Assistant',
    'Assistant',
    'Assistant',
    'Assistant',
    'Assistant',
    'Assistant',
    'Assistant',
    'Assistant',
    // Practicum 5명 (실습강사)
    'Practicum',
    'Practicum',
    'Practicum',
    'Practicum',
    'Practicum',
  ];
  const locations = [
    '서울시 강남구',
    '서울시 송파구',
    '서울시 마포구',
    '경기도 수원시',
    '경기도 성남시',
    '경기도 고양시',
    '인천시 남동구',
    '인천시 부평구',
    '강원도 원주시',
    '강원도 춘천시',
    '충청남도 천안시',
    '충청북도 청주시',
    '대전시 서구',
    '대전시 유성구',
    '전라북도 전주시',
    '전라남도 광주시',
    '광주시 서구',
    '경상북도 대구시',
    '경상남도 부산시',
    '부산시 해운대구',
    '서울시 강서구',
    '서울시 종로구',
    '서울시 서초구',
    '서울시 영등포구',
    '경기도 용인시',
    '경기도 안양시',
    '경기도 부천시',
    '경기도 화성시',
    '인천시 연수구',
    '강원도 강릉시',
    '충청남도 아산시',
    '충청북도 충주시',
    '대전시 동구',
    '전라북도 익산시',
    '전라남도 순천시',
    '경상북도 포항시',
    '경상남도 창원시',
    '부산시 사하구',
    '울산시 남구',
    '제주시',
  ];

  // 가용일 패턴 (12/15 기준으로 offset) - 40명 강사 전체 커버
  // Main 강사들은 넓은 범위로 설정 (12/15~1/20)
  const availabilityPatterns = [
    // Main 15명: 12/15~1/20 (36일간 넓은 가용일)
    { startOffset: 0, endOffset: 36 },
    { startOffset: 0, endOffset: 36 },
    { startOffset: 0, endOffset: 36 },
    { startOffset: 0, endOffset: 36 },
    { startOffset: 0, endOffset: 36 },
    { startOffset: 0, endOffset: 36 },
    { startOffset: 0, endOffset: 36 },
    { startOffset: 0, endOffset: 36 },
    { startOffset: 0, endOffset: 36 },
    { startOffset: 0, endOffset: 36 },
    { startOffset: 0, endOffset: 36 },
    { startOffset: 0, endOffset: 36 },
    { startOffset: 0, endOffset: 36 },
    { startOffset: 0, endOffset: 36 },
    { startOffset: 0, endOffset: 36 },
    // Co 10명: 12/20~1/15 (27일)
    { startOffset: 5, endOffset: 31 },
    { startOffset: 5, endOffset: 31 },
    { startOffset: 5, endOffset: 31 },
    { startOffset: 5, endOffset: 31 },
    { startOffset: 5, endOffset: 31 },
    { startOffset: 5, endOffset: 31 },
    { startOffset: 5, endOffset: 31 },
    { startOffset: 5, endOffset: 31 },
    { startOffset: 5, endOffset: 31 },
    { startOffset: 5, endOffset: 31 },
    // Assistant 10명: 12/18~1/10 (24일)
    { startOffset: 3, endOffset: 26 },
    { startOffset: 3, endOffset: 26 },
    { startOffset: 3, endOffset: 26 },
    { startOffset: 3, endOffset: 26 },
    { startOffset: 3, endOffset: 26 },
    { startOffset: 3, endOffset: 26 },
    { startOffset: 3, endOffset: 26 },
    { startOffset: 3, endOffset: 26 },
    { startOffset: 3, endOffset: 26 },
    { startOffset: 3, endOffset: 26 },
    // Practicum 5명: 12/22~1/08 (18일)
    { startOffset: 7, endOffset: 24 },
    { startOffset: 7, endOffset: 24 },
    { startOffset: 7, endOffset: 24 },
    { startOffset: 7, endOffset: 24 },
    { startOffset: 7, endOffset: 24 },
  ];

  for (let i = 1; i <= 40; i++) {
    const pattern = availabilityPatterns[i - 1];
    const availabilitiesData = [];

    for (let d = pattern.startOffset; d <= pattern.endOffset; d++) {
      const date = new Date(dec15);
      date.setDate(dec15.getDate() + d);
      availabilitiesData.push({ availableOn: date });
    }

    const user = await prisma.user.create({
      data: {
        userEmail: `instructor${i}@test.com`,
        password: '$2b$10$DUMMYHASHVALUE',
        name: `강사_${i}`,
        userphoneNumber: `010-0000-${String(i).padStart(4, '0')}`,
        status: 'APPROVED',
        instructor: {
          create: {
            teamId: teams[i - 1]?.id ?? null,
            category: categories[i - 1],
            location: locations[i - 1],
            isTeamLeader: i === 1 || i === 6 || i === 15,
            generation: 5 + Math.floor(i / 3),
            profileCompleted: true,
            virtues: {
              create: { virtueId: i % 2 === 0 ? virtue1.id : virtue2.id },
            },
            availabilities: {
              create: availabilitiesData,
            },
          },
        },
      },
      include: { instructor: true },
    });

    if (user.instructor) {
      instructors.push(user.instructor);
      const startDate = new Date(dec15);
      startDate.setDate(dec15.getDate() + pattern.startOffset);
      const endDate = new Date(dec15);
      endDate.setDate(dec15.getDate() + pattern.endOffset);
      console.log(
        `   ✓ 강사_${i} (${categories[i - 1]}) - ${startDate.toISOString().slice(5, 10)}~${endDate.toISOString().slice(5, 10)} 가능 (${availabilitiesData.length}일)`,
      );
    }
  }
  console.log(`✅ Created ${instructors.length} instructors\n`);

  // =========================================
  // 부대 10개 생성 (12/15 ~ 1/15 범위에 분산)
  // =========================================
  console.log('🏢 Creating 10 units...');

  const units = [];
  const unitConfigs = [
    // 12월 부대들
    { name: '제1부대', startOffset: 0, days: 3, region: '경기', wideArea: '경기도', locations: 1 }, // 12/15~17
    { name: '제2부대', startOffset: 3, days: 3, region: '강원', wideArea: '강원도', locations: 1 }, // 12/18~20
    {
      name: '제3부대',
      startOffset: 6,
      days: 2,
      region: '충청',
      wideArea: '충청남도',
      locations: 2,
    }, // 12/21~22 (2개 장소)
    {
      name: '제4부대',
      startOffset: 9,
      days: 3,
      region: '전라',
      wideArea: '전라북도',
      locations: 1,
    }, // 12/24~26
    {
      name: '제5부대',
      startOffset: 12,
      days: 3,
      region: '경상',
      wideArea: '경상북도',
      locations: 2,
    }, // 12/27~29 (2개 장소)
    // 12월 말 ~ 1월 초
    { name: '제6부대', startOffset: 15, days: 3, region: '서울', wideArea: '서울시', locations: 1 }, // 12/30~1/1
    { name: '제7부대', startOffset: 18, days: 3, region: '인천', wideArea: '인천시', locations: 1 }, // 1/2~4
    // 1월 부대들
    { name: '제8부대', startOffset: 21, days: 3, region: '대전', wideArea: '대전시', locations: 2 }, // 1/5~7 (2개 장소)
    { name: '제9부대', startOffset: 24, days: 3, region: '광주', wideArea: '광주시', locations: 1 }, // 1/8~10
    {
      name: '제10부대',
      startOffset: 27,
      days: 3,
      region: '부산',
      wideArea: '부산시',
      locations: 1,
    }, // 1/11~13
  ];

  for (let i = 0; i < unitConfigs.length; i++) {
    const cfg = unitConfigs[i];

    // 스케줄 생성
    const schedulesToCreate = [];
    for (let d = 0; d < cfg.days; d++) {
      const date = new Date(dec15);
      date.setDate(dec15.getDate() + cfg.startOffset + d);
      schedulesToCreate.push({ date: date });
    }

    // 교육장소 생성
    const locationsToCreate = [];
    for (let j = 1; j <= cfg.locations; j++) {
      locationsToCreate.push({
        originalPlace: `${cfg.name}_${j}교육장`,
        instructorsNumbers: 2,
        plannedCount: 60 + i * 5,
        actualCount: 55 + i * 5,
      });
    }

    const educationStart = new Date(dec15);
    educationStart.setDate(dec15.getDate() + cfg.startOffset);
    const educationEnd = new Date(dec15);
    educationEnd.setDate(dec15.getDate() + cfg.startOffset + cfg.days - 1);

    const unit = await prisma.unit.create({
      data: {
        name: cfg.name,
        unitType: 'Army',
        wideArea: cfg.wideArea,
        region: cfg.region,
        addressDetail: `${cfg.region} 어딘가`,
        educationStart: educationStart,
        educationEnd: educationEnd,
        officerName: `담당관${i + 1}`,
        officerPhone: `031-000-00${String(i + 1).padStart(2, '0')}`,
        schedules: {
          create: schedulesToCreate,
        },
        trainingLocations: {
          create: locationsToCreate,
        },
      },
      include: { schedules: true, trainingLocations: true },
    });
    units.push(unit);

    const startStr = educationStart.toISOString().slice(5, 10);
    const endStr = educationEnd.toISOString().slice(5, 10);
    const requiredInstructors = cfg.locations * 2;
    console.log(
      `   ✓ ${cfg.name} (${cfg.region}) - ${startStr}~${endStr}, ${cfg.locations}개 장소, 필요 ${requiredInstructors}명`,
    );
  }
  console.log(`✅ Created ${units.length} units\n`);

  // =========================================
  // 거리 데이터 생성
  // =========================================
  console.log('📍 Creating distance data...');

  const distanceData = [];
  for (const instructor of instructors) {
    for (const unit of units) {
      const loc = instructor.location || '';
      let baseDist = 80;

      // 지역별 거리 차등
      if (loc.includes('서울') || loc.includes('경기')) {
        if (unit.region === '서울' || unit.region === '경기') baseDist = 25;
        else if (unit.region === '인천') baseDist = 40;
        else baseDist = 100;
      } else if (loc.includes('강원')) {
        baseDist = unit.region === '강원' ? 20 : 120;
      } else if (loc.includes('충청') || loc.includes('대전') || loc.includes('세종')) {
        baseDist = unit.region === '충청' || unit.region === '대전' ? 25 : 90;
      } else if (loc.includes('전라') || loc.includes('광주')) {
        baseDist = unit.region === '전라' || unit.region === '광주' ? 30 : 100;
      } else if (loc.includes('경상') || loc.includes('부산') || loc.includes('대구')) {
        baseDist = unit.region === '경상' || unit.region === '부산' ? 30 : 110;
      }

      const variation = Math.floor(Math.random() * 30) - 15;
      const distance = Math.max(10, baseDist + variation);

      distanceData.push({
        userId: instructor.userId,
        unitId: unit.id,
        distance: distance,
        duration: Math.round(distance * 1.5 * 60),
      });
    }
  }

  await prisma.instructorUnitDistance.createMany({
    data: distanceData,
    skipDuplicates: true,
  });
  console.log(`✅ Created ${distanceData.length} distance records\n`);

  // =========================================
  // 요약
  // =========================================
  console.log('🏁 Seeding finished!\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`   Instructors: ${instructors.length} (5 Main, 5 Co, 10 Assistant, 5 Practicum)`);
  console.log(`   Units: ${units.length} (12월 5개, 1월 5개)`);
  console.log(`   Distance records: ${distanceData.length}`);
  console.log('');
  console.log('📅 강사 가용 기간:');
  console.log('   - 강사 1-5: 12/15~12/25');
  console.log('   - 강사 6-10: 12/20~12/31');
  console.log('   - 강사 11-15: 12/25~1/05');
  console.log('   - 강사 16-20: 1/01~1/12');
  console.log('   - 강사 21-25: 12/18~1/08 (넓은 범위)');
  console.log('═══════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
