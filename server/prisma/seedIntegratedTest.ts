// 통합 테스트 데이터 시드 스크립트
// - 30명 강사 (모든 필드 채움)
// - 일정 데이터 생성 (2026년 1월)
// - 배정 데이터 생성 (Accepted 상태)
// - 거리 데이터 생성
// 실행: npx tsx prisma/seedIntegratedTest.ts

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
  '현우',
  '지민',
];
const WIDE_AREAS = ['서울특별시', '경기도', '인천광역시', '충청남도', '강원도'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('🚀 통합 테스트 데이터 시드 시작...\n');

  // 1. 기존 데이터 정리 (선택적)
  // eslint-disable-next-line no-console
  console.log('🧹 기존 테스트 데이터 정리 중...');
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
  await prisma.user.deleteMany({ where: { id: { not: 1 } } }); // 기본 관리자 제외

  // 2. 팀 생성
  // eslint-disable-next-line no-console
  console.log('👥 팀 생성 중...');
  const teams = await Promise.all([
    prisma.team.upsert({ where: { id: 1 }, update: { name: '1팀' }, create: { name: '1팀' } }),
    prisma.team.upsert({ where: { id: 2 }, update: { name: '2팀' }, create: { name: '2팀' } }),
    prisma.team.upsert({ where: { id: 3 }, update: { name: '3팀' }, create: { name: '3팀' } }),
    prisma.team.upsert({ where: { id: 4 }, update: { name: '4팀' }, create: { name: '4팀' } }),
    prisma.team.upsert({ where: { id: 5 }, update: { name: '5팀' }, create: { name: '5팀' } }),
  ]);

  // 3. 덕목 생성
  // eslint-disable-next-line no-console
  console.log('📚 덕목 생성 중...');
  const virtues = await Promise.all([
    prisma.virtue.upsert({ where: { id: 1 }, update: { name: '효' }, create: { name: '효' } }),
    prisma.virtue.upsert({ where: { id: 2 }, update: { name: '예' }, create: { name: '예' } }),
    prisma.virtue.upsert({ where: { id: 3 }, update: { name: '충' }, create: { name: '충' } }),
    prisma.virtue.upsert({ where: { id: 4 }, update: { name: '인성' }, create: { name: '인성' } }),
  ]);

  // 4. 30명 강사 생성
  // eslint-disable-next-line no-console
  console.log('👨‍🏫 강사 30명 생성 중...');
  const categories: UserCategory[] = ['Main', 'Co', 'Assistant', 'Practicum'];
  const instructorUsers: { id: number; name: string }[] = [];

  for (let i = 0; i < 30; i++) {
    const name = `${randomChoice(LAST_NAMES)}${randomChoice(FIRST_NAMES)}`;
    const email = `instructor${i + 1}@test.com`;
    const lat = 36.5 + (Math.random() - 0.5) * 2; // 35.5~37.5
    const lng = 127.0 + (Math.random() - 0.5) * 2; // 126~128
    const wideArea = randomChoice(WIDE_AREAS);
    const teamId = teams[i % 5].id;
    const category = categories[Math.min(i % 4, 3)];
    const generation = randomInt(1, 20);

    const user = await prisma.user.create({
      data: {
        name,
        userEmail: email,
        password: '$2b$10$hashedpassword', // 더미 해시
        userphoneNumber: `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
        status: 'APPROVED',
        instructor: {
          create: {
            category,
            teamId,
            isTeamLeader: i % 6 === 0, // 6명마다 팀장
            location: `${wideArea} 테스트구 강사로 ${i + 1}`,
            generation,
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

    // 강사 덕목 연결 (랜덤 2~4개)
    const shuffledVirtues = [...virtues].sort(() => Math.random() - 0.5);
    const numVirtues = randomInt(2, 4);
    for (let v = 0; v < numVirtues; v++) {
      await prisma.instructorVirtue.create({
        data: { instructorId: user.id, virtueId: shuffledVirtues[v].id },
      });
    }

    // 강사 통계 초기화
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

  // 5. 부대 100개 생성 (엑셀 업로드 대신 직접 생성 - 테스트용)
  // eslint-disable-next-line no-console
  console.log('🏢 부대 100개 생성 중...');
  const unitTypes: MilitaryType[] = ['Army', 'Navy', 'AirForce', 'Marines', 'MND'];
  const places = ['대강당', '체육관', '교육관', '회의실', '훈련장'];
  const createdUnits: { id: number; name: string }[] = [];

  for (let i = 0; i < 100; i++) {
    const dayOfMonth = (i % 26) + 1; // 2026-01-01 ~ 01-26
    const startDate = new Date(Date.UTC(2026, 0, dayOfMonth));
    const endDate = new Date(Date.UTC(2026, 0, dayOfMonth + 2)); // 3일 교육

    const lat = 33.5 + Math.random() * 4;
    const lng = 126.0 + Math.random() * 4;
    const wideArea = randomChoice(WIDE_AREAS);

    const unit = await prisma.unit.create({
      data: {
        name: `테스트부대${i + 1}`,
        unitType: randomChoice(unitTypes),
        wideArea,
        region: `${wideArea} 테스트구`,
        addressDetail: `${wideArea} 테스트구 군사로 ${i + 1}`,
        detailAddress: `본관 ${randomInt(1, 10)}층`,
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
        trainingLocations: {
          create: [
            {
              originalPlace: randomChoice(places),
              hasInstructorLounge: true,
              hasWomenRestroom: true,
              hasCateredMeals: Math.random() > 0.3,
              plannedCount: randomInt(30, 150),
              actualCount: randomInt(20, 100),
            },
            // 10개 부대에 추가 교육장소
            ...(i >= 90
              ? [
                  {
                    originalPlace: `추가장소${i - 89}`,
                    hasInstructorLounge: true,
                    hasWomenRestroom: true,
                    plannedCount: randomInt(20, 80),
                  },
                ]
              : []),
          ],
        },
      },
    });

    createdUnits.push({ id: unit.id, name: unit.name || '' });
  }

  // 6. 일정 생성 (각 부대별 3일 일정)
  // eslint-disable-next-line no-console
  console.log('📅 부대 일정 생성 중...');
  const schedules: { id: number; unitId: number; date: Date }[] = [];

  for (const unit of createdUnits) {
    const unitData = await prisma.unit.findUnique({
      where: { id: unit.id },
      select: { educationStart: true, educationEnd: true },
    });

    if (unitData?.educationStart) {
      // 3일 일정 생성
      for (let d = 0; d < 3; d++) {
        const scheduleDate = new Date(unitData.educationStart);
        scheduleDate.setUTCDate(scheduleDate.getUTCDate() + d);

        const schedule = await prisma.unitSchedule.create({
          data: {
            unitId: unit.id,
            date: scheduleDate,
          },
        });

        schedules.push({ id: schedule.id, unitId: unit.id, date: scheduleDate });
      }
    }
  }

  // 7. 배정 생성 (일정마다 2~4명 강사 배정)
  // eslint-disable-next-line no-console
  console.log('📋 강사 배정 생성 중...');
  const today = new Date(Date.UTC(2026, 0, 5)); // 2026-01-05 기준

  for (const schedule of schedules) {
    const numInstructors = randomInt(2, 4);
    const shuffledInstructors = [...instructorUsers].sort(() => Math.random() - 0.5);

    // 첫 번째 training location 가져오기
    const location = await prisma.trainingLocation.findFirst({
      where: { unitId: schedule.unitId },
    });

    for (let i = 0; i < numInstructors; i++) {
      const instructor = shuffledInstructors[i];
      const scheduleDate = new Date(schedule.date);

      // 과거 일정은 Accepted, 미래 일정은 일부 Pending
      let state: 'Pending' | 'Accepted' = 'Accepted';
      if (scheduleDate > today && Math.random() > 0.7) {
        state = 'Pending';
      }

      try {
        await prisma.instructorUnitAssignment.create({
          data: {
            userId: instructor.id,
            unitScheduleId: schedule.id,
            trainingLocationId: location?.id,
            classification: 'Confirmed',
            state,
            role: i === 0 ? 'Head' : null,
          },
        });
      } catch {
        // 중복 배정 무시
      }
    }
  }

  // 8. 거리 데이터 생성
  // eslint-disable-next-line no-console
  console.log('📏 거리 데이터 생성 중...');

  for (const instructor of instructorUsers) {
    const instructorData = await prisma.instructor.findUnique({
      where: { userId: instructor.id },
      select: { lat: true, lng: true },
    });

    if (!instructorData?.lat || !instructorData?.lng) continue;

    for (const unit of createdUnits) {
      const unitData = await prisma.unit.findUnique({
        where: { id: unit.id },
        select: { lat: true, lng: true },
      });

      if (!unitData?.lat || !unitData?.lng) continue;

      // 간단한 거리 계산 (위경도 차이 기반, km 단위 근사)
      const latDiff = Math.abs(instructorData.lat - unitData.lat);
      const lngDiff = Math.abs(instructorData.lng - unitData.lng);
      const distance = Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 111; // 대략적인 km 변환
      const duration = Math.round(distance * 1.5); // 대략적인 이동시간 (분)

      await prisma.instructorUnitDistance.create({
        data: {
          userId: instructor.id,
          unitId: unit.id,
          distance: parseFloat(distance.toFixed(1)),
          duration,
        },
      });
    }
  }

  // 9. 강사 통계 업데이트 (완료된 배정 기반)
  // eslint-disable-next-line no-console
  console.log('📊 강사 통계 업데이트 중...');

  for (const instructor of instructorUsers) {
    const acceptedAssignments = await prisma.instructorUnitAssignment.findMany({
      where: {
        userId: instructor.id,
        state: 'Accepted',
        UnitSchedule: { date: { lt: today } },
      },
    });

    const totalAssignments = await prisma.instructorUnitAssignment.count({
      where: { userId: instructor.id },
    });

    await prisma.instructorStats.update({
      where: { instructorId: instructor.id },
      data: {
        totalWorkDays: acceptedAssignments.length,
        totalWorkHours: acceptedAssignments.length * 8,
        acceptedCount: acceptedAssignments.length,
        totalAssignmentsCount: totalAssignments,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('\n✅ 통합 테스트 데이터 시드 완료!');
  // eslint-disable-next-line no-console
  console.log(`   - 강사: ${instructorUsers.length}명`);
  // eslint-disable-next-line no-console
  console.log(`   - 부대: ${createdUnits.length}개`);
  // eslint-disable-next-line no-console
  console.log(`   - 일정: ${schedules.length}개`);
  // eslint-disable-next-line no-console
  console.log(`   - 거리 데이터: ${instructorUsers.length * createdUnits.length}개`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
