import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 다중 교육장소 검증 ===\n');

  // 교육장소가 2개 이상인 부대 조회
  const multiLocationUnits = await prisma.unit.findMany({
    include: {
      trainingLocations: true,
      _count: { select: { trainingLocations: true } },
    },
    orderBy: {
      trainingLocations: { _count: 'desc' },
    },
  });

  const filtered = multiLocationUnits.filter((u) => u._count.trainingLocations >= 2);

  console.log(`교육장소 2개 이상 부대: ${filtered.length}개\n`);

  for (const unit of filtered) {
    console.log(`📌 ${unit.name} (${unit._count.trainingLocations}개 교육장소)`);
    for (const loc of unit.trainingLocations) {
      console.log(
        `   - ${loc.originalPlace || '(unnamed)'} ${loc.changedPlace ? `→ ${loc.changedPlace}` : ''}`,
      );
    }
    console.log('');
  }

  // 총계
  const totalUnits = await prisma.unit.count();
  const totalLocations = await prisma.trainingLocation.count();
  console.log(`=== 총계 ===`);
  console.log(`부대: ${totalUnits}개`);
  console.log(`교육장소: ${totalLocations}개`);
  console.log(`평균 교육장소/부대: ${(totalLocations / totalUnits).toFixed(1)}개`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
