// server/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('❌ .env 파일에 ADMIN_EMAIL과 ADMIN_PASSWORD를 설정해주세요.');
    process.exit(1);
  }

  // 이미 존재하는지 확인
  const exists = await prisma.user.findUnique({ where: { userEmail: email } });
  if (exists) {
    console.log('⚠️  슈퍼 관리자가 이미 존재합니다.');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // 1) user 생성
  const user = await prisma.user.create({
    data: {
      userEmail: email,
      password: hashedPassword,
      name: '슈퍼관리자',
      userphoneNumber: '000-0000-0000',
      role: 'ADMIN',
      status: 'APPROVED',
    },
  });

  // 2) admin 테이블에도 레코드 생성 (⭐ 매우 중요)
  await prisma.admin.create({
    data: {
      userId: user.id, // FK 연결
    },
  });

  console.log(`✅ 슈퍼 관리자 계정(${email})이 정상적으로 생성되었습니다.`);
  console.log('   ➜ user.role = ADMIN');
  console.log('   ➜ admin 테이블 레코드 생성됨');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
