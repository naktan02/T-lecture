// 최종 통합 테스트 데이터 시드 스크립트
// - 30명 강사 (모든 스키마 필드)
// - 100개 부대 (불가일자, 복수장소 포함)
// - 일정, 배정, 거리 데이터
// 실행: npx tsx prisma/seedFinalTest.ts

import { PrismaClient, UserCategory, MilitaryType } from '@prisma/client';

const prisma = new PrismaClient();

const LAST_NAMES = [
  '김',
  '이',
  '박',
  '최',
  '정',
  '강',
  '조',
  '윤',
  '장',
  '임',
  '한',
  '오',
  '서',
  '신',
];
const FIRST_NAMES = [
  '민준',
  '서준',
  '예준',
  '도윤',
  '시우',
  '주원',
  '하준',
  '지호',
  '준우',
  '도현',
  '건우',
  '우진',
];
const WIDE_AREAS = ['서울특별시', '경기도', '인천광역시', '충청남도', '강원도'];
const PLACES = ['대강당', '체육관', '교육관', '회의실', '다목적실', '세미나실', '훈련장'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🚀 최종 통합 테스트 데이터 시드 시작...\n');

  // 1. 기존 데이터 정리
  console.log('🧹 기존 데이터 정리...');
  await prisma.instructorUnitAssignment.deleteMany({});
  await prisma.instructorUnitDistance.deleteMany({});
  await prisma.instructorStats.deleteMany({});
  await prisma.instructorVirtue.deleteMany({});
  await prisma.instructorAvailability.deleteMany({});
  await prisma.unitSchedule.deleteMany({});
  await prisma.trainingLocation.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.instructor.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. 관리자 생성 (환경변수 사용)
  console.log('👤 관리자 생성...');
  const bcrypt = await import('bcrypt');

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@t-lecture.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin';
  const generalAdminEmail = process.env.GENERAL_ADMIN_EMAIL || 'general@t-lecture.com';
  const generalAdminPassword = process.env.GENERAL_ADMIN_PASSWORD || 'general';

  const superAdminHashedPassword = await bcrypt.hash(superAdminPassword, 10);
  const generalAdminHashedPassword = await bcrypt.hash(generalAdminPassword, 10);

  // 슈퍼 관리자
  const superAdmin = await prisma.user.create({
    data: {
      name: '슈퍼관리자',
      userEmail: superAdminEmail,
      password: superAdminHashedPassword,
      userphoneNumber: '010-1234-5678',
      status: 'APPROVED',
      admin: { create: { level: 'SUPER' } },
    },
  });

  // 일반 관리자
  const generalAdmin = await prisma.user.create({
    data: {
      name: '일반관리자',
      userEmail: generalAdminEmail,
      password: generalAdminHashedPassword,
      userphoneNumber: '010-8765-4321',
      status: 'APPROVED',
      admin: { create: { level: 'GENERAL' } },
    },
  });

  // 3. 팀 생성
  console.log('👥 팀 생성...');
  const teams = await Promise.all([
    prisma.team.upsert({
      where: { id: 1 },
      update: { name: '1팀', deletedAt: null },
      create: { name: '1팀' },
    }),
    prisma.team.upsert({
      where: { id: 2 },
      update: { name: '2팀', deletedAt: null },
      create: { name: '2팀' },
    }),
    prisma.team.upsert({
      where: { id: 3 },
      update: { name: '3팀', deletedAt: null },
      create: { name: '3팀' },
    }),
    prisma.team.upsert({
      where: { id: 4 },
      update: { name: '4팀', deletedAt: null },
      create: { name: '4팀' },
    }),
    prisma.team.upsert({
      where: { id: 5 },
      update: { name: '5팀', deletedAt: null },
      create: { name: '5팀' },
    }),
  ]);

  // 4. 덕목 생성
  console.log('📚 덕목 생성...');
  const virtues = await Promise.all([
    prisma.virtue.upsert({ where: { id: 1 }, update: { name: '효' }, create: { name: '효' } }),
    prisma.virtue.upsert({ where: { id: 2 }, update: { name: '예' }, create: { name: '예' } }),
    prisma.virtue.upsert({ where: { id: 3 }, update: { name: '충' }, create: { name: '충' } }),
    prisma.virtue.upsert({ where: { id: 4 }, update: { name: '인성' }, create: { name: '인성' } }),
  ]);

  // 5. 30명 강사 생성
  console.log('👨‍🏫 강사 30명 생성...');
  const categories: UserCategory[] = ['Main', 'Co', 'Assistant', 'Practicum'];
  const instructorUsers: { id: number; name: string }[] = [];

  // 강사 공통 비밀번호: instructor123
  const instructorPassword = await bcrypt.hash('instructor123', 10);

  for (let i = 0; i < 30; i++) {
    const name = `${randomChoice(LAST_NAMES)}${randomChoice(FIRST_NAMES)}`;
    const lat = 36.5 + (Math.random() - 0.5) * 2;
    const lng = 127.0 + (Math.random() - 0.5) * 2;
    const wideArea = randomChoice(WIDE_AREAS);
    const teamId = teams[i % 5].id;
    const category = categories[Math.min(i % 4, 3)];

    const user = await prisma.user.create({
      data: {
        name,
        userEmail: `instructor${i + 1}@test.com`,
        password: instructorPassword,
        userphoneNumber: `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
        status: 'APPROVED',
        instructor: {
          create: {
            category,
            teamId,
            isTeamLeader: i % 6 === 0,
            location: `${wideArea} 테스트구 강사로 ${i + 1}`,
            generation: randomInt(1, 20),
            restrictedArea: null,
            lat,
            lng,
            hasCar: Math.random() > 0.3,
            profileCompleted: true,
          },
        },
      },
    });

    instructorUsers.push({ id: user.id, name: user.name || '' });

    // 강사 덕목
    const shuffled = [...virtues].sort(() => Math.random() - 0.5);
    for (let v = 0; v < randomInt(2, 4); v++) {
      await prisma.instructorVirtue.create({
        data: { instructorId: user.id, virtueId: shuffled[v].id },
      });
    }

    // 강사 통계
    await prisma.instructorStats.create({
      data: {
        instructorId: user.id,
        totalWorkHours: 0,
        totalDistance: 0,
        totalWorkDays: 0,
        acceptedCount: 0,
        totalAssignmentsCount: 0,
      },
    });
  }

  // 6. 100개 부대 생성
  console.log('🏢 부대 100개 생성...');
  const unitTypes: MilitaryType[] = ['Army', 'Navy', 'AirForce', 'Marines', 'MND'];
  const createdUnits: { id: number; name: string }[] = [];

  for (let i = 0; i < 100; i++) {
    const dayOfMonth = (i % 26) + 1;
    const startDate = new Date(Date.UTC(2026, 0, dayOfMonth));
    const endDate = new Date(Date.UTC(2026, 0, dayOfMonth + 2));
    const lat = 34.5 + Math.random() * 3;
    const lng = 126.0 + Math.random() * 3;
    const wideArea = randomChoice(WIDE_AREAS);

    // 불가일자 설정
    let excludedDates: string[] = [];
    if (i >= 70 && i < 80) {
      // 단일 불가일자 (교육 둘째날)
      excludedDates = [new Date(Date.UTC(2026, 0, dayOfMonth + 1)).toISOString().split('T')[0]];
    } else if (i >= 80 && i < 90) {
      // 복수 불가일자 (둘째날, 셋째날)
      excludedDates = [
        new Date(Date.UTC(2026, 0, dayOfMonth + 1)).toISOString().split('T')[0],
        new Date(Date.UTC(2026, 0, dayOfMonth + 2)).toISOString().split('T')[0],
      ];
    }

    // 복수 교육장소 수
    let numLocations = 1;
    if (i >= 90) {
      numLocations = [2, 2, 2, 2, 3, 3, 3, 4, 4, 5][i - 90];
    }

    const locationData = [];
    for (let loc = 0; loc < numLocations; loc++) {
      locationData.push({
        originalPlace: loc === 0 ? randomChoice(PLACES) : `추가장소${loc + 1}`,
        changedPlace: null,
        hasInstructorLounge: true,
        hasWomenRestroom: true,
        hasCateredMeals: Math.random() > 0.3,
        hasHallLodging: Math.random() > 0.4,
        allowsPhoneBeforeAfter: true,
        plannedCount: randomInt(30, 150),
        actualCount: randomInt(20, 100),
        note: null,
      });
    }

    let unitName = `테스트부대${i + 1}`;
    if (i >= 70 && i < 80) unitName = `불가일자테스트부대${i - 69}`;
    else if (i >= 80 && i < 90) unitName = `복수불가일자테스트부대${i - 79}`;
    else if (i >= 90) unitName = `복수장소테스트부대${i - 89}`;

    const unit = await prisma.unit.create({
      data: {
        name: unitName,
        unitType: randomChoice(unitTypes),
        wideArea,
        region: `${wideArea} 테스트구`,
        addressDetail: `${wideArea} 테스트구 군사로 ${i + 1}`,
        detailAddress: `본관 ${randomInt(1, 5)}층`,
        lat,
        lng,
        educationStart: startDate,
        educationEnd: endDate,
        workStartTime: new Date('1970-01-01T09:00:00Z'),
        workEndTime: new Date('1970-01-01T18:00:00Z'),
        lunchStartTime: new Date('1970-01-01T12:00:00Z'),
        lunchEndTime: new Date('1970-01-01T13:00:00Z'),
        officerName: `${randomChoice(LAST_NAMES)}${randomChoice(FIRST_NAMES)}`,
        officerPhone: `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
        officerEmail: `officer${i + 1}@army.mil.kr`,
        isStaffLocked: false,
        excludedDates,
        trainingLocations: { create: locationData },
      },
    });

    createdUnits.push({ id: unit.id, name: unit.name || '' });
  }

  // 7. 일정 생성 (불가일자 제외)
  console.log('📅 일정 생성 (불가일자 제외)...');
  const schedules: { id: number; unitId: number; date: Date }[] = [];

  for (const unit of createdUnits) {
    const unitData = await prisma.unit.findUnique({
      where: { id: unit.id },
      select: { educationStart: true, educationEnd: true, excludedDates: true },
    });

    if (unitData?.educationStart && unitData?.educationEnd) {
      const start = new Date(unitData.educationStart);
      const end = new Date(unitData.educationEnd);
      const excludedSet = new Set(unitData.excludedDates);

      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        if (!excludedSet.has(dateStr)) {
          const schedule = await prisma.unitSchedule.create({
            data: { unitId: unit.id, date: new Date(current) },
          });
          schedules.push({ id: schedule.id, unitId: unit.id, date: new Date(current) });
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }
  }

  // 8. 배정 생성
  console.log('📋 강사 배정 생성...');
  const today = new Date(Date.UTC(2026, 0, 5));

  for (const schedule of schedules) {
    const numInstructors = randomInt(2, 4);
    const shuffled = [...instructorUsers].sort(() => Math.random() - 0.5);
    const location = await prisma.trainingLocation.findFirst({
      where: { unitId: schedule.unitId },
    });

    for (let i = 0; i < numInstructors; i++) {
      const scheduleDate = new Date(schedule.date);
      let state: 'Pending' | 'Accepted' = 'Accepted';
      if (scheduleDate > today && Math.random() > 0.7) state = 'Pending';

      try {
        await prisma.instructorUnitAssignment.create({
          data: {
            userId: shuffled[i].id,
            unitScheduleId: schedule.id,
            trainingLocationId: location?.id,
            classification: 'Confirmed',
            state,
            role: i === 0 ? 'Head' : null,
          },
        });
      } catch {
        /* 중복 무시 */
      }
    }
  }

  // 9. 거리 데이터 생성
  console.log('📏 거리 데이터 생성...');
  for (const inst of instructorUsers) {
    const instData = await prisma.instructor.findUnique({
      where: { userId: inst.id },
      select: { lat: true, lng: true },
    });
    if (!instData?.lat || !instData?.lng) continue;

    for (const unit of createdUnits) {
      const unitData = await prisma.unit.findUnique({
        where: { id: unit.id },
        select: { lat: true, lng: true },
      });
      if (!unitData?.lat || !unitData?.lng) continue;

      const latDiff = Math.abs(instData.lat - unitData.lat);
      const lngDiff = Math.abs(instData.lng - unitData.lng);
      const distance = Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 111;

      await prisma.instructorUnitDistance.create({
        data: {
          userId: inst.id,
          unitId: unit.id,
          distance: parseFloat(distance.toFixed(1)),
          duration: Math.round(distance * 1.5),
        },
      });
    }
  }

  // 10. 강사 통계 업데이트 (거리 포함)
  console.log('📊 강사 통계 업데이트...');
  for (const inst of instructorUsers) {
    // 완료된 배정 조회 (부대 정보 포함)
    const acceptedAssignments = await prisma.instructorUnitAssignment.findMany({
      where: { userId: inst.id, state: 'Accepted', UnitSchedule: { date: { lt: today } } },
      include: { UnitSchedule: { select: { unitId: true } } },
    });
    const total = await prisma.instructorUnitAssignment.count({ where: { userId: inst.id } });

    // 거리 데이터 조회
    const distances = await prisma.instructorUnitDistance.findMany({
      where: { userId: inst.id },
    });
    const distanceMap = new Map(
      distances.map((d) => [d.unitId, d.distance ? Number(d.distance) : 0]),
    );

    // 총 이동 거리 계산 (왕복이므로 *2)
    let totalDistance = 0;
    for (const assignment of acceptedAssignments) {
      const unitId = assignment.UnitSchedule?.unitId;
      if (unitId) {
        const dist = distanceMap.get(unitId) || 0;
        totalDistance += dist * 2;
      }
    }

    await prisma.instructorStats.update({
      where: { instructorId: inst.id },
      data: {
        totalWorkDays: acceptedAssignments.length,
        totalWorkHours: acceptedAssignments.length * 8,
        totalDistance: totalDistance,
        acceptedCount: acceptedAssignments.length,
        totalAssignmentsCount: total,
      },
    });
  }

  console.log('\n✅ 최종 통합 테스트 데이터 완료!');
  console.log(`   - 관리자: 1명`);
  console.log(`   - 강사: ${instructorUsers.length}명`);
  console.log(`   - 부대: ${createdUnits.length}개 (불가일자 20개, 복수장소 10개)`);
  console.log(`   - 일정: ${schedules.length}개`);
  console.log(`   - 거리: ${instructorUsers.length * createdUnits.length}개`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
