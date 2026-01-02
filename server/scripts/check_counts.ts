import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.instructorUnitAssignment.count();
  const distances = await prisma.instructorUnitDistance.count();
  const units = await prisma.unit.count();
  const schedules = await prisma.unitSchedule.count();
  const instructors = await prisma.instructor.count();

  console.log('📊 DB Record Counts:');
  console.log(`- Instructors: ${instructors}`);
  console.log(`- Units: ${units}`);
  console.log(`- UnitSchedules: ${schedules}`);
  console.log(`- InstructorUnitAssignments: ${assignments}`);
  console.log(`- InstructorUnitDistances: ${distances}`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
