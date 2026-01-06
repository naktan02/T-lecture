// server/prisma/seedCore.ts
// 핵심 메타데이터 생성 - 팀, 덕목, 관리자, 메시지 템플릿
// 실행: npx tsx prisma/seedCore.ts

/* eslint-disable no-console */

import 'dotenv/config';
import { Prisma } from '../src/generated/prisma/client.js';
import prisma from '../src/libs/prisma.js';
import bcrypt from 'bcrypt';

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

export async function runSeedCore() {
  console.log('🌱 핵심 메타데이터 생성 시작...\n');

  // 1. 팀 생성
  console.log('👥 팀 생성 중...');
  for (const team of TEAMS) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: { name: team.name, deletedAt: null },
      create: { id: team.id, name: team.name },
    });
  }
  console.log(`  ✅ 팀 ${TEAMS.length}개 생성 완료`);

  // 2. 덕목 생성
  console.log('📚 덕목 생성 중...');
  for (const virtue of VIRTUES) {
    await prisma.virtue.upsert({
      where: { id: virtue.id },
      update: { name: virtue.name },
      create: { id: virtue.id, name: virtue.name },
    });
  }
  console.log(`  ✅ 덕목 ${VIRTUES.length}개 생성 완료`);

  // 3. 관리자 생성
  console.log('👤 관리자 생성 중...');

  const superEmail = process.env.SUPER_ADMIN_EMAIL;
  const superPassword = process.env.SUPER_ADMIN_PASSWORD;
  const generalEmail = process.env.GENERAL_ADMIN_EMAIL;
  const generalPassword = process.env.GENERAL_ADMIN_PASSWORD;

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

  if (generalEmail && generalPassword) {
    const hashedPassword = await bcrypt.hash(generalPassword, 10);
    const existingUser = await prisma.user.findUnique({ where: { userEmail: generalEmail } });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          userEmail: generalEmail,
          password: hashedPassword,
          name: '일반관리자',
          userphoneNumber: '010-0000-0002',
          status: 'APPROVED',
          admin: { create: { level: 'GENERAL' } },
        },
      });
      console.log(`  ✅ 일반관리자 생성: ${generalEmail}`);
    } else {
      console.log(`  ⚠️ 일반관리자 이미 존재: ${generalEmail}`);
    }
  }

  // 4. 시스템 설정 생성
  console.log('⚙️ 시스템 설정 생성 중...');
  const SYSTEM_CONFIGS = [
    { key: 'ASSIGNMENT_DISTANCE_WEIGHT', value: '0.3', description: '배정 알고리즘 - 거리 가중치' },
    {
      key: 'ASSIGNMENT_AVAILABILITY_WEIGHT',
      value: '0.4',
      description: '배정 알고리즘 - 가용일 가중치',
    },
    {
      key: 'ASSIGNMENT_WORKLOAD_WEIGHT',
      value: '0.3',
      description: '배정 알고리즘 - 업무량 가중치',
    },
    { key: 'PENALTY_DURATION_DAYS', value: '30', description: '패널티 기간 (일)' },
    {
      key: 'PRIORITY_CREDIT_EXPIRY_DAYS',
      value: '60',
      description: '우선배정 크레딧 만료 기간 (일)',
    },
    { key: 'DEFAULT_RESPONSE_DEADLINE_HOURS', value: '48', description: '배정 응답 기한 (시간)' },
  ];
  for (const config of SYSTEM_CONFIGS) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, description: config.description },
      create: { key: config.key, value: config.value, description: config.description },
    });
  }
  console.log(`  ✅ 시스템 설정 ${SYSTEM_CONFIGS.length}개 생성 완료`);

  // 5. 메시지 템플릿 생성
  console.log('📝 메시지 템플릿 생성 중...');

  // 임시 배정 템플릿
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

  // 확정 배정 (팀원용) 템플릿
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

  // 확정 배정 (팀장용) 템플릿
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

  console.log('  ✅ 메시지 템플릿 3개 생성 완료');

  console.log('\n✅ 핵심 메타데이터 생성 완료!\n');
}

// 직접 실행 시
if (require.main === module) {
  runSeedCore()
    .catch((e) => {
      console.error('❌ 생성 실패:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
