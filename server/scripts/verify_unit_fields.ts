import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 부대 데이터 필드 확인 ===\n');

  const units = await prisma.unit.findMany({ take: 5 });

  for (const unit of units) {
    console.log(`📍 ${unit.name}`);
    console.log(`   지역: ${unit.region}, 광역: ${unit.wideArea}, 군구분: ${unit.unitType}`);
    console.log(
      `   근무시간: ${unit.workStartTime ? new Date(unit.workStartTime).toTimeString().slice(0, 5) : 'null'} ~ ${unit.workEndTime ? new Date(unit.workEndTime).toTimeString().slice(0, 5) : 'null'}`,
    );
    console.log(
      `   점심시간: ${unit.lunchStartTime ? new Date(unit.lunchStartTime).toTimeString().slice(0, 5) : 'null'} ~ ${unit.lunchEndTime ? new Date(unit.lunchEndTime).toTimeString().slice(0, 5) : 'null'}`,
    );
    console.log(`   담당자: ${unit.officerName || 'null'}, ${unit.officerPhone || 'null'}\n`);
  }

  // 배정 상태별 수
  const accepted = await prisma.instructorUnitAssignment.count({ where: { state: 'Accepted' } });
  const rejected = await prisma.instructorUnitAssignment.count({ where: { state: 'Rejected' } });
  const canceled = await prisma.instructorUnitAssignment.count({ where: { state: 'Canceled' } });
  const pending = await prisma.instructorUnitAssignment.count({ where: { state: 'Pending' } });

  console.log('=== 배정 상태별 수 ===');
  console.log(`✅ Accepted: ${accepted}`);
  console.log(`❌ Rejected: ${rejected}`);
  console.log(`🚫 Canceled: ${canceled}`);
  console.log(`⏳ Pending: ${pending}`);
  console.log(
    `📊 수락률: ${((accepted / (accepted + rejected + canceled + pending)) * 100).toFixed(1)}%`,
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
