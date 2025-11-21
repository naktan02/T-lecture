// domains/user/repositories/user.repository.js
const prisma = require('../../../libs/prisma');

class UserRepository {
  // [공통] 이메일로 사용자 찾기 (로그인, 중복확인용)
  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { userEmail: email },
      include: { instructor: true }, // 강사 정보 확인용
    });
  }

  // [공통] ID로 사용자 찾기 (내 정보 조회, 관리자 상세 조회 공용)
  async findById(id) {
    return await prisma.user.findUnique({
      where: { id: Number(id) },
      include: { instructor: true },
    });
  }

  // [공통] 유저 정보 수정 (User + Instructor 트랜잭션 처리)
  // 본인 수정(UserMeService)과 관리자 강제 수정(AdminService)에서 공통으로 사용합니다.
  async update(id, userData, instructorData) {
    return await prisma.user.update({
      where: { id: Number(id) },
      data: {
        ...userData,
        // instructorData가 존재하고 키가 하나라도 있을 때만 업데이트 수행
        ...(instructorData && Object.keys(instructorData).length > 0
          ? {
              instructor: {
                update: instructorData,
              },
            }
          : {}),
      },
      include: { instructor: true },
    });
  }

  // [신규] 유저 삭제 (공통 - 본인 탈퇴 및 관리자 강제 삭제용)
  // 강사 테이블과 유저 테이블의 데이터를 트랜잭션으로 안전하게 삭제합니다.
  async delete(id) {
    return await prisma.$transaction(async (tx) => {
      // 1. 연관된 강사 정보 먼저 삭제 (존재 시)
      await tx.instructor.deleteMany({
        where: { userId: Number(id) },
      });

      // 2. 유저 정보 삭제
      return await tx.user.delete({
        where: { id: Number(id) },
      });
    });
  }

  // [Auth] 비밀번호 업데이트
  async updatePassword(id, password) {
    return await prisma.user.update({
      where: { id: Number(id) },
      data: { password },
    });
  }

  // [Auth] 일반 유저 생성
  async createUser(data) {
    return await prisma.user.create({
      data,
    });
  }

  // [Auth] 강사 생성 (User + Instructor 동시 생성)
  async createInstructor(userData, instructorData) {
    return await prisma.user.create({
      data: {
        ...userData,
        instructor: {
          create: instructorData, // { location: ... }
        },
      },
    });
  }
}

module.exports = new UserRepository();
