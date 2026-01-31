// server/scripts/fix-instructor-profiles.ts
// 강사 프로필 완료 여부(profileCompleted) 전수 업데이트 스크립트
// 새로운 기준: 주소, 분류, 기수가 모두 있어야 함 (팀은 선택)
// 실행: npx tsx scripts/fix-instructor-profiles.ts

import 'dotenv/config';
import prisma from '../src/libs/prisma.js';

async function fixInstructorProfiles() {
  console.log('🔄 강사 프로필 완료 상태 업데이트 시작...\n');

  const instructors = await prisma.instructor.findMany();
  console.log(`대상 강사 수: ${instructors.length}명`);

  let updatedCount = 0;
  let errorCount = 0;

  for (const instructor of instructors) {
    try {
      const { location, category, generation } = instructor;
      
      // 새로운 기준: 주소(location), 분류(category), 기수(generation)
      const isComplete = !!(
        location && 
        category && 
        generation !== null && 
        generation !== undefined
      );

      if (instructor.profileCompleted !== isComplete) {
        await prisma.instructor.update({
          where: { userId: instructor.userId },
          data: { profileCompleted: isComplete },
        });
        updatedCount++;
      }
    } catch (e) {
      console.error(`❌ 강사(ID: ${instructor.userId}) 업데이트 실패:`, e);
      errorCount++;
    }
  }

  console.log(`\n✅ 완료!`);
  console.log(`- 업데이트된 강사: ${updatedCount}명`);
  console.log(`- 에러: ${errorCount}명`);
}

fixInstructorProfiles()
  .catch((e) => {
    console.error('❌ 스크립트 실행 중 오류 발생:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
