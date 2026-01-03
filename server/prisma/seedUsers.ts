// server/prisma/seedUsers.ts
// 유저 테스트 데이터 시딩 스크립트 (연관 데이터 포함)
// 실행: npx tsx prisma/seedUsers.ts

/* eslint-disable no-console */
import { PrismaClient, UserStatus, UserCategory } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

// 한국 이름 생성용 데이터
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
];

// 한국 지역 데이터
const LOCATIONS = [
  { address: '서울특별시 강남구 테헤란로 123', lat: 37.5012, lng: 127.0396 },
  { address: '서울특별시 서초구 서초대로 456', lat: 37.4837, lng: 127.0324 },
  { address: '서울특별시 송파구 올림픽로 789', lat: 37.5145, lng: 127.1059 },
  { address: '경기도 성남시 분당구 판교로 111', lat: 37.3947, lng: 127.1112 },
  { address: '경기도 수원시 영통구 광교로 222', lat: 37.2912, lng: 127.0478 },
  { address: '인천광역시 연수구 컨벤시아대로 333', lat: 37.3894, lng: 126.6413 },
  { address: '대전광역시 유성구 대학로 444', lat: 36.3623, lng: 127.3561 },
  { address: '부산광역시 해운대구 해운대로 555', lat: 35.1631, lng: 129.1637 },
  { address: '대구광역시 수성구 동대구로 666', lat: 35.8588, lng: 128.6321 },
  { address: '광주광역시 북구 용봉로 777', lat: 35.1756, lng: 126.9121 },
  { address: '울산광역시 남구 삼산로 888', lat: 35.5372, lng: 129.3113 },
  { address: '경기도 고양시 일산동구 중앙로 999', lat: 37.6584, lng: 126.7693 },
  { address: '경기도 용인시 기흥구 구갈로 1010', lat: 37.2754, lng: 127.1155 },
  { address: '충청남도 천안시 서북구 불당로 1111', lat: 36.8151, lng: 127.1139 },
  { address: '전라북도 전주시 완산구 홍산로 1212', lat: 35.8242, lng: 127.1489 },
];

const RESTRICTED_AREAS = [
  null,
  '강원도',
  '제주도',
  '경상북도 울릉군',
  '전라남도 신안군',
  null,
  '강원도 고성군',
  null,
  '경기도 파주시 (DMZ)',
  null,
];

const CATEGORIES: UserCategory[] = ['Main', 'Co', 'Assistant', 'Practicum'];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateKoreanName(isMale: boolean): string {
  const lastName = getRandomElement(LAST_NAMES);
  const firstName = getRandomElement(isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE);
  return `${lastName}${firstName}`;
}

function generatePhoneNumber(): string {
  const middle = Math.floor(1000 + Math.random() * 9000);
  const last = Math.floor(1000 + Math.random() * 9000);
  return `010-${middle}-${last}`;
}

// 근무 가능일 생성 (앞으로 30일 중 랜덤하게 선택)
function generateAvailableDates(count: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 60; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }

  return getRandomElements(dates, count);
}

async function main() {
  console.log('🚀 유저 테스트 데이터 시딩 시작...\n');

  const password = await bcrypt.hash('test1234', 10);

  // 팀 데이터 확인/생성
  const teams = await prisma.team.findMany();
  if (teams.length === 0) {
    console.log('팀 데이터가 없습니다. 기본 시드를 먼저 실행해주세요.');
    console.log('npm run seed');
    return;
  }
  console.log(`📋 기존 팀 ${teams.length}개 확인됨`);

  // 덕목 데이터 확인
  const virtues = await prisma.virtue.findMany();
  if (virtues.length === 0) {
    console.log('덕목 데이터가 없습니다. 기본 시드를 먼저 실행해주세요.');
    console.log('npm run seed');
    return;
  }
  console.log(`📋 기존 덕목 ${virtues.length}개 확인됨\n`);

  // 기존 테스트 유저 삭제
  console.log('🗑️ 기존 테스트 유저 삭제 중...');
  const existingTestUsers = await prisma.user.findMany({
    where: {
      OR: [{ userEmail: { startsWith: 'instructor' } }, { userEmail: { startsWith: 'user' } }],
    },
  });

  for (const user of existingTestUsers) {
    await prisma.instructorVirtue.deleteMany({ where: { instructorId: user.id } }).catch(() => {});
    await prisma.instructorAvailability
      .deleteMany({ where: { instructorId: user.id } })
      .catch(() => {});
    await prisma.instructorStats.deleteMany({ where: { instructorId: user.id } }).catch(() => {});
    await prisma.instructorUnitDistance.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.instructor.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  }
  console.log(`✅ 기존 테스트 유저 ${existingTestUsers.length}명 삭제 완료\n`);

  // ============================================
  // 1. 강사 유저 80명 생성
  // ============================================
  console.log('👨‍🏫 강사 유저 생성 중...');

  let instructorCount = 0;

  for (let i = 1; i <= 80; i++) {
    const isMale = Math.random() > 0.4; // 60% 남성
    const name = generateKoreanName(isMale);
    const email = `instructor${i.toString().padStart(3, '0')}@test.com`;
    const phone = generatePhoneNumber();
    const location = getRandomElement(LOCATIONS);

    // 상태 결정: 처음 10명은 승인 대기
    const status: UserStatus = i <= 10 ? 'PENDING' : 'APPROVED';

    // 승인된 강사 중 절반만 관리자 필드 채움
    // - 1~10: PENDING (관리자 필드 없음)
    // - 11~45: APPROVED, 관리자 필드 없음 (35명)
    // - 46~80: APPROVED, 관리자 필드 있음 (35명)
    const hasAdminManagedFields = i > 45;

    try {
      // 유저 생성
      const user = await prisma.user.create({
        data: {
          userEmail: email,
          password: password,
          name: name,
          userphoneNumber: phone,
          status: status,
          instructor: {
            create: {
              // 회원가입 시 입력하는 필드 (항상 있음)
              location: location.address,
              lat: location.lat,
              lng: location.lng,
              profileCompleted: hasAdminManagedFields,

              // 관리자 직접 관리 필드 (hasAdminManagedFields인 경우만)
              ...(hasAdminManagedFields && {
                category: getRandomElement(CATEGORIES),
                teamId: getRandomElement(teams).id,
                isTeamLeader: Math.random() > 0.85, // 15% 팀장
                generation: Math.floor(1 + Math.random() * 15), // 1~15기
                restrictedArea: getRandomElement(RESTRICTED_AREAS),
              }),
            },
          },
        },
      });

      // 프로필 완료된 강사에게만 연관 데이터 추가
      if (hasAdminManagedFields) {
        // 덕목 추가 (2~5개 랜덤)
        const selectedVirtues = getRandomElements(virtues, Math.floor(2 + Math.random() * 4));
        for (const virtue of selectedVirtues) {
          await prisma.instructorVirtue
            .create({
              data: {
                instructorId: user.id,
                virtueId: virtue.id,
              },
            })
            .catch(() => {}); // 중복 무시
        }

        // 근무 가능일 추가 (5~15개 랜덤)
        const availableDates = generateAvailableDates(Math.floor(5 + Math.random() * 11));
        for (const date of availableDates) {
          await prisma.instructorAvailability
            .create({
              data: {
                instructorId: user.id,
                availableOn: date,
              },
            })
            .catch(() => {}); // 중복 무시
        }

        // 강사 통계 추가
        await prisma.instructorStats
          .create({
            data: {
              instructorId: user.id,
              legacyPracticumCount: Math.floor(Math.random() * 50),
              autoPromotionEnabled: Math.random() > 0.2,
            },
          })
          .catch(() => {});
      }

      instructorCount++;

      const statusLabel = status === 'PENDING' ? '⏳대기' : '✅승인';
      const fieldsLabel = hasAdminManagedFields ? '📝완료' : '📋미완료';
      console.log(`  ${statusLabel} ${fieldsLabel} ${name} (${email})`);
    } catch (error) {
      console.error(`  ❌ 실패: ${email}`, error);
    }
  }
  console.log(`\n✅ 강사 ${instructorCount}명 생성 완료\n`);

  // ============================================
  // 2. 일반 유저 20명 생성
  // ============================================
  console.log('👤 일반 유저 생성 중...');

  let normalCount = 0;

  for (let i = 1; i <= 20; i++) {
    const isMale = Math.random() > 0.5;
    const name = generateKoreanName(isMale);
    const email = `user${i.toString().padStart(3, '0')}@test.com`;
    const phone = generatePhoneNumber();

    // 처음 5명은 승인 대기
    const status: UserStatus = i <= 5 ? 'PENDING' : 'APPROVED';

    try {
      await prisma.user.create({
        data: {
          userEmail: email,
          password: password,
          name: name,
          userphoneNumber: phone,
          status: status,
          // 일반 유저는 instructor 정보 없음
        },
      });

      normalCount++;

      const statusLabel = status === 'PENDING' ? '⏳대기' : '✅승인';
      console.log(`  ${statusLabel} ${name} (${email})`);
    } catch (error) {
      console.error(`  ❌ 실패: ${email}`, error);
    }
  }
  console.log(`\n✅ 일반 유저 ${normalCount}명 생성 완료\n`);

  // ============================================
  // 3. 요약
  // ============================================
  console.log('='.repeat(50));
  console.log('📊 시딩 결과 요약');
  console.log('='.repeat(50));
  console.log(`강사 유저: ${instructorCount}명`);
  console.log(`  - 승인 대기: 10명 (instructor001~010)`);
  console.log(`  - 승인됨 (관리자 필드 미완료): 35명 (instructor011~045)`);
  console.log(`  - 승인됨 (관리자 필드 완료): 35명 (instructor046~080)`);
  console.log(`    ↳ 덕목, 근무가능일, 통계 데이터 포함`);
  console.log(`일반 유저: ${normalCount}명`);
  console.log(`  - 승인 대기: 5명 (user001~005)`);
  console.log(`  - 승인됨: 15명 (user006~020)`);
  console.log('='.repeat(50));
  console.log('\n🔐 테스트 계정 비밀번호: test1234');
  console.log('📧 강사 이메일 형식: instructor001@test.com ~ instructor080@test.com');
  console.log('📧 일반 이메일 형식: user001@test.com ~ user020@test.com');
}

main()
  .catch((e) => {
    console.error('❌ 시딩 중 에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
/* eslint-enable no-console */
