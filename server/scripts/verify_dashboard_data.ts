import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Dashboard Data Verification Script');

  // 1. Check Instructor Stats
  const stats = await prisma.instructorStats.findMany({
    take: 5,
    orderBy: { lastCalculatedAt: 'desc' },
  });
  console.log(`\n📊 InstructorStats (Top 5): ${stats.length} rows`);
  console.table(stats);

  if (stats.length > 0) {
    const zeroStats = stats.filter((s) => s.totalWorkHours === 0 && s.totalDistance === 0);
    console.log(`ℹ️ ${zeroStats.length}/${stats.length} shown stats have 0 hours and 0 distance.`);
  }

  // 2. Check Assignments for a specific user
  const instructor = await prisma.instructor.findFirst({
    where: { profileCompleted: true },
    include: { user: true },
  });

  if (!instructor) {
    console.log('❌ No instructor found');
    return;
  }

  console.log(`\n👨‍🏫 Checking Instructor: ${instructor.user.name} (${instructor.userId})`);

  const assignments = await prisma.instructorUnitAssignment.findMany({
    where: {
      userId: instructor.userId,
      state: 'Accepted',
    },
    include: {
      UnitSchedule: {
        include: { unit: true },
      },
    },
  });

  console.log(`✅ Accepted Assignments: ${assignments.length}`);

  const now = new Date();
  const pastAssignments = assignments.filter(
    (a) => a.UnitSchedule && a.UnitSchedule.date && new Date(a.UnitSchedule.date) < now,
  );
  console.log(`✅ Past Accepted Assignments (should be counted): ${pastAssignments.length}`);

  if (pastAssignments.length > 0) {
    const sample = pastAssignments[0];
    console.log('\n📝 Sample Assignment:');
    console.log(`  - Date: ${sample.UnitSchedule?.date}`);
    console.log(`  - Unit: ${sample.UnitSchedule?.unit.name}`);
    console.log(`  - Work Start: ${sample.UnitSchedule?.unit.workStartTime}`);
    console.log(`  - Work End: ${sample.UnitSchedule?.unit.workEndTime}`);

    // Check Distance
    const distance = await prisma.instructorUnitDistance.findUnique({
      where: {
        userId_unitId: {
          userId: instructor.userId,
          unitId: sample.UnitSchedule!.unitId,
        },
      },
    });
    console.log(`  - Distance Record: ${distance ? `${distance.distance}km` : 'MISSING ❌'}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
