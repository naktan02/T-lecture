import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const OUTPUT_PATH = path.join(__dirname, '../test-data/excluded_dates_verify.txt');

async function main() {
  let output = '=== 교육불가일자 적용 확인 ===\n\n';

  const unitsWithExcluded = await prisma.unit.findMany({
    where: {
      excludedDates: { isEmpty: false },
    },
    include: {
      schedules: {
        orderBy: { date: 'asc' },
      },
    },
  });

  output += `교육불가일자가 있는 부대: ${unitsWithExcluded.length}개\n\n`;

  for (const unit of unitsWithExcluded) {
    const scheduleCount = unit.schedules.length;
    const eduStart = unit.educationStart?.toISOString().split('T')[0];
    const eduEnd = unit.educationEnd?.toISOString().split('T')[0];
    const excluded = unit.excludedDates.join(', ');

    let totalDays = 0;
    if (unit.educationStart && unit.educationEnd) {
      totalDays =
        Math.ceil(
          (unit.educationEnd.getTime() - unit.educationStart.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;
    }

    output += `[${unit.name}]\n`;
    output += `  교육기간: ${eduStart} ~ ${eduEnd} (${totalDays}일)\n`;
    output += `  교육불가: ${excluded}\n`;
    output += `  유효일정: ${scheduleCount}일\n`;

    if (unit.schedules.length <= 5) {
      const dates = unit.schedules.map((s) => s.date?.toISOString().split('T')[0]).join(', ');
      output += `  일정목록: ${dates}\n`;
    }

    if (scheduleCount === 3 && totalDays === 4) {
      output += `  >> 3일 정책 테스트 통과 (4일 중 1일 제외 = 3일)\n`;
    }
    output += '\n';
  }

  fs.writeFileSync(OUTPUT_PATH, output);
  console.log('분석 완료:', OUTPUT_PATH);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
