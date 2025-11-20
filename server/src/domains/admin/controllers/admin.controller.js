const prisma = require('../../../libs/prisma');
const userRepository = require('../../user/repositories/user.repository'); // User 레포지토리 재사용

// [승인 대기 목록 조회]
exports.getPendingUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'PENDING' },
      include: { instructor: true }, // 강사 정보(주소 등) 확인용
      orderBy: { id: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [유저 승인] (상태를 APPROVED로 변경)
exports.approveUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body; // (선택) 역할을 변경하고 싶을 때만 보냄

    // 1. 변경할 데이터 준비 (기본은 상태만 승인)
    const updateData = { status: 'APPROVED' };

    // 2. 만약 관리자가 역할을 바꾸고 싶어서 보냈다면 같이 수정
    if (role && ['ADMIN', 'INSTRUCTOR', 'USER'].includes(role)) {
      updateData.role = role;
    }

    // 3. 업데이트 실행
    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: updateData,
    });

    res.json({ 
      message: '승인 처리가 완료되었습니다.', 
      user: { id: updatedUser.id, role: updatedUser.role, status: updatedUser.status }
    });
  } catch (error) {
    res.status(400).json({ error: '승인 처리에 실패했습니다.' });
  }
};

// [일괄 승인] 여러 명을 한 번에 승인 처리
exports.approveUsersBulk = async (req, res) => {
  try {
    const { userIds } = req.body; // 예: { "userIds": [1, 2, 5] }

    // 1. 유효성 검사 (배열인지 확인)
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: '승인할 유저 ID 목록(배열)이 필요합니다.' });
    }

    // 2. 일괄 업데이트 (updateMany)
    // PENDING 상태인 유저들만 골라서 APPROVED로 변경합니다.
    const result = await prisma.user.updateMany({
      where: {
        id: { in: userIds },      // 요청받은 ID 목록에 포함되고
        status: 'PENDING'         // 현재 '승인 대기' 상태인 유저만
      },
      data: {
        status: 'APPROVED',       // 승인 완료로 변경
      },
    });

    // result.count: 실제로 업데이트된 행의 개수
    res.json({ 
      message: `${result.count}명의 유저가 승인되었습니다.`, 
      count: result.count 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '일괄 승인 처리에 실패했습니다.' });
  }
};

// [신규] 관리자 내 정보 조회
exports.getMe = async (req, res) => {
  try {
    // 미들웨어(checkAuth)가 토큰에서 해석한 ID
    const adminId = req.user.id; 
    
    const admin = await userRepository.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: '관리자 정보를 찾을 수 없습니다.' });
    }

    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [유저 승인 거절] (데이터 삭제)
exports.rejectUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const id = Number(userId);

    // 1. 유저 존재 및 상태 확인
    const user = await prisma.user.findUnique({
      where: { id },
      include: { instructor: true }, // 강사 정보 존재 여부 확인
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // (선택) '승인 대기' 상태인 경우에만 거절 가능하도록 제한
    if (user.status !== 'PENDING') {
      return res.status(400).json({ error: '승인 대기 중인 사용자만 거절할 수 있습니다.' });
    }

    // 2. 데이터 삭제 (트랜잭션 사용)
    // 강사(Instructor) 테이블이 User를 참조하고 있으므로, 강사 정보를 먼저 지워야 합니다.
    // (단, 스키마에 onDelete: Cascade가 설정되어 있다면 user만 지워도 되지만, 안전을 위해 명시적으로 처리합니다)
    await prisma.$transaction(async (tx) => {
      // 강사 정보가 있다면 먼저 삭제
      if (user.instructor) {
        await tx.instructor.delete({
          where: { userId: id },
        });
      }

      // 유저 정보 삭제
      await tx.user.delete({
        where: { id },
      });
    });

    res.json({ message: '회원가입 요청을 거절하고 데이터를 삭제했습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '거절 처리에 실패했습니다.' });
  }
};

// [일괄 거절] 여러 명의 가입 요청을 한 번에 삭제
exports.rejectUsersBulk = async (req, res) => {
  try {
    const { userIds } = req.body; // 예: { "userIds": [10, 11, 12] }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: '거절할 유저 ID 목록(배열)이 필요합니다.' });
    }

    // 트랜잭션으로 안전하게 삭제
    const result = await prisma.$transaction(async (tx) => {
      // 1. 삭제 대상 ID 필터링 (안전을 위해 'PENDING' 상태인 유저만 골라냄)
      const targets = await tx.user.findMany({
        where: {
          id: { in: userIds },
          status: 'PENDING',
        },
        select: { id: true },
      });

      const targetIds = targets.map((u) => u.id);

      if (targetIds.length === 0) {
        return { count: 0 };
      }

      // 2. 연관된 강사 데이터(Instructor) 먼저 삭제
      // (Foreign Key 제약조건 때문에 자식 데이터를 먼저 지워야 합니다.)
      await tx.instructor.deleteMany({
        where: { userId: { in: targetIds } },
      });

      // 3. 유저 데이터(User) 삭제
      const deletedUsers = await tx.user.deleteMany({
        where: { id: { in: targetIds } },
      });

      return deletedUsers;
    });

    res.json({
      message: `${result.count}명의 가입 요청을 거절(삭제)했습니다.`,
      count: result.count,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '일괄 거절 처리에 실패했습니다.' });
  }
};