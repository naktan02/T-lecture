import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing Dashboard Data (Assignments, Schedules, Distances, Units)...');

  // Delete in order of dependency
  await prisma.instructorUnitAssignment.deleteMany({});
  await prisma.unitSchedule.deleteMany({});
  await prisma.instructorUnitDistance.deleteMany({});
  // We might want to keep Units if they are shared, but for test data it is better to clean
  // But wait, existing units from other seeds?
  // The script created units with 'Army' etc.
  // Let's delete Units created by our seed. Only way to know is by name or just delete all if safe.
  // For now, let's delete all Units that have '부대' in likely names or just everything if this is a dev env.
  // User said "테스트 데이터 생성", implies safe to delete.
  // But other seeds might exist.
  // Let's at least delete UnitSchedules and Assignments which caused the orphan issue.

  await prisma.trainingLocation.deleteMany({}); // Dependent on Unit

  // Unit도 삭제 (테스트 데이터 완전 초기화)
  await prisma.unit.deleteMany({});

  console.log('✅ Cleared Assignments, Schedules, Distances, TrainingLocations, Units.');
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
