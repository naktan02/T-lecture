// server/prisma/seedMetadata.js
// 팀 및 덕목 메타데이터 시딩 스크립트
// 실행: npx tsx prisma/seedMetadata.js 또는 node prisma/seedMetadata.js

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 메타데이터 시딩 시작...\n');

  // ============================================
  // 1. 팀 (Team) 데이터 - 실제 운영 구조 기반
  // ============================================
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

  console.log('� 팀 데이터 생성 중...');
  for (const team of teams) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: { name: team.name },
      create: { id: team.id, name: team.name },
    });
    console.log(`  ✅ ${team.name}`);
  }
  console.log(`\n✅ 팀 ${teams.length}개 생성 완료\n`);

  // ============================================
  // 2. 덕목 (Virtue) 데이터 - 인성교육 8대 덕목
  // ============================================
  const virtues = [
    { id: 1, name: '예' }, // 禮 - 예절
    { id: 2, name: '효' }, // 孝 - 효도
    { id: 3, name: '정직' }, // 正直
    { id: 4, name: '책임' }, // 責任
    { id: 5, name: '존중' }, // 尊重
    { id: 6, name: '배려' }, // 配慮
    { id: 7, name: '소통' }, // 疏通
    { id: 8, name: '협동' }, // 協同
  ];

  console.log('📋 덕목 데이터 생성 중...');
  for (const virtue of virtues) {
    await prisma.virtue.upsert({
      where: { id: virtue.id },
      update: { name: virtue.name },
      create: { id: virtue.id, name: virtue.name },
    });
    console.log(`  ✅ ${virtue.name}`);
  }
  console.log(`\n✅ 덕목 ${virtues.length}개 생성 완료\n`);

  // ============================================
  // 3. 요약
  // ============================================
  console.log('='.repeat(40));
  console.log('📊 메타데이터 시딩 완료');
  console.log('='.repeat(40));
  console.log(`팀: ${teams.length}개`);
  console.log(`  - ${teams.map((t) => t.name).join(', ')}`);
  console.log(`덕목: ${virtues.length}개`);
  console.log(`  - ${virtues.map((v) => v.name).join(', ')}`);
  console.log('='.repeat(40));
}

main()
  .catch((e) => {
    console.error('❌ seedMetadata 실행 중 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
