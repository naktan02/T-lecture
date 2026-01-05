/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAssignments() {
  console.log('기존 배정 데이터 삭제 중...');
  await prisma.dispatchAssignment.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.instructorUnitAssignment.deleteMany();
  await prisma.instructorUnitDistance.deleteMany();
  await prisma.instructorPriorityCredit.deleteMany();
  await prisma.instructorPenalty.deleteMany();
  console.log('✅ 기존 배정 데이터 삭제 완료');
}

clearAssignments()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
