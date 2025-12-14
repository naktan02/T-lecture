// domains/user/repositories/user.repository.js
const prisma = require('../../../libs/prisma');

class UserRepository {
  // 이메일로 사용자 찾기 (로그인, 중복확인용)
  async findByEmail(email) {
      return await prisma.user.findUnique({
        where: { userEmail: email },
        include: { 
          instructor: true, 
          admin: true   
        }, 
      });
  }

  // ID로 사용자 찾기 (내 정보 조회, 관리자 상세 조회 공용)
  async findById(id) {
    return await prisma.user.findUnique({
      where: { id: Number(id) },
      include: { instructor: true },
    });
  }

  // 유저 정보 수정 (User + Instructor 트랜잭션 처리)
  async update(id, userData, instructorData) {
    return await prisma.user.update({
      where: { id: Number(id) },
      data: {
        ...userData,
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

  // 유저 삭제 (공통 - 본인 탈퇴 및 관리자 강제 삭제용)
  async delete(id) {
    const userId = Number(id);

    return await prisma.$transaction(async (tx) => {
      // 강사 여부 확인 (없으면 그냥 스킵)
      const instructor = await tx.instructor.findUnique({
        where: { userId },
        select: { userId: true },
      });

      if (instructor) {
        // 강사가능덕목(강사id FK) 먼저 삭제
        await tx.instructorVirtue.deleteMany({
          where: { instructorId: userId },
        });

        // 근무 가능일(있다면) 삭제
        await tx.instructorAvailability.deleteMany({
          where: { instructorId: userId },
        });

        // 거리, 통계 등 강사 FK 걸린 것들도 여기서 같이 정리
        await tx.instructorUnitDistance.deleteMany({
          where: { instructorId: userId },
        }).catch(() => {}); 

        await tx.instructorStats.deleteMany({
          where: { instructorId: userId },
        }).catch(() => {});

        // 마지막으로 instructor 행 삭제
        await tx.instructor.deleteMany({
          where: { userId },
        });
      }

      // 2. user 행 삭제 (Admin은 onDelete: Cascade 라서 자동 정리)
      return await tx.user.delete({
        where: { id: userId },
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
