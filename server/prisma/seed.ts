// server/prisma/seed.ts
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import logger from '../src/config/logger';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const generalEmail = process.env.GENERAL_ADMIN_EMAIL;
  const generalPassword = process.env.GENERAL_ADMIN_PASSWORD;

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

  // 1-2. 일반 관리자 생성 로직
  if (generalEmail && generalPassword) {
    const existing = await prisma.admin.findFirst({
      where: { level: 'GENERAL', user: { userEmail: generalEmail } },
      include: { user: true },
    });

    if (existing) {
      logger.warn(`이미 일반 관리자(${existing.user.userEmail})가 존재합니다.`);
    } else {
      const existingUser = await prisma.user.findUnique({
        where: { userEmail: generalEmail },
      });

      let user;
      if (existingUser) {
        logger.warn('동일 이메일 유저가 이미 있으므로 해당 계정을 GENERAL ADMIN으로 설정합니다.');
        user = existingUser;
      } else {
        const hashed = await bcrypt.hash(generalPassword, 10);
        user = await prisma.user.create({
          data: {
            userEmail: generalEmail,
            password: hashed,
            name: '일반관리자',
            userphoneNumber: '000-0000-0000',
            status: 'APPROVED',
          },
        });
      }

      await prisma.admin.upsert({
        where: { userId: user.id },
        update: { level: 'GENERAL' },
        create: {
          userId: user.id,
          level: 'GENERAL',
        },
      });
      logger.info(`GENERAL ADMIN 생성 완료: ${generalEmail}`);
    }
  } else {
    logger.info('.env에 GENERAL_ADMIN 정보가 없어 일반 관리자 생성을 건너뜁니다.');
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

  // 4. 메시지 템플릿 시딩 (JSONB body + formatPresets)
  logger.info('메시지 템플릿 생성 중...');

  // 임시 배정 메시지 템플릿
  const temporaryBody = {
    tokens: [
      {
        key: 'instructors',
        type: 'format',
        format: '{index}. {name}({category}) / {phone} / {virtues}',
      },
      { text: '[임시 배정 알림]', type: 'text' },
      { type: 'newline' },
      { key: 'self.name', type: 'var' },
      { text: ' 강사님, 교육 일정이 임시 배정되었습니다.', type: 'text' },
      { type: 'newline' },
      { text: '- 부대명: ', type: 'text' },
      { key: 'unit.name', type: 'var' },
      { type: 'newline' },
      { text: '- 광역: ', type: 'text' },
      { key: 'unit.wideArea', type: 'var' },
      { type: 'newline' },
      { text: '- 지역: ', type: 'text' },
      { key: 'unit.region', type: 'var' },
      { type: 'newline' },
      { type: 'newline' },
      { text: '- 교육일정:', type: 'text' },
      { type: 'newline' },
      { key: 'self.mySchedules', type: 'format', format: '- {date} ({dayOfWeek}) : {name}' },
      { type: 'newline' },
      { type: 'newline' },
      { text: '* 하단의 버튼을 통해 [수락] 또는 [거절]을 선택해주세요.', type: 'text' },
    ],
  };

  const temporaryPresets = {
    locations:
      '장소명: {placeName} 참여인원: {actualCount}\n강사휴게실: {hasInstructorLounge}, 여자화장실: {hasWomenRestroom}, 휴대폰불출: {allowsPhoneBeforeAfter}\n특이사항: {note}\n-------------------------------------------------------',
    instructors: '{index}. {name}({category}) / {phone} / {virtues}',
    'self.schedules': '- {date} ({dayOfWeek}) : {instructors}',
    'self.mySchedules': '- {date} ({dayOfWeek}) : {name}',
  };

  // 확정 배정 메시지 - 팀원용
  const confirmedMemberBody = {
    tokens: [
      { text: '[확정 배정 알림]', type: 'text' },
      { type: 'newline' },
      { key: 'self.name', type: 'var' },
      { text: ' 강사님, 배정이 확정되었습니다.', type: 'text' },
      { type: 'newline' },
      { text: '- 부대: ', type: 'text' },
      { key: 'unit.name', type: 'var' },
      { type: 'newline' },
      { text: '- 광역: ', type: 'text' },
      { key: 'unit.wideArea', type: 'var' },
      { type: 'newline' },
      { text: '- 지역: ', type: 'text' },
      { key: 'unit.region', type: 'var' },
      { type: 'newline' },
      { text: '- 주소: ', type: 'text' },
      { key: 'unit.addressDetail', type: 'var' },
      { type: 'newline' },
      { text: '- 상세주소: ', type: 'text' },
      { key: 'unit.detailAddress', type: 'var' },
      { type: 'newline' },
      { type: 'newline' },
      { text: '강의 일정:', type: 'text' },
      { type: 'newline' },
      { key: 'self.schedules', type: 'format', format: '- {date} ({dayOfWeek}) : {instructors}' },
    ],
  };

  const confirmedMemberPresets = {
    locations:
      '장소명: {placeName} 참여인원: {actualCount}\n강사휴게실: {hasInstructorLounge}, 여자화장실: {hasWomenRestroom}, 휴대폰불출: {allowsPhoneBeforeAfter}\n특이사항: {note}\n-------------------------------------------------------',
    instructors: '{index}. {name}({category}) / {phone}',
    'self.schedules': '- {date} ({dayOfWeek}) : {instructors}',
    'self.mySchedules': '- {date} ({dayOfWeek}) : {name}',
  };

  // 확정 배정 메시지 - 팀장용
  const confirmedLeaderBody = {
    tokens: [
      { text: '[확정 배정 알림]', type: 'text' },
      { type: 'newline' },
      { key: 'self.name', type: 'var' },
      { text: ' 강사님, 배정이 확정되었습니다.', type: 'text' },
      { type: 'newline' },
      { text: '- 부대: ', type: 'text' },
      { key: 'unit.name', type: 'var' },
      { type: 'newline' },
      { text: '- 지역: ', type: 'text' },
      { key: 'unit.region', type: 'var' },
      { type: 'newline' },
      { text: '- 광역: ', type: 'text' },
      { key: 'unit.wideArea', type: 'var' },
      { type: 'newline' },
      { text: '- 주소: ', type: 'text' },
      { key: 'unit.addressDetail', type: 'var' },
      { type: 'newline' },
      { text: '- 상세주소: ', type: 'text' },
      { key: 'unit.detailAddress', type: 'var' },
      { type: 'newline' },
      { text: '- 교육일정: ', type: 'text' },
      { key: 'unit.startDate', type: 'var' },
      { text: ' ~ ', type: 'text' },
      { key: 'unit.endDate', type: 'var' },
      { type: 'newline' },
      { text: '- 교육 시간: ', type: 'text' },
      { key: 'unit.startTime', type: 'var' },
      { text: ' ~ ', type: 'text' },
      { key: 'unit.endTime', type: 'var' },
      { type: 'newline' },
      { text: '- 교육불가일: ', type: 'text' },
      { key: 'unit.excludedDates', type: 'var' },
      { type: 'newline' },
      { type: 'newline' },
      { text: '- 교육장소', type: 'text' },
      { type: 'newline' },
      {
        key: 'locations',
        type: 'format',
        format:
          '장소명: {placeName} 참여인원: {actualCount}\n강사휴게실: {hasInstructorLounge}, 여자화장실: {hasWomenRestroom}, 휴대폰불출: {allowsPhoneBeforeAfter}\n특이사항: {note}\n-------------------------------------------------------',
      },
      { type: 'newline' },
      { type: 'newline' },
      { text: '[배정 강사]', type: 'text' },
      { type: 'newline' },
      { key: 'self.schedules', type: 'format', format: '- {date} ({dayOfWeek}) : {instructors}' },
      { type: 'newline' },
      { type: 'newline' },
      { text: '부대 담당자: ', type: 'text' },
      { key: 'unit.officerName', type: 'var' },
      { text: ' / ', type: 'text' },
      { key: 'unit.officerPhone', type: 'var' },
      { type: 'newline' },
      { text: '수탁급식여부: ', type: 'text' },
      { key: 'location.hasCateredMeals', type: 'var' },
      { type: 'newline' },
      { text: '회관숙박여부: ', type: 'text' },
      { key: 'location.hasHallLodging', type: 'var' },
      { type: 'newline' },
      { text: '----------------------------------------------------------------', type: 'text' },
      { type: 'newline' },
      {
        key: 'instructors',
        type: 'format',
        format: '{index}. {name}({category}) / {phone} / {virtues}',
      },
    ],
  };

  const confirmedLeaderPresets = {
    locations:
      '장소명: {placeName} 참여인원: {actualCount}\n강사휴게실: {hasInstructorLounge}, 여자화장실: {hasWomenRestroom}, 휴대폰불출: {allowsPhoneBeforeAfter}\n특이사항: {note}\n-------------------------------------------------------',
    instructors: '{index}. {name}({category}) / {phone} / {virtues}',
    'self.schedules': '- {date} ({dayOfWeek}) : {instructors}',
    'self.mySchedules': '- {date} ({dayOfWeek}) : {name}',
  };

  await prisma.messageTemplate.upsert({
    where: { key: 'TEMPORARY' },
    update: {
      title: '{{unit.name}} : {{unit.startDate}} ~ {{unit.endDate}}',
      body: temporaryBody as Prisma.InputJsonValue,
      formatPresets: temporaryPresets,
    },
    create: {
      key: 'TEMPORARY',
      title: '{{unit.name}} : {{unit.startDate}} ~ {{unit.endDate}}',
      body: temporaryBody as Prisma.InputJsonValue,
      formatPresets: temporaryPresets,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { key: 'CONFIRMED_MEMBER' },
    update: {
      title: '{{unit.name}} : {{unit.startDate}} ~ {{unit.endDate}}',
      body: confirmedMemberBody as Prisma.InputJsonValue,
      formatPresets: confirmedMemberPresets,
    },
    create: {
      key: 'CONFIRMED_MEMBER',
      title: '{{unit.name}} : {{unit.startDate}} ~ {{unit.endDate}}',
      body: confirmedMemberBody as Prisma.InputJsonValue,
      formatPresets: confirmedMemberPresets,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { key: 'CONFIRMED_LEADER' },
    update: {
      title: '{{unit.name}} : {{unit.startDate}} ~ {{unit.endDate}}',
      body: confirmedLeaderBody as Prisma.InputJsonValue,
      formatPresets: confirmedLeaderPresets,
    },
    create: {
      key: 'CONFIRMED_LEADER',
      title: '{{unit.name}} : {{unit.startDate}} ~ {{unit.endDate}}',
      body: confirmedLeaderBody as Prisma.InputJsonValue,
      formatPresets: confirmedLeaderPresets,
    },
  });

  logger.info('메시지 템플릿 생성 완료');

  logger.info('');
  logger.info('기본 시드 데이터 생성 완료!');
  logger.info('');
  logger.info('추가 시드 스크립트:');
  logger.info('  - 유저 테스트 데이터: npx tsx prisma/seedUsers.ts');
  logger.info('  - 공지사항 테스트 데이터: npx tsx prisma/seedNotices.ts');
}

main()
  .catch((e) => {
    logger.error(`Seed 실행 중 에러: ${e.message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
