// server/prisma/seedMetadata.js
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 메타데이터 더미 데이터 삽입 시작...');

  // 1) Team 더미 데이터
  const teams = [{ name: '서울 1팀' }, { name: '경기 남부팀' }, { name: '강원도 팀' }];

  // 2) Virtue(덕목) 더미 데이터
  const virtues = [{ name: '학교폭력 예방' }, { name: '디지털 리터러시' }, { name: '인성 교육' }];

  // 🔥 기존 데이터 싹 지우고 다시 넣기 (여러 번 실행해도 상태 깔끔하게 유지)
  await prisma.team.deleteMany();
  await prisma.virtue.deleteMany();

  await prisma.team.createMany({
    data: teams,
  });

  await prisma.virtue.createMany({
    data: virtues,
  });

  console.log('✅ 메타데이터 더미 데이터 삽입 완료');
}

main()
  .catch((e) => {
    console.error('❌ seedMetadata 실행 중 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
