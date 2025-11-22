const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
  // [수정] 환경 변수에서 값을 가져옵니다. 없으면 기본값(안전하지 않음) 사용 방지
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

  await prisma.user.create({
    data: {
      userEmail: email,
      password: hashedPassword,
      name: '슈퍼관리자',
      userphoneNumber: '000-0000-0000',
      role: 'ADMIN',
      status: 'APPROVED',
    },
  });

  console.log(`✅ 슈퍼 관리자 계정(${email})이 생성되었습니다.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });