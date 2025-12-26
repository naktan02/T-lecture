// server/prisma/checkUsers.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 유저 데이터 현황\n');

  const totalUsers = await prisma.user.count();
  const pendingUsers = await prisma.user.count({ where: { status: 'PENDING' } });
  const approvedUsers = await prisma.user.count({ where: { status: 'APPROVED' } });
  const instructors = await prisma.instructor.count();
  const admins = await prisma.admin.count();

  // 강사 중 profileCompleted 여부
  const instructorsComplete = await prisma.instructor.count({ where: { profileCompleted: true } });
  const instructorsIncomplete = await prisma.instructor.count({
    where: { profileCompleted: false },
  });

  console.log('='.repeat(40));
  console.log('전체 유저:', totalUsers);
  console.log('  - 승인 대기:', pendingUsers);
  console.log('  - 활동중:', approvedUsers);
  console.log('');
  console.log('강사:', instructors);
  console.log('  - 프로필 완료:', instructorsComplete);
  console.log('  - 프로필 미완료:', instructorsIncomplete);
  console.log('');
  console.log('관리자:', admins);
  console.log('='.repeat(40));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
