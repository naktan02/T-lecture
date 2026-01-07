// server/prisma/seedTestInstructors.ts
// 테스트용 강사 더미 데이터 생성 (승인 대기 상태)

import 'dotenv/config';
import prisma from '../src/libs/prisma.js';
import bcrypt from 'bcrypt';

// 실제 한국 주소 목록
const KOREAN_ADDRESSES = [
  '서울특별시 강남구 테헤란로 212',
  '서울특별시 서초구 반포대로 58',
  '서울특별시 마포구 월드컵북로 396',
  '경기도 성남시 분당구 판교역로 166',
  '경기도 수원시 영통구 삼성로 129',
  '인천광역시 연수구 인천타워대로 323',
  '부산광역시 해운대구 센텀남대로 35',
  '대구광역시 달서구 달구벌대로 1400',
  '대전광역시 유성구 대학로 291',
  '광주광역시 서구 상무중앙로 110',
];

async function main() {
  console.log('🧪 테스트 강사 데이터 생성 시작...\n');

  // 기존 덕목 조회
  const virtues = await prisma.virtue.findMany();
  if (virtues.length === 0) {
    console.error('❌ 덕목이 없습니다. 먼저 seed를 실행해주세요.');
    return;
  }

  const hashedPassword = await bcrypt.hash('test1234!', 10);

  // 10명의 테스트 강사 생성 (승인 대기 상태)
  for (let i = 0; i < 10; i++) {
    const email = `test_instructor_${i + 1}@test.com`;

    // 이미 존재하면 스킵
    const existing = await prisma.user.findUnique({ where: { userEmail: email } });
    if (existing) {
      console.log(`  ⏭️ ${email} - 이미 존재함, 스킵`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        userEmail: email,
        password: hashedPassword,
        name: `테스트강사${i + 1}`,
        userphoneNumber: `010-1234-56${String(i).padStart(2, '0')}`,
        status: 'PENDING', // 승인 대기 상태
        instructor: {
          create: {
            location: KOREAN_ADDRESSES[i],
            category: ['Main', 'Co', 'Assistant', 'Practicum'][i % 4] as any,
            lat: null, // 좌표 변환 테스트를 위해 null
            lng: null,
            profileCompleted: true,
          },
        },
      },
    });

    // 랜덤 덕목 연결 (1~3개)
    const randomVirtueCount = Math.floor(Math.random() * 3) + 1;
    const shuffledVirtues = virtues.sort(() => Math.random() - 0.5);
    const selectedVirtues = shuffledVirtues.slice(0, randomVirtueCount);

    await prisma.instructorVirtue.createMany({
      data: selectedVirtues.map((v) => ({
        instructorId: user.id,
        virtueId: v.id,
      })),
    });

    console.log(`  ✅ ${email} 생성 (주소: ${KOREAN_ADDRESSES[i]})`);
  }

  console.log('\n✅ 테스트 데이터 생성 완료!');
  console.log('📋 관리자 페이지에서 일괄 승인 테스트 가능');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
