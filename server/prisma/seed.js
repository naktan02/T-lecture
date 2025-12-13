// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  // 1. 슈퍼 관리자 생성 로직
  if (email && password) {
      // 1-1) 이미 슈퍼 관리자가 있는지 확인
      const existing = await prisma.admin.findFirst({
        where: { level: 'SUPER' },
        include: { user: true },
      });

      if (existing) {
        console.log(`⚠️ 이미 슈퍼 관리자(${existing.user.userEmail})가 존재합니다.`);
      } else {
        // 1-2) 동일 이메일 유저 확인
        const existingUser = await prisma.user.findUnique({
          where: { userEmail: email },
        });

        let user;
        if (existingUser) {
          console.log('⚠️ 동일 이메일 유저가 이미 있으므로 해당 계정을 SUPER ADMIN으로 승격합니다.');
          user = existingUser;
        } else {
          // 1-3) 유저 생성
          const hashed = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: {
              userEmail: email,
              password: hashed,
              name: '슈퍼관리자',
              userphoneNumber: '000-0000-0000',
              status: 'APPROVED',
            },
          });
        }

        // 1-4) admin 테이블에 SUPER 레코드 생성
        await prisma.admin.upsert({
          where: { userId: user.id },
          update: { level: 'SUPER' },
          create: {
            userId: user.id,
            level: 'SUPER',
          },
        });
        console.log(`✅ SUPER ADMIN 생성 완료: ${email}`);
      }
  } else {
      console.log('ℹ️ .env에 SUPER_ADMIN 정보가 없어 관리자 생성을 건너뜁니다.');
  }

  // 2. 메시지 템플릿 시딩 (main 함수 안으로 이동)
  console.log('🌱 메시지 템플릿 생성 중...');
  await prisma.messageTemplate.createMany({
    data: [
      {
        key: 'TEMPORARY',
        title: '임시 배정 알림',
        body: `[임시 배정 알림]
{{userName}} 강사님, 교육 일정이 임시 배정되었습니다.

- 부대명: {{unitName}}
- 지역: {{region}}
- 교육일정:
{{scheduleText}}

* 하단의 버튼을 통해 [수락] 또는 [거절]을 선택해주세요.`
      },
      {
        key: 'CONFIRMED_LEADER',
        title: '확정 배정 알림 (책임강사)',
        body: `[확정 배정 알림]
{{userName}} 강사님, 배정이 확정되었습니다.

- 부대: {{unitName}}
- 주소: {{address}}

[동료 강사]
{{colleagues}}

[교육장소 정보]
{{locations}}

책임 강사로서 인솔 부탁드립니다.`
      },
      {
        key: 'CONFIRMED_MEMBER',
        title: '확정 배정 알림 (일반강사)',
        body: `[확정 배정 알림]
{{userName}} 강사님, 배정이 확정되었습니다.

- 부대: {{unitName}}
- 주소: {{address}}

교육 장소로 늦지 않게 도착 부탁드립니다.`
      },
    ],
    skipDuplicates: true, // 이미 키가 있으면 건너뜀
  });
  console.log('✅ 메시지 템플릿 생성 완료');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });