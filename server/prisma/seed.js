// server/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('❌ .env 파일에 SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD 설정 필요');
    process.exit(1);
  }

  // 1) 이미 슈퍼 관리자가 있는지 확인
  const existing = await prisma.admin.findFirst({
    where: { level: 'SUPER' },
    include: { user: true },
  });

  if (existing) {
    console.log(`⚠️ 이미 슈퍼 관리자(${existing.user.userEmail})가 존재합니다.`);
    return;
  }

  // 2) 동일 이메일 유저가 존재하는지 확인
  const existingUser = await prisma.user.findUnique({
    where: { userEmail: email },
  });

  let user;

  if (existingUser) {
    console.log('⚠️ 동일 이메일 유저가 이미 있으므로 해당 계정을 SUPER ADMIN으로 승격합니다.');
    user = existingUser;
  } else {
    // 3) 유저 생성
    const hashed = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        userEmail: email,
        password: hashed,
        name: '슈퍼관리자',
        userphoneNumber: '000-0000-0000',
        status: 'APPROVED',  // 승인 처리
      },
    });
  }

  // 4) admin 테이블에 SUPER 레코드 생성
  await prisma.admin.upsert({
    where: { userId: user.id },
    update: { level: 'SUPER' },
    create: {
      userId: user.id,
      level: 'SUPER', // 핵심
    },
  });

  console.log(`✅ SUPER ADMIN 생성 완료: ${email}`);
  console.log(`   ➜ user.id = ${user.id}`);
  console.log('   ➜ admin.level = SUPER');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
