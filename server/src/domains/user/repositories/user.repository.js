// domains/user/repositories/user.repository.js
const prisma = require('../../../libs/prisma');

// 1. 이메일로 사용자 찾기 (로그인, 중복확인용)
exports.findByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { userEmail: email },
    include: { instructor: true }, // 강사 정보 확인용
  });
};

// 2. ID로 사용자 찾기 (내 정보/관리자 상세 조회용)
exports.findById = async (id) => {
  return await prisma.user.findUnique({
    where: { id: Number(id) },
    // 민감 정보 제외 (비밀번호 등)
    select: {
      id: true,
      userEmail: true,
      name: true,
      userphoneNumber: true,
      role: true,
      status: true,
      instructor: true, // relation (강사 프로필)
      // createdAt, updatedAt 필요하면 true로 추가
    },
  });
};

// 3. 회원가입용 생성 (User + Instructor 동시 생성)
exports.createUserWithInstructor = async (data) => {
  return await prisma.user.create({
    data,
    include: {
      instructor: true, // 생성 후 강사 정보도 함께 반환
    },
  });
};

// 4. 다수 유저 조회 (관리자용 리스트)
exports.findMany = async (filters = {}) => {
  const { role, status } = filters;

  const where = {};
  if (role) where.role = role;
  if (status) where.status = status;

  return await prisma.user.findMany({
    where,
    select: {
      id: true,
      userEmail: true,
      name: true,
      userphoneNumber: true,
      role: true,
      status: true,
    },
    orderBy: { id: 'desc' }, // 필요에 따라 변경
  });
};

// 5. 유저 정보 수정
exports.update = async (id, data) => {
  return await prisma.user.update({
    where: { id: Number(id) },
    data,
    select: {
      id: true,
      userEmail: true,
      name: true,
      userphoneNumber: true,
      role: true,
      status: true,
      instructor: true,
    },
  });
};

// 6. 유저 삭제
exports.delete = async (id) => {
  return await prisma.user.delete({
    where: { id: Number(id) },
  });
};
