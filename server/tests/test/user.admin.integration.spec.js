const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { app, server } = require('../../src/server');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

const SUPER_ADMIN_EMAIL = 'super_admin@test.com';
const GENERAL_ADMIN_EMAIL = 'general_admin@test.com';
const APPROVED_INSTRUCTOR_EMAIL = 'approved_instructor@test.com';
const PENDING_INSTRUCTOR_EMAIL = 'pending_instructor@test.com';
const COMMON_USER_EMAIL = 'common_user@test.com';
const PENDING_USER_EMAIL = 'pending_user@test.com';

describe('User Admin API Integration Test (Admin APIs Full Coverage)', () => {
  let superAdminToken;
  let generalAdminToken;
  let approvedInstructorId;
  let pendingInstructorId;
  let commonUserId;
  let pendingUserId;
  let teamId;

  const logResponse = (res, label) => {
    console.log(`\n📦 [${label}] ${res.req.method} ${res.req.path} (${res.status})`);
    const prefix = res.status >= 400 ? 'Error:' : 'Response Body:';
    console.log(prefix, JSON.stringify(res.body, null, 2));
    console.log('--------------------------------------------------\n');
  };

  const expectErrorShape = (res) => {
    expect(res.body).to.be.an('object');
    expect(res.body.error || res.body.message, 'error or message should exist').to.exist;
    if (res.body.statusCode !== undefined) expect(res.body.statusCode).to.be.a('number');
    if (res.body.code !== undefined) expect(res.body.code).to.be.a('string');
  };

  const expectUserCleanAndCorrect = (user, expectedStatus, isInstructor = false) => {
    expect(user).to.exist;
    expect(user).to.not.have.property('password');
    // 🚨 FIX: 서버 코드에서 admin 필드를 제거했으므로, 응답에 없어야 함
    expect(user).to.not.have.property('admin');
    expect(user.status).to.equal(expectedStatus);

    if (isInstructor) {
      expect(user).to.have.property('instructor').that.is.an('object');
      expect(user.instructor).to.have.property('location');
    } else {
      // 일반 유저인 경우 instructor 필드는 null (repo에서 포함)이거나 아예 없어야 함
      // service에서 null이면 제거하므로, 아예 없어야 함.
      expect(user).to.not.have.property('instructor');
    }
  };

  before(async () => {
    await prisma.instructorVirtue.deleteMany().catch(() => {});
    await prisma.instructorAvailability.deleteMany().catch(() => {});
    await prisma.instructorStats.deleteMany().catch(() => {});
    await prisma.instructor.deleteMany().catch(() => {});
    await prisma.admin.deleteMany();
    await prisma.user.deleteMany({
      where: {
        userEmail: {
          in: [
            SUPER_ADMIN_EMAIL,
            GENERAL_ADMIN_EMAIL,
            APPROVED_INSTRUCTOR_EMAIL,
            PENDING_INSTRUCTOR_EMAIL,
            COMMON_USER_EMAIL,
            PENDING_USER_EMAIL,
          ],
        },
      },
    });
    await prisma.team.deleteMany();

    const pw = 'Test1234!';
    const hashed = await bcrypt.hash(pw, 10);

    // 팀 생성 (강사 FK용)
    const team = await prisma.team.create({ data: { name: 'Test Team' } });
    teamId = team.id;

    // 1) 슈퍼 관리자
    const superAdmin = await prisma.user.create({
      data: {
        userEmail: SUPER_ADMIN_EMAIL,
        password: hashed,
        name: '슈퍼',
        userphoneNumber: '010-0000-0000',
        status: 'APPROVED',
        admin: { create: { level: 'SUPER' } },
      },
    });
    superAdminToken = jwt.sign({ userId: superAdmin.id }, JWT_SECRET);

    // 2) 일반 관리자
    const generalAdmin = await prisma.user.create({
      data: {
        userEmail: GENERAL_ADMIN_EMAIL,
        password: hashed,
        name: '일반',
        userphoneNumber: '010-0000-0001',
        status: 'APPROVED',
        admin: { create: { level: 'GENERAL' } },
      },
    });
    generalAdminToken = jwt.sign({ userId: generalAdmin.id }, JWT_SECRET);

    // 3) 승인 완료 강사
    const approvedInstructor = await prisma.user.create({
      data: {
        userEmail: APPROVED_INSTRUCTOR_EMAIL,
        password: 'hash',
        name: '승인강사',
        status: 'APPROVED',
        userphoneNumber: '010-0000-0002',
        instructor: { create: { category: 'Main', location: '서울', teamId: teamId } },
      },
    });
    approvedInstructorId = approvedInstructor.id;

    // 4) 승인 대기 강사
    const pendingInstructor = await prisma.user.create({
      data: {
        userEmail: PENDING_INSTRUCTOR_EMAIL,
        password: 'hash',
        name: '대기강사',
        status: 'PENDING',
        userphoneNumber: '010-0000-0003',
        instructor: { create: { category: 'Assistant', location: '부산', teamId: teamId } },
      },
    });
    pendingInstructorId = pendingInstructor.id;

    // 5) 승인 대기 일반 유저
    const pendingUser = await prisma.user.create({
      data: {
        userEmail: PENDING_USER_EMAIL,
        password: 'hash',
        name: '일반대기자',
        status: 'PENDING',
        userphoneNumber: '010-0000-0005',
      },
    });
    pendingUserId = pendingUser.id;

    // 6) 일반 유저
    const commonUser = await prisma.user.create({
      data: {
        userEmail: COMMON_USER_EMAIL,
        password: 'hash',
        name: '일반유저',
        status: 'APPROVED',
      },
    });
    commonUserId = commonUser.id;

    console.log('✅ User Admin Test Data Seeded');
  });

  after(async () => {
    server.close();
    await prisma.$disconnect();
  });

  // =================================================================
  // 🧪 0. 인증/인가 에러 케이스 (임의 에러 생성)
  // =================================================================

  // 토큰 없음
  it('[AUTH] No Token (Error 401)', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    logResponse(res, 'No Token');
    expect(res.status).to.equal(401);
    expectErrorShape(res);
  });

  // 토큰 유효하지 않음
  it('[AUTH] Invalid Token (Error 401)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer not.a.jwt`);
    logResponse(res, 'Invalid Token');
    expect(res.status).to.equal(401);
    expectErrorShape(res);
  });

  // 관 리자 권한 없음
  it('[AUTH] Non-Admin User (Error 403)', async () => {
    const userToken = jwt.sign({ userId: commonUserId }, JWT_SECRET);
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${userToken}`);
    logResponse(res, 'Non-Admin');
    expect(res.status).to.equal(403);
    expectErrorShape(res);
    expect(res.body.error).to.include('관리자만 접근할 수 있습니다.');
  });

  // =================================================================
  // 🧪 1. 조회 API (GET /users, /users/pending, /users/:userId)
  // =================================================================

  // 승인된 사용자 조회
  it('[GET] /users - List Users (Success, Filter APPROVED Default)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'List Users (APPROVED)');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');

    // ✅ 강사 정보 포함 확인 (승인 강사)
    const instructor = res.body.find((u) => u.id === approvedInstructorId);
    expectUserCleanAndCorrect(instructor, 'APPROVED', true);

    // ✅ 일반 유저 확인
    const generalUser = res.body.find((u) => u.id === commonUserId);
    expectUserCleanAndCorrect(generalUser, 'APPROVED', false);

    // ✅ 대기자는 포함되지 않아야 함
    const pendingUser = res.body.find((u) => u.id === pendingInstructorId);
    expect(pendingUser).to.be.undefined;
  });

  // 승인 대기 사용자 조회
  it('[GET] /users/pending - List Pending (Success, Includes Instructor Info)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users/pending')
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'List Pending Users');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.length).to.be.at.least(2); // 대기 강사 + 일반 대기 유저

    const pendingInstructor = res.body.find((u) => u.id === pendingInstructorId);
    // ✅ 강사 대기자 정보 포함 확인
    expectUserCleanAndCorrect(pendingInstructor, 'PENDING', true);
    expect(pendingInstructor.instructor.location).to.equal('부산');

    const pendingGeneralUser = res.body.find((u) => u.id === pendingUserId);
    // ✅ 일반 대기자 정보 포함 확인 (instructor: null)
    expectUserCleanAndCorrect(pendingGeneralUser, 'PENDING', false);
  });

  // 사용자 ID로 조회
  it('[GET] /users/:userId - Get User By Id (Success, Instructor Detail)', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/users/${approvedInstructorId}`)
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Get User Detail (Instructor)');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id', approvedInstructorId);
    expectUserCleanAndCorrect(res.body, 'APPROVED', true);
    expect(res.body.instructor.location).to.equal('서울');
  });

  // 사용자 ID로 조회 - Not Found
  it('[GET] /users/:userId - Not Found (Error 404)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users/99999')
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Get User Detail 404');
    expect(res.status).to.equal(404);
    expectErrorShape(res);
    expect(res.body.code).to.equal('USER_NOT_FOUND');
  });

  // 사용자 ID로 조회 - Invalid Param
  it('[GET] /users/:userId - Invalid Param (Error 400)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users/not-a-number')
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Get User Detail 400');
    expect(res.status).to.equal(400);
    expectErrorShape(res);
    expect(res.body.code).to.equal('INVALID_USER_ID');
  });

  // =================================================================
  // 🧪 2. 회원 관리 API (PATCH /users/:userId, DELETE /users/:userId)
  // =================================================================

  // 일반 사용자 수정
  it('[PATCH] /users/:userId - Update User (Success, General User)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${commonUserId}`)
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ name: '관리자수정', status: 'RESTING' });

    logResponse(res, 'Update User');
    expect(res.status).to.equal(200);
    expectUserCleanAndCorrect(res.body, 'RESTING', false);
    expect(res.body.name).to.equal('관리자수정');
    expect(res.body.status).to.equal('RESTING');
  });

  // 승인된 강사 수정 성공
  it('[PATCH] /users/:userId - Update User (Success, Instructor Info)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${approvedInstructorId}`)
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ address: '제주도', isTeamLeader: true });

    logResponse(res, 'Update Instructor User');
    expect(res.status).to.equal(200);
    expectUserCleanAndCorrect(res.body, 'APPROVED', true);
    expect(res.body.instructor.location).to.equal('제주도');
    expect(res.body.instructor.isTeamLeader).to.be.true;
  });

  // 승인된 일반 사용자 수정 실패 - Invalid Status
  it('[PATCH] /users/:userId - Invalid Status (Error 400)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${commonUserId}`)
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ status: 'BANANA' });

    logResponse(res, 'Update User Invalid Status');
    expect(res.status).to.equal(400);
    expectErrorShape(res);
    expect(res.body.code).to.equal('INVALID_STATUS');
  });

  // 승인된 일반 사용자 수정 실패 - No Update Fields
  it('[PATCH] /users/:userId - No Update Fields (Error 400)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${commonUserId}`)
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({});

    logResponse(res, 'Update User No Fields');
    expect(res.status).to.equal(400);
    expectErrorShape(res);
    expect(res.body.code).to.equal('NO_UPDATE_FIELDS');
  });

  // 승인된 일반 사용자 삭제
  it('[DELETE] /users/:userId - Delete User (Success)', async () => {
    const tempUser = await prisma.user.create({
      data: { userEmail: `del_${Date.now()}@test.com`, password: 'hash', status: 'APPROVED' },
    });

    const res = await request(app)
      .delete(`/api/v1/admin/users/${tempUser.id}`)
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Delete User');
    expect(res.status).to.equal(200);
    expect(res.body.message).to.be.a('string');

    const deleted = await prisma.user.findUnique({ where: { id: tempUser.id } });
    expect(deleted).to.be.null;
  });

  // 승인된 일반 사용자 삭제 - Not Found
  it('[DELETE] /users/:userId - Not Found (Error 404)', async () => {
    const res = await request(app)
      .delete('/api/v1/admin/users/99999')
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Delete User 404');
    expect(res.status).to.equal(404);
    expectErrorShape(res);
    expect(res.body.code).to.equal('USER_NOT_FOUND');
  });

  // =================================================================
  // 🧪 3. 승인/거절 워크플로우 (단건 및 벌크)
  // =================================================================

  // 승인된 강사 승인
  it('[PATCH] /users/:userId/approve - Approve User (Success, Pending Instructor)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${pendingInstructorId}/approve`)
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Approve User (Success)');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('user');
    expectUserCleanAndCorrect(res.body.user, 'APPROVED', true);
    expect(res.body.user.instructor.category).to.equal('Assistant');

    await prisma.user.update({ where: { id: pendingInstructorId }, data: { status: 'APPROVED' } });
  });

  // 승인된 일반 사용자 승인 - Already Approved (Idempotent Success 200)
  it('[PATCH] /users/:userId/approve - Already Approved (Idempotent Success 200)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${commonUserId}/approve`)
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Approve Already Approved');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('user');
    expect(res.body.user.status).to.equal('APPROVED');
  });

  // 승인된 일반 사용자 승인 - Already Approved (Idempotent Success 200)
  it('[PATCH] /users/bulk-approve - Bulk Approve (Success)', async () => {
    const userA = await prisma.user.create({
      data: { userEmail: `p_a_${Date.now()}@test.com`, status: 'PENDING' },
    });
    const userB = await prisma.user.create({
      data: { userEmail: `p_b_${Date.now()}@test.com`, status: 'PENDING' },
    });

    const res = await request(app)
      .patch('/api/v1/admin/users/bulk-approve')
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ userIds: [userA.id, userB.id] });

    logResponse(res, 'Bulk Approve');
    expect(res.status).to.equal(200);
    expect(res.body.count).to.equal(2);
  });

  // 승인된 일반 사용자 승인 - Already Approved (Idempotent Success 200)
  it('[PATCH] /users/bulk-approve - Missing Array (Error 400)', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/users/bulk-approve')
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ userIds: 'not an array' });

    logResponse(res, 'Bulk Approve 400');
    expect(res.status).to.equal(400);
    expectErrorShape(res);
    expect(res.body.code).to.equal('INVALID_INPUT');
  });

  // 승인된 일반 사용자 승인 - Already Approved (Idempotent Success 200)
  it('[DELETE] /users/:userId/reject - Reject (Delete) User (Success)', async () => {
    const rejectUser = await prisma.user.create({
      data: { userEmail: `reject_${Date.now()}@test.com`, status: 'PENDING' },
    });

    const res = await request(app)
      .delete(`/api/v1/admin/users/${rejectUser.id}/reject`)
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Reject User');
    expect(res.status).to.equal(200);

    const deleted = await prisma.user.findUnique({ where: { id: rejectUser.id } });
    expect(deleted).to.be.null;
  });

  // 승인된 일반 사용자 승인 - Already Approved (Idempotent Success 200)
  it('[DELETE] /users/:userId/reject - Reject Approved (Error 400)', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/users/${commonUserId}/reject`)
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Reject Approved User');
    expect(res.status).to.equal(400);
    expectErrorShape(res);
    expect(res.body.code).to.equal('INVALID_STATUS');
  });

  // 승인된 일반 사용자 승인 - Already Approved (Idempotent Success 200)
  it('[DELETE] /users/bulk-reject - Bulk Reject (Success)', async () => {
    const userC = await prisma.user.create({
      data: { userEmail: `r_c_${Date.now()}@test.com`, status: 'PENDING' },
    });
    const userD = await prisma.user.create({
      data: { userEmail: ` r_d_${Date.now()}@test.com`, status: 'PENDING' },
    });

    const res = await request(app)
      .delete('/api/v1/admin/users/bulk-reject')
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ userIds: [userC.id, userD.id] });

    logResponse(res, 'Bulk Reject');
    expect(res.status).to.equal(200);
    expect(res.body.count).to.equal(2);
  });

  // 승인된 일반 사용자 승인 - Already Approved (Idempotent Success 200)
  it('[DELETE] /users/bulk-reject - Missing Array (Error 400)', async () => {
    const res = await request(app)
      .delete('/api/v1/admin/users/bulk-reject')
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ userIds: 'nope' });

    logResponse(res, 'Bulk Reject 400');
    expect(res.status).to.equal(400);
    expectErrorShape(res);
    expect(res.body.code).to.equal('INVALID_INPUT');
  });

  // =================================================================
  // 🧪 4. 관리자 권한 API (슈퍼 전용)
  // =================================================================

  // 승인된 일반 사용자 승인 - Already Approved (Idempotent Success 200)
  it('[PATCH] /users/:userId/admin - Grant Admin (Forbidden for General) (Error 403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${commonUserId}/admin`)
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ level: 'GENERAL' });

    logResponse(res, 'Grant Admin Forbidden');
    expect(res.status).to.equal(403);
    expectErrorShape(res);
    expect(res.body.code).to.equal('FORBIDDEN');
  });

  // 승인된 일반 사용자 승인 - Already Approved (Idempotent Success 200)
  it('[PATCH] /users/:userId/admin - Grant Admin (Success for Super)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${commonUserId}/admin`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ level: 'GENERAL' });

    logResponse(res, 'Grant Admin Success');
    expect(res.status).to.equal(200);
    expect(res.body.adminLevel).to.equal('GENERAL');
  });

  // 승인된 일반 사용자 승인 - Already Approved (Idempotent Success 200)
  it('[DELETE] /users/:userId/admin - Revoke Admin (Success)', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/users/${commonUserId}/admin`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    logResponse(res, 'Revoke Admin Success');
    expect(res.status).to.equal(200);

    const adminEntry = await prisma.admin.findUnique({ where: { userId: commonUserId } });
    expect(adminEntry).to.be.null;
  });

  // 승인된 일반 사용자 승인 - Already Approved (Idempotent Success 200)
  it('[PATCH] /users/:userId/admin - Invalid Level (Error 400)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${commonUserId}/admin`)
      .set('Authorization', `Bearer ${superAdminToken}  `)
      .send({ level: 'NOT_A_LEVEL' });

    logResponse(res, 'Grant Admin Invalid Level');
    expect(res.status).to.equal(400);
    expectErrorShape(res);
    expect(res.body.code).to.equal('INVALID_ADMIN_LEVEL');
  });
});
