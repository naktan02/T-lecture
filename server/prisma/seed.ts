// server/prisma/seed.ts
// 운영 환경 기본 시드 데이터
// 실행: npx tsx prisma/seed.ts

/* eslint-disable no-console */

import 'dotenv/config';
import { Prisma } from '../src/generated/prisma/client.js';
import prisma from '../src/libs/prisma.js';
import bcrypt from 'bcrypt';

// 팀 데이터 (7개)
const TEAMS = [
  { id: 1, name: '1팀' },
  { id: 2, name: '2팀' },
  { id: 3, name: '2팀' },
  { id: 4, name: '2팀' },
  { id: 5, name: '2팀' },
  { id: 6, name: '2팀' },
  { id: 7, name: '2팀' },
];

// 덕목(과목) 데이터 (15개)
const VIRTUES = [
  { id: 1, name: '예' },
  { id: 2, name: '효' },
  { id: 3, name: '정직' },
  { id: 4, name: '책임' },
  { id: 5, name: '1' },
  { id: 6, name: '책임' },
  { id: 7, name: '책임' },
  { id: 8, name: '책임' },
  { id: 9, name: '책임' },
  { id: 10, name: '책임' },
  { id: 11, name: '책임' },
  { id: 12, name: '책임' },
  { id: 13, name: '책임' },
  { id: 14, name: '책임' },
  { id: 15, name: '책임' },
];

// 시스템 설정 기본값
const SYSTEM_CONFIGS = [
  { key: 'REJECTION_PENALTY_DAYS', value: '15', description: '거절 패널티 기간 (일)' },
  { key: 'TRAINEES_PER_INSTRUCTOR', value: '36', description: '강사당 교육생 수' },
  { key: 'INTERN_MAX_DISTANCE_KM', value: '50', description: '실습강사 제한 거리 (km)' },
  { key: 'SUB_MAX_DISTANCE_KM', value: '0', description: '보조강사 제한 거리 (km), 0=제한없음' },
];

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          T-lecture 운영 환경 기본 시드 데이터              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

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

  // 2. 덕목(과목) 생성
  console.log('📚 덕목(과목) 생성 중...');
  for (const virtue of VIRTUES) {
    await prisma.virtue.upsert({
      where: { id: virtue.id },
      update: { name: virtue.name },
      create: { id: virtue.id, name: virtue.name },
    });
  }
  console.log(`  ✅ 덕목 ${VIRTUES.length}개 생성 완료`);

  // 3. 슈퍼관리자 생성
  console.log('👤 슈퍼관리자 생성 중...');

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
  } else {
    console.log('  ⚠️ SUPER_ADMIN_EMAIL/PASSWORD가 .env에 설정되지 않았습니다.');
  }
  // 4. 시스템 설정 생성
  console.log('⚙️ 시스템 설정 생성 중...');
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

  // 공통 formatPresets (모든 템플릿에서 동일)
  const commonPresets = {
    locations:
      '장소명: {placeName} 참여인원: {actualCount}\n강사휴게실: {hasInstructorLounge}, 여자화장실: {hasWomenRestroom}\n특이사항: {note}\n-------------------------------------------------------',
    instructors: '{index}. {name}({category}) / {phone} / {virtues}',
    'self.schedules': '- {date} ({dayOfWeek}) : {instructors}',
    'self.mySchedules': '- {date} ({dayOfWeek}) : {name}',
    scheduleLocations:
      '[{date} ({dayOfWeek})]\\n  {placeName}  / 참여인원 : {actualCount}\\n강사휴게실: {hasInstructorLounge} 여자화장실: {hasWomenRestroom}\\n특이사항 : {note}\\n----------------------------------------------------------',
  };

  // 공통 제목 (모든 템플릿에서 동일)
  const commonTitle = '{{unit.name}} : {{period.startDate}} ~ {{period.endDate}}';

  // 임시 배정 템플릿
  const temporaryBody = {
    tokens: [
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

  await prisma.messageTemplate.upsert({
    where: { key: 'TEMPORARY' },
    update: {
      title: commonTitle,
      body: temporaryBody as Prisma.InputJsonValue,
      formatPresets: commonPresets,
    },
    create: {
      key: 'TEMPORARY',
      title: commonTitle,
      body: temporaryBody as Prisma.InputJsonValue,
      formatPresets: commonPresets,
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

  await prisma.messageTemplate.upsert({
    where: { key: 'CONFIRMED_MEMBER' },
    update: {
      title: commonTitle,
      body: confirmedMemberBody as Prisma.InputJsonValue,
      formatPresets: commonPresets,
    },
    create: {
      key: 'CONFIRMED_MEMBER',
      title: commonTitle,
      body: confirmedMemberBody as Prisma.InputJsonValue,
      formatPresets: commonPresets,
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

      { text: '', type: 'text' },
      { type: 'newline' },

      { text: '- 구분: ', type: 'text' },
      { key: 'unit.unitType', type: 'var' },
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

      { text: '- 교육일정:  ', type: 'text' },
      { key: 'period.startDate', type: 'var' },
      { text: ' ~ ', type: 'text' },
      { key: 'period.endDate', type: 'var' },
      { type: 'newline' },

      { text: '- 교육 시간:  ', type: 'text' },
      { key: 'period.startTime', type: 'var' },
      { text: ' ~ ', type: 'text' },
      { key: 'period.endTime', type: 'var' },
      { type: 'newline' },

      { text: '- 교육불가일: ', type: 'text' },
      { key: 'period.excludedDates', type: 'var' },
      { type: 'newline' },

      { type: 'newline' },

      { text: '부대 담당자: ', type: 'text' },
      { key: 'period.officerName', type: 'var' },
      { text: '  담당자 전화번호:  ', type: 'text' },
      { key: 'period.officerPhone', type: 'var' },
      { type: 'newline' },

      { text: '담당자 이메일: ', type: 'text' },
      { key: 'period.officerEmail', type: 'var' },
      { type: 'newline' },

      { text: '수탁급식여부: ', type: 'text' },
      { key: 'period.hasCateredMeals', type: 'var' },
      { type: 'newline' },

      { text: '회관숙박여부: ', type: 'text' },
      { key: 'period.hasHallLodging', type: 'var' },
      { text: '  휴대폰 불출: ', type: 'text' },
      { key: 'period.allowsPhoneBeforeAfter', type: 'var' },
      { type: 'newline' },

      { text: '[배정 강사]', type: 'text' },
      { type: 'newline' },
      { key: 'self.schedules', type: 'format', format: '- {date} ({dayOfWeek}) : {instructors}' },
      { type: 'newline' },

      { text: '', type: 'text' },
      { type: 'newline' },

      { text: '- 교육장소', type: 'text' },
      { type: 'newline' },
      {
        key: 'scheduleLocations',
        type: 'format',
        format:
          '[{date} ({dayOfWeek})]\\n  {placeName}  / 참여인원 : {actualCount}\\n강사휴게실: {hasInstructorLounge} 여자화장실: {hasWomenRestroom}\\n특이사항 : {note}\\n----------------------------------------------------------',
      },
      { type: 'newline' },

      { type: 'newline' },

      {
        key: 'instructors',
        type: 'format',
        format: '{index}. {name}({category}) / {phone} / {virtues}',
      },
      { type: 'newline' },
    ],
  };

  await prisma.messageTemplate.upsert({
    where: { key: 'CONFIRMED_LEADER' },
    update: {
      title: commonTitle,
      body: confirmedLeaderBody as Prisma.InputJsonValue,
      formatPresets: commonPresets,
    },
    create: {
      key: 'CONFIRMED_LEADER',
      title: commonTitle,
      body: confirmedLeaderBody as Prisma.InputJsonValue,
      formatPresets: commonPresets,
    },
  });

  console.log('  ✅ 메시지 템플릿 3개 생성 완료');

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                  ✅ 시드 완료!                             ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  생성된 데이터:                                            ║');
  console.log('║  - 팀 7개                                                  ║');
  console.log('║  - 덕목(과목) 15개                                         ║');
  console.log('║  - 관리자 계정 (from .env)                                 ║');
  console.log('║  - 시스템 설정 6개                                         ║');
  console.log('║  - 메시지 템플릿 3개                                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
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
