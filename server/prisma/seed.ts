// server/prisma/seed.ts
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import logger from '../src/config/logger';
import { parseTemplateToTokens } from '../src/types/template.types';

const prisma = new PrismaClient();

// 템플릿 문자열을 Token[] 형태로 변환하는 헬퍼
function createTemplateBody(templateStr: string): Prisma.InputJsonValue {
  return { tokens: parseTemplateToTokens(templateStr) } as Prisma.InputJsonValue;
}

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

  // 2. 소속팀(Team) 시딩
  logger.info('소속팀 데이터 생성 중...');
  const teams = ['1팀', '2팀', '3팀', '4팀', '5팀'];
  for (const teamName of teams) {
    await prisma.team.upsert({
      where: { id: teams.indexOf(teamName) + 1 },
      update: { name: teamName },
      create: { name: teamName },
    });
  }
  logger.info(`소속팀 ${teams.length}개 생성 완료`);

  // 3. 덕목(Virtue) 시딩 - 강의 가능 과목
  logger.info('덕목(강의 가능 과목) 데이터 생성 중...');
  const virtues = ['예', '효', '정직', '책임', '존중', '배려', '소통', '협동'];
  for (const virtueName of virtues) {
    await prisma.virtue.upsert({
      where: { id: virtues.indexOf(virtueName) + 1 },
      update: { name: virtueName },
      create: { name: virtueName },
    });
  }
  logger.info(`덕목 ${virtues.length}개 생성 완료`);

  // 4. 메시지 템플릿 시딩 (JSONB body + formatPresets)
  logger.info('메시지 템플릿 생성 중...');

  // 임시 배정 메시지 템플릿
  const temporaryTemplate = `[임시 배정 알림]
{{self.name}} 강사님, 교육 일정이 임시 배정되었습니다.

- 부대명: {{unit.name}}
- 지역: {{unit.region}}
- 교육일정:{{self.schedules:format=- {date} ({dayOfWeek})}}

* 하단의 버튼을 통해 [수락] 또는 [거절]을 선택해주세요.`;

  // 확정 배정 메시지 - 팀장용
  const confirmedLeaderTemplate = `[확정 배정 알림]
{{self.name}} 강사님, 배정이 확정되었습니다.

- 부대: {{unit.name}}
- 지역: {{unit.region}}
- 주소: {{unit.addressDetail}}
- 교육일정: {{unit.startDate}} ~ {{unit.endDate}}
- 교육 시간: {{unit.startTime}} ~ {{unit.endTime}}
- 교육장소
{{locations:format=장소명: {placeName} 참여인원: {actualCount}
강사휴게실: {hasInstructorLounge}, 여자화장실: {hasWomenRestroom}, 휴대폰불출: {allowsPhoneBeforeAfter}
특이사항: {note}
-------------------------------------------------------}}

[배정 강사]
{{self.schedules:format=- {date} ({dayOfWeek})}}

부대 담당자: {{unit.officerName}} / {{unit.officerPhone}}
수탁급식여부: {{location.hasCateredMeals}}
회관숙박여부: {{location.hasHallLodging}}

{{instructors:format={index}. {name}({category}) / {phone}}}`;

  // 확정 배정 메시지 - 팀원용
  const confirmedMemberTemplate = `[확정 배정 알림]
{{self.name}} 강사님, 배정이 확정되었습니다.

- 부대: {{unit.name}}
- 광역: {{unit.wideArea}}
- 주소: {{unit.addressDetail}}
강의 일정:
{{self.schedules:format=- {date} ({dayOfWeek})}}`;

  // 포맷 프리셋 (템플릿마다 다를 수 있음)
  const defaultFormatPresets = {
    'self.schedules': '- {date} ({dayOfWeek})',
    instructors: '{index}. {name}({category}) / {phone}',
    locations: '장소명: {placeName} 참여인원: {actualCount}',
  };

  await prisma.messageTemplate.upsert({
    where: { key: 'TEMPORARY' },
    update: {
      title: '임시 배정 알림',
      body: createTemplateBody(temporaryTemplate),
      formatPresets: defaultFormatPresets,
    },
    create: {
      key: 'TEMPORARY',
      title: '임시 배정 알림',
      body: createTemplateBody(temporaryTemplate),
      formatPresets: defaultFormatPresets,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { key: 'CONFIRMED_LEADER' },
    update: {
      title: '확정 배정 알림 (책임강사)',
      body: createTemplateBody(confirmedLeaderTemplate),
      formatPresets: defaultFormatPresets,
    },
    create: {
      key: 'CONFIRMED_LEADER',
      title: '확정 배정 알림 (책임강사)',
      body: createTemplateBody(confirmedLeaderTemplate),
      formatPresets: defaultFormatPresets,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { key: 'CONFIRMED_MEMBER' },
    update: {
      title: '확정 배정 알림 (일반강사)',
      body: createTemplateBody(confirmedMemberTemplate),
      formatPresets: defaultFormatPresets,
    },
    create: {
      key: 'CONFIRMED_MEMBER',
      title: '확정 배정 알림 (일반강사)',
      body: createTemplateBody(confirmedMemberTemplate),
      formatPresets: defaultFormatPresets,
    },
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
