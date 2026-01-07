// server/prisma/seedBase.ts
// 기본 데이터 생성: Core(팀, 덕목, 관리자) + Users(강사/일반유저) + Units(부대)
// 배정(Assignment)은 포함하지 않음
// 실행: npx tsx prisma/seedBase.ts

/* eslint-disable no-console */

import 'dotenv/config';
import prisma from '../src/libs/prisma.js';
import bcrypt from 'bcrypt';
import { UserCategory, MilitaryType } from '../src/generated/prisma/client.js';

// ==================== 상수 정의 ====================

// 팀 데이터 (7개)
const TEAMS = [
  { id: 1, name: '1팀' },
  { id: 2, name: '2팀' },
  { id: 3, name: '3팀' },
  { id: 4, name: '4팀' },
  { id: 5, name: '5팀' },
  { id: 6, name: '6팀' },
  { id: 7, name: '7팀' },
];

// 덕목 데이터 (15개)
const VIRTUES = [
  { id: 1, name: '예' },
  { id: 2, name: '효' },
  { id: 3, name: '정직' },
  { id: 4, name: '책임' },
  { id: 5, name: '존중' },
  { id: 6, name: '배려' },
  { id: 7, name: '소통' },
  { id: 8, name: '협동' },
  { id: 9, name: '성실' },
  { id: 10, name: '용기' },
  { id: 11, name: '지혜' },
  { id: 12, name: '인내' },
  { id: 13, name: '겸손' },
  { id: 14, name: '감사' },
  { id: 15, name: '봉사' },
];

// 한국 이름 데이터
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
  '권',
];
const FIRST_NAMES_MALE = [
  '민준',
  '서준',
  '도윤',
  '예준',
  '시우',
  '하준',
  '지호',
  '주원',
  '지후',
  '준서',
  '준우',
  '현우',
  '도현',
  '지훈',
  '건우',
];
const FIRST_NAMES_FEMALE = [
  '서연',
  '서윤',
  '지우',
  '서현',
  '민서',
  '하윤',
  '지유',
  '윤서',
  '채원',
  '수아',
  '지민',
  '지아',
  '수빈',
  '예은',
  '다은',
];

// 지역 데이터 (위도/경도 포함)
const LOCATIONS = [
  {
    address: '서울특별시 강남구 테헤란로 123',
    lat: 37.5012,
    lng: 127.0396,
    wideArea: '서울특별시',
    region: '강남구',
  },
  {
    address: '서울특별시 서초구 서초대로 456',
    lat: 37.4837,
    lng: 127.0324,
    wideArea: '서울특별시',
    region: '서초구',
  },
  {
    address: '경기도 성남시 분당구 판교로 111',
    lat: 37.3947,
    lng: 127.1112,
    wideArea: '경기도',
    region: '성남시',
  },
  {
    address: '경기도 수원시 영통구 광교로 222',
    lat: 37.2912,
    lng: 127.0478,
    wideArea: '경기도',
    region: '수원시',
  },
  {
    address: '인천광역시 연수구 컨벤시아대로 666',
    lat: 37.3894,
    lng: 126.6413,
    wideArea: '인천광역시',
    region: '연수구',
  },
  {
    address: '강원도 춘천시 중앙로 888',
    lat: 37.8813,
    lng: 127.7298,
    wideArea: '강원도',
    region: '춘천시',
  },
  {
    address: '충청남도 천안시 서북구 불당로 111',
    lat: 36.8151,
    lng: 127.1139,
    wideArea: '충청남도',
    region: '천안시',
  },
  {
    address: '대전광역시 유성구 대학로 333',
    lat: 36.3623,
    lng: 127.3561,
    wideArea: '대전광역시',
    region: '유성구',
  },
  {
    address: '전라북도 전주시 완산구 홍산로 444',
    lat: 35.8242,
    lng: 127.1489,
    wideArea: '전라북도',
    region: '전주시',
  },
  {
    address: '부산광역시 해운대구 해운대로 777',
    lat: 35.1631,
    lng: 129.1637,
    wideArea: '부산광역시',
    region: '해운대구',
  },
];

// 부대명 접두사/접미사
const UNIT_PREFIXES = ['제1', '제2', '제3', '제5', '제7', '제11', '제15', '제21', '제25', '제30'];
const UNIT_TYPES_ARMY = ['사단', '여단', '연대', '대대', '중대'];
const UNIT_TYPES_NAVY = ['함대', '전대', '편대'];
const UNIT_TYPES_AF = ['비행단', '전투비행단', '공중기동비행단'];

// ==================== 유틸리티 함수 ====================

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateKoreanName(): string {
  const isMale = Math.random() > 0.4;
  const lastName = randomChoice(LAST_NAMES);
  const firstName = randomChoice(isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE);
  return `${lastName}${firstName}`;
}

function generatePhoneNumber(): string {
  return `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
}

// 2박3일 일정 날짜 생성 (시작일부터 3일)
function generate3DaySchedule(startDate: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d);
  }
  return dates;
}

// 강사 교육가능일 생성 (2025년 6월 ~ 2026년 2월, 랜덤 50~80일)
function generateAvailableDates(count: number): Date[] {
  const startDate = new Date(Date.UTC(2025, 5, 1)); // 2025-06-01
  const endDate = new Date(Date.UTC(2026, 1, 28)); // 2026-02-28

  const allDates: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    allDates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  const shuffled = allDates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 부대 일정 시작일 생성 (2025년 6월 ~ 2026년 1월)
function generateUnitStartDates(count: number): Date[] {
  const dates: Date[] = [];
  const startDate = new Date(Date.UTC(2025, 5, 1)); // 2025-06-01
  const endDate = new Date(Date.UTC(2026, 0, 25)); // 2026-01-25

  for (let i = 0; i < count; i++) {
    const randomTime =
      startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
    dates.push(new Date(randomTime));
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}

function generateUnitName(unitType: MilitaryType, index: number): string {
  const prefix = randomChoice(UNIT_PREFIXES);
  switch (unitType) {
    case 'Army':
    case 'Marines':
      return `${prefix}${randomChoice(UNIT_TYPES_ARMY)} ${index}`;
    case 'Navy':
      return `${prefix}${randomChoice(UNIT_TYPES_NAVY)} ${index}`;
    case 'AirForce':
      return `${prefix}${randomChoice(UNIT_TYPES_AF)} ${index}`;
    case 'MND':
      return `국직부대 ${prefix} ${index}`;
    default:
      return `부대 ${index}`;
  }
}

// ==================== 메인 함수 ====================

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     T-lecture 기본 데이터 시드 (강사 + 부대)               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();

  // ========== 1. 핵심 데이터 생성 (팀, 덕목, 관리자) ==========
  console.log('[1/3] 핵심 메타데이터 생성...');

  // 1-1. 팀 생성
  for (const team of TEAMS) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: { name: team.name, deletedAt: null },
      create: { id: team.id, name: team.name },
    });
  }
  console.log(`  ✅ 팀 ${TEAMS.length}개 생성`);

  // 1-2. 덕목 생성
  for (const virtue of VIRTUES) {
    await prisma.virtue.upsert({
      where: { id: virtue.id },
      update: { name: virtue.name },
      create: { id: virtue.id, name: virtue.name },
    });
  }
  console.log(`  ✅ 덕목 ${VIRTUES.length}개 생성`);

  // 1-3. 관리자 생성
  const superEmail = process.env.SUPER_ADMIN_EMAIL;
  const superPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (superEmail && superPassword) {
    const hashedPassword = await bcrypt.hash(superPassword, 10);
    const existingUser = await prisma.user.findUnique({ where: { userEmail: superEmail } });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          userEmail: superEmail,
          password: hashedPassword,
          name: '슈퍼관리자',
          userphoneNumber: '010-0000-0001',
          status: 'APPROVED',
          admin: { create: { level: 'SUPER' } },
        },
      });
      console.log(`  ✅ 슈퍼관리자 생성: ${superEmail}`);
    } else {
      console.log(`  ⚠️ 슈퍼관리자 이미 존재: ${superEmail}`);
    }
  }

  // ========== 2. 유저 데이터 생성 (강사 + 일반유저) ==========
  console.log('\n[2/3] 유저 데이터 생성 (강사 20명 + 일반유저 5명)...');

  const password = await bcrypt.hash('test1234', 10);
  const teams = await prisma.team.findMany({ orderBy: { id: 'asc' } });
  const virtues = await prisma.virtue.findMany({ orderBy: { id: 'asc' } });

  // 강사 카테고리별 배분
  const categories: { type: UserCategory; count: number }[] = [
    { type: 'Main', count: 8 }, // 주강사 8명
    { type: 'Co', count: 6 }, // 부강사 6명
    { type: 'Assistant', count: 4 }, // 보조강사 4명
    { type: 'Practicum', count: 2 }, // 실습강 2명
  ];

  let instructorIndex = 0;
  const totalInstructors = 20;

  // 팀 배정 (70%는 팀 소속, 30%는 미소속)
  const teamAssignments: (number | null)[] = [];
  const instructorsPerTeam = Math.floor((totalInstructors * 0.7) / teams.length);
  for (let t = 0; t < teams.length; t++) {
    for (let i = 0; i < instructorsPerTeam; i++) {
      teamAssignments.push(teams[t].id);
    }
  }
  while (teamAssignments.length < totalInstructors) {
    teamAssignments.push(null);
  }
  teamAssignments.sort(() => Math.random() - 0.5);

  for (const { type, count } of categories) {
    for (let i = 0; i < count; i++) {
      const name = generateKoreanName();
      const email = `instructor${String(instructorIndex + 1).padStart(3, '0')}@test.com`;
      const phone = generatePhoneNumber();
      const location = randomChoice(LOCATIONS);
      const teamId = teamAssignments[instructorIndex];

      // 팀장 설정 (각 팀의 첫 번째 주강사)
      let isTeamLeader = false;
      if (type === 'Main' && teamId !== null) {
        const existingLeader = await prisma.instructor.findFirst({
          where: { teamId, isTeamLeader: true },
        });
        if (!existingLeader) isTeamLeader = true;
      }

      try {
        const user = await prisma.user.create({
          data: {
            userEmail: email,
            password: password,
            name: name,
            userphoneNumber: phone,
            status: 'APPROVED',
            instructor: {
              create: {
                category: type,
                teamId: teamId,
                isTeamLeader: isTeamLeader,
                location: location.address,
                lat: location.lat,
                lng: location.lng,
                generation: randomInt(1, 20),
                hasCar: Math.random() > 0.3,
                profileCompleted: true,
              },
            },
          },
        });

        // 덕목 할당
        const virtueCount =
          type === 'Main' ? 15 : type === 'Co' ? randomInt(8, 12) : randomInt(5, 8);
        const shuffledVirtues = [...virtues].sort(() => Math.random() - 0.5);
        for (let v = 0; v < Math.min(virtueCount, shuffledVirtues.length); v++) {
          await prisma.instructorVirtue
            .create({
              data: { instructorId: user.id, virtueId: shuffledVirtues[v].id },
            })
            .catch(() => {});
        }

        // 교육가능일 생성 (50~80일)
        const availableDates = generateAvailableDates(randomInt(50, 80));
        for (const date of availableDates) {
          await prisma.instructorAvailability
            .create({
              data: { instructorId: user.id, availableOn: date },
            })
            .catch(() => {});
        }

        // 강사 통계 초기화
        await prisma.instructorStats
          .create({
            data: {
              instructorId: user.id,
              legacyPracticumCount: 0,
              autoPromotionEnabled: true,
              totalWorkHours: 0,
              totalDistance: 0,
              totalWorkDays: 0,
              acceptedCount: 0,
              totalAssignmentsCount: 0,
            },
          })
          .catch(() => {});

        const teamLabel = teamId ? `팀${teamId}` : '미소속';
        const leaderLabel = isTeamLeader ? '👑' : '';
        console.log(
          `  ${type.padEnd(10)} ${leaderLabel}${name} (${email}) - ${teamLabel}, 가용일 ${availableDates.length}일`,
        );

        instructorIndex++;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : '알 수 없는 에러';
        console.error(`  ❌ 생성 실패: ${email}`, msg);
      }
    }
  }
  console.log(`  ✅ 강사 ${instructorIndex}명 생성 완료`);

  // 일반 유저 5명 생성
  console.log('\n  👤 일반 유저 5명 생성 중...');
  for (let i = 1; i <= 5; i++) {
    const name = generateKoreanName();
    const email = `user${String(i).padStart(3, '0')}@test.com`;
    const phone = generatePhoneNumber();

    try {
      await prisma.user.create({
        data: {
          userEmail: email,
          password: password,
          name: name,
          userphoneNumber: phone,
          status: 'APPROVED',
        },
      });
      console.log(`  ✅ ${name} (${email})`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '알 수 없는 에러';
      console.error(`  ❌ 생성 실패: ${email}`, msg);
    }
  }

  // ========== 3. 부대 데이터 생성 (2박3일 일정) ==========
  console.log('\n[3/3] 부대 데이터 생성 (50개, 2박3일 일정)...');

  const unitCount = 50;
  const unitStartDates = generateUnitStartDates(unitCount);
  const militaryTypes: MilitaryType[] = ['Army', 'Navy', 'AirForce', 'Marines', 'MND'];

  let createdUnits = 0;
  let totalSchedules = 0;
  let totalLocations = 0;

  for (let i = 0; i < unitCount; i++) {
    const unitType = randomChoice(militaryTypes);
    const unitName = generateUnitName(unitType, i + 1);
    const location = randomChoice(LOCATIONS);
    const startDate = unitStartDates[i];

    try {
      // 1. Unit 생성
      const unit = await prisma.unit.create({
        data: {
          lectureYear: startDate.getUTCFullYear(), // 일정 시작년도 기준
          name: unitName,
          unitType: unitType,
          wideArea: location.wideArea,
          region: location.region,
          addressDetail: location.address,
          lat: location.lat + (Math.random() - 0.5) * 0.1,
          lng: location.lng + (Math.random() - 0.5) * 0.1,
        },
      });

      // 2. TrainingPeriod 생성 (2박3일 일정)
      const workStart = new Date(2000, 0, 1, 9, 0, 0);
      const workEnd = new Date(2000, 0, 1, 18, 0, 0);
      const lunchStart = new Date(2000, 0, 1, 12, 0, 0);
      const lunchEnd = new Date(2000, 0, 1, 13, 0, 0);

      const trainingPeriod = await prisma.trainingPeriod.create({
        data: {
          unitId: unit.id,
          name: '정규교육',
          workStartTime: workStart,
          workEndTime: workEnd,
          lunchStartTime: lunchStart,
          lunchEndTime: lunchEnd,
          officerName: generateKoreanName(),
          officerPhone: generatePhoneNumber(),
          officerEmail: `officer${i + 1}@unit.mil.kr`,
          isStaffLocked: false,
          excludedDates: [],
          hasCateredMeals: Math.random() > 0.5,
          hasHallLodging: Math.random() > 0.7,
          allowsPhoneBeforeAfter: Math.random() > 0.3,
        },
      });

      // 3. UnitSchedule 생성 (3일)
      const scheduleDates = generate3DaySchedule(startDate);
      const createdSchedules = await prisma.unitSchedule.createManyAndReturn({
        data: scheduleDates.map((date) => ({
          trainingPeriodId: trainingPeriod.id,
          date: date,
        })),
      });
      totalSchedules += createdSchedules.length;

      // 4. TrainingLocation 생성 (1~2개)
      const locationCount = Math.random() > 0.7 ? 2 : 1;
      for (let loc = 0; loc < locationCount; loc++) {
        const trainingLocation = await prisma.trainingLocation.create({
          data: {
            trainingPeriodId: trainingPeriod.id,
            originalPlace: `${unit.name} 교육장${loc > 0 ? ` ${loc + 1}` : ''}`,
            changedPlace: null,
            hasInstructorLounge: Math.random() > 0.5,
            hasWomenRestroom: Math.random() > 0.3,
            note: null,
          },
        });
        totalLocations++;

        // 5. ScheduleLocation 생성 (각 일정-장소 연결)
        for (const schedule of createdSchedules) {
          await prisma.scheduleLocation.create({
            data: {
              unitScheduleId: schedule.id,
              trainingLocationId: trainingLocation.id,
              plannedCount: randomInt(30, 50),
              actualCount: null,
            },
          });
        }
      }

      createdUnits++;
      if ((i + 1) % 10 === 0) {
        console.log(`  📊 ${i + 1}/${unitCount} 부대 생성...`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '알 수 없는 에러';
      console.error(`  ❌ 부대 생성 실패: ${unitName}`, msg);
    }
  }

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    ✅ 시드 완료!                          ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  소요 시간: ${elapsedTime}초`.padEnd(61) + '║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  생성 결과:                                                ║');
  console.log(`║  - 팀: ${TEAMS.length}개                                    `.padEnd(61) + '║');
  console.log(`║  - 덕목: ${VIRTUES.length}개                                `.padEnd(61) + '║');
  console.log(`║  - 강사: ${instructorIndex}명 (가용일 포함)                 `.padEnd(61) + '║');
  console.log(`║  - 일반 유저: 5명                                          `.padEnd(61) + '║');
  console.log(`║  - 부대: ${createdUnits}개                                  `.padEnd(61) + '║');
  console.log(`║  - 부대 일정: ${totalSchedules}개 (2박3일)                  `.padEnd(61) + '║');
  console.log(`║  - 교육 장소: ${totalLocations}개                           `.padEnd(61) + '║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('🔐 테스트 계정:');
  console.log('   - 관리자: SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD (from .env)');
  console.log('   - 강사: instructor001@test.com ~ instructor020@test.com / test1234');
  console.log('   - 일반: user001@test.com ~ user005@test.com / test1234');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ 시드 실행 중 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
