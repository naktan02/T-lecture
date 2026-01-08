// server/prisma/seedUsers.ts
// 유저 테스트 데이터 생성 - 강사 80명 + 일반유저 10명 + 가입대기 10명
// 실행: npx tsx prisma/seedUsers.ts

/* eslint-disable no-console */

import 'dotenv/config';
import { UserCategory } from '../src/generated/prisma/client.js';
import prisma from '../src/libs/prisma.js';
import bcrypt from 'bcrypt';

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
  '황',
  '안',
  '송',
  '류',
  '홍',
  '전',
  '고',
  '문',
  '양',
  '손',
  '배',
  '백',
  '허',
  '유',
  '남',
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
  '우진',
  '선우',
  '서진',
  '유준',
  '민성',
  '영호',
  '동현',
  '성민',
  '재원',
  '태현',
  '승현',
  '준혁',
  '민혁',
  '정우',
  '지환',
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
  '유나',
  '가은',
  '예진',
  '소율',
  '지원',
  '민지',
  '수진',
  '혜원',
  '유진',
  '은지',
  '지영',
  '현정',
  '미영',
  '선영',
  '정희',
];

// 지역 데이터 (위도/경도 포함)
const LOCATIONS = [
  { address: '서울특별시 강남구 테헤란로 123', lat: 37.5012, lng: 127.0396 },
  { address: '서울특별시 서초구 서초대로 456', lat: 37.4837, lng: 127.0324 },
  { address: '서울특별시 송파구 올림픽로 789', lat: 37.5145, lng: 127.1059 },
  { address: '서울특별시 마포구 월드컵북로 100', lat: 37.5665, lng: 126.9012 },
  { address: '서울특별시 영등포구 여의대로 200', lat: 37.5259, lng: 126.9249 },
  { address: '서울특별시 종로구 세종대로 201', lat: 37.572, lng: 126.977 },
  { address: '서울특별시 용산구 이태원로 302', lat: 37.534, lng: 126.994 },
  { address: '경기도 성남시 분당구 판교로 111', lat: 37.3947, lng: 127.1112 },
  { address: '경기도 수원시 영통구 광교로 222', lat: 37.2912, lng: 127.0478 },
  { address: '경기도 용인시 기흥구 구갈로 333', lat: 37.2754, lng: 127.1155 },
  { address: '경기도 고양시 일산동구 중앙로 444', lat: 37.6584, lng: 126.7693 },
  { address: '경기도 파주시 금릉역로 555', lat: 37.7606, lng: 126.7804 },
  { address: '경기도 화성시 동탄대로 666', lat: 37.206, lng: 127.074 },
  { address: '인천광역시 연수구 컨벤시아대로 777', lat: 37.3894, lng: 126.6413 },
  { address: '인천광역시 남동구 논현로 888', lat: 37.4116, lng: 126.7331 },
  { address: '강원도 춘천시 중앙로 999', lat: 37.8813, lng: 127.7298 },
  { address: '강원도 원주시 단계로 100', lat: 37.3422, lng: 127.9202 },
  { address: '강원도 강릉시 경포로 200', lat: 37.7519, lng: 128.8761 },
  { address: '충청남도 천안시 서북구 불당로 300', lat: 36.8151, lng: 127.1139 },
  { address: '충청북도 청주시 흥덕구 복대로 400', lat: 36.6357, lng: 127.4913 },
  { address: '대전광역시 유성구 대학로 500', lat: 36.3623, lng: 127.3561 },
  { address: '전라북도 전주시 완산구 홍산로 600', lat: 35.8242, lng: 127.1489 },
  { address: '전라남도 광주시 북구 용봉로 700', lat: 35.1756, lng: 126.9121 },
  { address: '경상북도 대구시 수성구 동대구로 800', lat: 35.8588, lng: 128.6321 },
  { address: '경상남도 부산시 해운대구 해운대로 900', lat: 35.1631, lng: 129.1637 },
  { address: '경상남도 창원시 성산구 중앙대로 1000', lat: 35.227, lng: 128.6811 },
];

const RESTRICTED_AREAS = [
  null,
  null,
  null,
  null,
  null,
  '강원도',
  '제주도',
  '경상북도 울릉군',
  '전라남도 신안군',
  '강원도 고성군',
  '경기도 파주시',
  null,
  null,
  null,
  null,
];

// 유틸리티 함수
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateKoreanName(): string {
  const isMale = Math.random() > 0.4; // 60% 남성
  const lastName = randomChoice(LAST_NAMES);
  const firstName = randomChoice(isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE);
  return `${lastName}${firstName}`;
}

function generatePhoneNumber(): string {
  return `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
}

// 교육가능일 생성 (2025년 전체 + 2026년 1~2월)
// 3일 연속 가능하도록 블록 단위로 생성
function generateAvailableDates(): Date[] {
  const dates: Date[] = [];
  const periods = [
    { start: new Date(Date.UTC(2025, 0, 1)), end: new Date(Date.UTC(2025, 11, 31)) }, // 2025년 전체
    { start: new Date(Date.UTC(2026, 0, 1)), end: new Date(Date.UTC(2026, 1, 28)) }, // 2026년 1~2월
  ];

  for (const period of periods) {
    const current = new Date(period.start);
    while (current <= period.end) {
      // 80% 확률로 해당 날짜 가능
      if (Math.random() > 0.2) {
        // 3일 연속으로 추가 (2박3일 교육 대응)
        for (let d = 0; d < 3 && new Date(current.getTime() + d * 86400000) <= period.end; d++) {
          const date = new Date(current.getTime() + d * 86400000);
          if (!dates.some((existing) => existing.getTime() === date.getTime())) {
            dates.push(date);
          }
        }
        current.setUTCDate(current.getUTCDate() + 3); // 3일 건너뛰기
      } else {
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }
  }

  return dates;
}

export async function runSeedUsers() {
  console.log('👥 유저 데이터 생성 시작...\n');

  const password = await bcrypt.hash('test1234', 10);

  // 팀과 덕목 조회
  const teams = await prisma.team.findMany({ orderBy: { id: 'asc' } });
  const virtues = await prisma.virtue.findMany({ orderBy: { id: 'asc' } });

  if (teams.length === 0 || virtues.length === 0) {
    console.error('❌ 팀 또는 덕목 데이터가 없습니다. seedCore.ts를 먼저 실행하세요.');
    return;
  }

  // 강사 분류별 배열 (총 80명)
  const categories: { type: UserCategory; count: number }[] = [
    { type: 'Main', count: 30 }, // 주강사 30명
    { type: 'Co', count: 25 }, // 부강사 25명
    { type: 'Assistant', count: 15 }, // 보조강사 15명
    { type: 'Practicum', count: 10 }, // 실습강 10명
  ];

  const totalInstructors = 80;
  let instructorIndex = 0;
  const instructorIds: number[] = [];

  // 팀 배정 계획: 70% 팀 소속, 30% 미소속
  const teamAssignments: (number | null)[] = [];
  const teamCount = teams.length;
  const instructorsPerTeam = Math.floor((totalInstructors * 0.7) / teamCount);

  for (let t = 0; t < teamCount; t++) {
    for (let i = 0; i < instructorsPerTeam; i++) {
      teamAssignments.push(teams[t].id);
    }
  }
  while (teamAssignments.length < totalInstructors) {
    teamAssignments.push(null);
  }
  teamAssignments.sort(() => Math.random() - 0.5);

  console.log('👨‍🏫 강사 80명 생성 중...');

  for (const { type, count } of categories) {
    for (let i = 0; i < count; i++) {
      const name = generateKoreanName();
      const email = `instructor${String(instructorIndex + 1).padStart(3, '0')}@test.com`;
      const phone = generatePhoneNumber();
      const location = randomChoice(LOCATIONS);
      const teamId = teamAssignments[instructorIndex];

      // 각 팀의 첫 번째 주강사를 팀장으로 설정
      let isTeamLeader = false;
      if (type === 'Main' && teamId !== null) {
        const existingLeader = await prisma.instructor.findFirst({
          where: { teamId, isTeamLeader: true },
        });
        if (!existingLeader) {
          isTeamLeader = true;
        }
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
                generation: randomInt(1, 25),
                restrictedArea: randomChoice(RESTRICTED_AREAS),
                hasCar: Math.random() > 0.3,
                profileCompleted: true,
              },
            },
          },
        });

        instructorIds.push(user.id);

        // 덕목 할당
        let virtueCount: number;
        if (type === 'Main') {
          virtueCount = 15; // 주강사는 전체 15개
        } else if (type === 'Co') {
          virtueCount = randomInt(10, 13);
        } else if (type === 'Assistant') {
          virtueCount = randomInt(6, 9);
        } else {
          virtueCount = randomInt(3, 6); // 실습강
        }

        const shuffledVirtues = [...virtues].sort(() => Math.random() - 0.5);
        for (let v = 0; v < Math.min(virtueCount, shuffledVirtues.length); v++) {
          await prisma.instructorVirtue
            .create({
              data: { instructorId: user.id, virtueId: shuffledVirtues[v].id },
            })
            .catch(() => {}); // 중복 무시
        }

        // 교육가능일 생성 (2025년 전체 + 2026년 1~2월)
        const availableDates = generateAvailableDates();
        for (const date of availableDates) {
          await prisma.instructorAvailability
            .create({
              data: { instructorId: user.id, availableOn: date },
            })
            .catch(() => {}); // 중복 무시
        }

        // 강사 통계 초기화
        await prisma.instructorStats
          .create({
            data: {
              instructorId: user.id,
              legacyPracticumCount: type === 'Practicum' ? randomInt(0, 5) : 0,
              autoPromotionEnabled: true,
            },
          })
          .catch(() => {});

        if ((instructorIndex + 1) % 10 === 0) {
          console.log(`  ✅ 강사 ${instructorIndex + 1}/80 생성 완료`);
        }

        instructorIndex++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ 생성 실패: ${email}`, message);
      }
    }
  }
  console.log(`  ✅ 강사 총 ${instructorIndex}명 생성 완료\n`);

  // 일반 유저 10명 생성 (APPROVED, Instructor 없음)
  console.log('👤 일반 유저 10명 생성 중...');
  for (let i = 1; i <= 10; i++) {
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ 생성 실패: ${email}`, message);
    }
  }
  console.log('  ✅ 일반 유저 10명 생성 완료\n');

  // 가입 대기 유저 10명 생성 (PENDING, Instructor 없음)
  console.log('⏳ 가입 대기 유저 10명 생성 중...');
  for (let i = 1; i <= 10; i++) {
    const name = generateKoreanName();
    const email = `pending${String(i).padStart(3, '0')}@test.com`;
    const phone = generatePhoneNumber();

    try {
      await prisma.user.create({
        data: {
          userEmail: email,
          password: password,
          name: name,
          userphoneNumber: phone,
          status: 'PENDING',
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ 생성 실패: ${email}`, message);
    }
  }
  console.log('  ✅ 가입 대기 유저 10명 생성 완료\n');

  console.log('='.repeat(50));
  console.log('📊 유저 생성 결과');
  console.log('='.repeat(50));
  console.log(`강사: ${instructorIndex}명`);
  console.log('  - 주강사(Main): 30명');
  console.log('  - 부강사(Co): 25명');
  console.log('  - 보조강사(Assistant): 15명');
  console.log('  - 실습강(Practicum): 10명');
  console.log('일반 유저: 10명 (APPROVED)');
  console.log('가입 대기: 10명 (PENDING)');
  console.log('='.repeat(50));
  console.log('🔐 테스트 비밀번호: test1234\n');
}

// 직접 실행 시
if (require.main === module) {
  runSeedUsers()
    .catch((e) => {
      console.error('❌ 생성 실패:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
