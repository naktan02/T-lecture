
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Notice Target Setting Verification ---');

  const author = await prisma.user.findFirst({ where: { status: 'APPROVED' } });
  if (!author) {
    console.error('No approved user found for author.');
    return;
  }

  // 1. Create Notice with targetSetting
  console.log('1. Creating Notice with targetSetting...');
  const targetSetting = {
    targetType: 'TEAM',
    targetTeamIds: [1, 2],
    targetUserIds: [],
  };

  const created = await prisma.notice.create({
    data: {
      title: 'Test Target Notice',
      body: 'Content',
      authorId: author.id,
      targetSetting: targetSetting as any,
    },
  });
  console.log('Created Notice ID:', created.id);
  console.log('Created TargetSetting:', created.targetSetting);

  if (JSON.stringify(created.targetSetting) !== JSON.stringify(targetSetting)) {
    console.error('❌ Mismatch in creation!');
  } else {
    console.log('✅ Creation verified.');
  }

  // 2. Fetch via FindUnique
  console.log('2. Fetching Notice...');
  const fetched = await prisma.notice.findUnique({ where: { id: created.id } });
  console.log('Fetched TargetSetting:', fetched?.targetSetting);
  
  if (JSON.stringify(fetched?.targetSetting) !== JSON.stringify(targetSetting)) {
    console.error('❌ Mismatch in fetch!');
  } else {
    console.log('✅ Fetch verified.');
  }

  // Cleanup
  await prisma.notice.delete({ where: { id: created.id } });
  console.log('Test Notice Deleted.');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
