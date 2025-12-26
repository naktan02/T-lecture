// server/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import logger from '../src/config/logger'; // tsx가 자동으로 .ts를 찾아줍니다.

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  // 1. 슈퍼 관리자 생성 로직
  if (email && password) {
    const existing = await prisma.admin.findFirst({
      where: { level: 'SUPER' },
      include: { user: true },
    });

    if (existing) {
      logger.warn(`이미 슈퍼 관리자(${existing.user.userEmail})가 존재합니다.`);
    } else {
      const existingUser = await prisma.user.findUnique({
        where: { userEmail: email },
      });

      let user;
      if (existingUser) {
        logger.warn('동일 이메일 유저가 이미 있으므로 해당 계정을 SUPER ADMIN으로 승격합니다.');
        user = existingUser;
      } else {
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

      await prisma.admin.upsert({
        where: { userId: user.id },
        update: { level: 'SUPER' },
        create: {
          userId: user.id,
          level: 'SUPER',
        },
      });
      logger.info(`SUPER ADMIN 생성 완료: ${email}`);
    }
  } else {
    logger.info('.env에 SUPER_ADMIN 정보가 없어 관리자 생성을 건너뜁니다.');
  }

  // 2. 소속팀(Team) 시딩 - 실제 운영 구조 기반
  logger.info('소속팀 데이터 생성 중...');
  const teams = [
    { id: 1, name: '서울 1팀' },
    { id: 2, name: '서울 2팀' },
    { id: 3, name: '경기 북부팀' },
    { id: 4, name: '경기 남부팀' },
    { id: 5, name: '인천팀' },
    { id: 6, name: '강원팀' },
    { id: 7, name: '충청팀' },
    { id: 8, name: '전라팀' },
    { id: 9, name: '경상팀' },
    { id: 10, name: '제주팀' },
  ];
  for (const team of teams) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: { name: team.name },
      create: { id: team.id, name: team.name },
    });
  }
  logger.info(`소속팀 ${teams.length}개 생성 완료`);

  // 3. 덕목(Virtue) 시딩 - 인성교육 8대 덕목
  logger.info('덕목(강의 가능 과목) 데이터 생성 중...');
  const virtues = [
    { id: 1, name: '예' },
    { id: 2, name: '효' },
    { id: 3, name: '정직' },
    { id: 4, name: '책임' },
    { id: 5, name: '존중' },
    { id: 6, name: '배려' },
    { id: 7, name: '소통' },
    { id: 8, name: '협동' },
  ];
  for (const virtue of virtues) {
    await prisma.virtue.upsert({
      where: { id: virtue.id },
      update: { name: virtue.name },
      create: { id: virtue.id, name: virtue.name },
    });
  }
  logger.info(`덕목 ${virtues.length}개 생성 완료`);

  // 4. 메시지 템플릿 시딩
  logger.info('메시지 템플릿 생성 중...');
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

* 하단의 버튼을 통해 [수락] 또는 [거절]을 선택해주세요.`,
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

책임 강사로서 인솔 부탁드립니다.`,
      },
      {
        key: 'CONFIRMED_MEMBER',
        title: '확정 배정 알림 (일반강사)',
        body: `[확정 배정 알림]
{{userName}} 강사님, 배정이 확정되었습니다.

- 부대: {{unitName}}
- 주소: {{address}}

교육 장소로 늦지 않게 도착 부탁드립니다.`,
      },
    ],
    skipDuplicates: true,
  });
  logger.info('메시지 템플릿 생성 완료');
}

main()
  .catch((e) => {
    logger.error(`Seed 실행 중 에러: ${e.message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
