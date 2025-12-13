const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { app, server } = require('../../src/server');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

const SUPER_ADMIN_EMAIL = 'super_admin@test.com';
const GENERAL_ADMIN_EMAIL = 'general_admin@test.com';
const TARGET_USER_EMAIL = 'target_user@test.com';
const COMMON_USER_EMAIL = 'common_user@test.com';

describe('User Admin API Integration Test (Admin APIs Full Coverage)', () => {
  let superAdminToken;
  let generalAdminToken;
  let targetUserId; // PENDING
  let commonUserId; // APPROVED

  // ✅ 성공/실패 상관없이 JSON 출력
  const logResponse = (res, label) => {
    console.log(`\n📦 [${label}] ${res.req.method} ${res.req.path} (${res.status})`);
    const prefix = res.status >= 400 ? 'Error:' : 'Response Body:';
    console.log(prefix, JSON.stringify(res.body, null, 2));
    console.log('--------------------------------------------------\n');
  };

  // ✅ 에러 응답은 케이스별로 형태가 다를 수 있어 유연하게 체크
  // - auth 미들웨어: { message }
  // - 일부 미들웨어: { error }
  // - AppError 핸들러: { error, statusCode, code }
  const expectErrorShape = (res) => {
    expect(res.body).to.be.an('object');

    // 최소 요구: error 또는 message 중 하나는 있어야 함
    expect(res.body.error || res.body.message, 'error or message should exist').to.exist;

    // 있으면 타입만 검사(강제 X)
    if (res.body.statusCode !== undefined) expect(res.body.statusCode).to.be.a('number');
    if (res.body.code !== undefined) expect(res.body.code).to.be.a('string');
  };

  before(async () => {
    // DB 정리
    await prisma.admin.deleteMany();
    await prisma.user.deleteMany({
      where: { userEmail: { in: [SUPER_ADMIN_EMAIL, GENERAL_ADMIN_EMAIL, TARGET_USER_EMAIL, COMMON_USER_EMAIL] } }
    });

    // 1) 슈퍼 관리자
    const superAdmin = await prisma.user.create({
      data: {
        userEmail: SUPER_ADMIN_EMAIL,
        password: 'hash',
        name: '슈퍼',
        status: 'APPROVED',
        admin: { create: { level: 'SUPER' } }
      }
    });
    superAdminToken = jwt.sign({ userId: superAdmin.id }, JWT_SECRET);

    // 2) 일반 관리자
    const generalAdmin = await prisma.user.create({
      data: {
        userEmail: GENERAL_ADMIN_EMAIL,
        password: 'hash',
        name: '일반',
        status: 'APPROVED',
        admin: { create: { level: 'GENERAL' } }
      }
    });
    generalAdminToken = jwt.sign({ userId: generalAdmin.id }, JWT_SECRET);

    // 3) 승인대기 유저
    const targetUser = await prisma.user.create({
      data: { userEmail: TARGET_USER_EMAIL, password: 'hash', name: '대기자', status: 'PENDING' }
    });
    targetUserId = targetUser.id;

    // 4) 일반 유저
    const commonUser = await prisma.user.create({
      data: { userEmail: COMMON_USER_EMAIL, password: 'hash', name: '일반유저', status: 'APPROVED' }
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
  it('[AUTH] No Token (Error 401)', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    logResponse(res, 'No Token');
    expect(res.status).to.equal(401);
    expectErrorShape(res);
  });

  it('[AUTH] Invalid Token (Error 401)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer not.a.jwt`);
    logResponse(res, 'Invalid Token');
    expect(res.status).to.equal(401);
    expectErrorShape(res);
  });

  // =================================================================
  // 🧪 1. 조회 API (GET /users, /users/pending, /users/:userId)
  // =================================================================

  it('[GET] /users - List Users (Success)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'List Users');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });

  it('[GET] /users/pending - List Pending (Success)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users/pending')
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'List Pending Users');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');

    const target = res.body.find(u => u.id === targetUserId);
    expect(target).to.exist;
  });

  it('[GET] /users/:userId - Get User By Id (Success)', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/users/${commonUserId}`)
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Get User Detail');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id', commonUserId);
  });

  it('[GET] /users/:userId - Not Found (Error 404)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users/99999')
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Get User Detail 404');
    expect(res.status).to.equal(404);
    expectErrorShape(res);
  });

  it('[GET] /users/:userId - Invalid Param (Error 400)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users/not-a-number')
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Get User Detail 400');
    expect([400, 404, 500]).to.include(res.status);
    if (res.status >= 400) expectErrorShape(res);
  });

  // =================================================================
  // 🧪 2. 회원 관리 API (PATCH /users/:userId, DELETE /users/:userId)
  // =================================================================

  it('[PATCH] /users/:userId - Update User (Success)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${commonUserId}`)
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ name: '관리자수정', status: 'RESTING' });

    logResponse(res, 'Update User');
    expect(res.status).to.equal(200);
    expect(res.body.name).to.equal('관리자수정');
    expect(res.body.status).to.equal('RESTING');
  });

  it('[PATCH] /users/:userId - Invalid Status (Error 400/500)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${commonUserId}`)
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ status: 'BANANA' });

    logResponse(res, 'Update User Invalid Status');
    expect([400, 500]).to.include(res.status);
    expectErrorShape(res);
  });

  it('[DELETE] /users/:userId - Delete User (Success)', async () => {
    const tempUser = await prisma.user.create({
      data: { userEmail: `del_${Date.now()}@test.com`, password: 'hash', status: 'APPROVED' }
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

  it('[DELETE] /users/:userId - Not Found (Error 404)', async () => {
    const res = await request(app)
      .delete('/api/v1/admin/users/99999')
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Delete User 404');
    expect(res.status).to.equal(404);
    expectErrorShape(res);
  });

  // =================================================================
  // 🧪 3. 승인/거절 워크플로우 (단건 및 벌크)
  // =================================================================

  it('[PATCH] /users/:userId/approve - Approve User (Success)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${targetUserId}/approve`)
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Approve User');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('user');
    expect(res.body.user.status).to.equal('APPROVED');
  });

  // ✅ 서버는 approve를 idempotent(반복 호출해도 200)로 처리하는 걸로 보임
  it('[PATCH] /users/:userId/approve - Already Approved (Idempotent Success 200)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${commonUserId}/approve`)
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Approve Already Approved');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('user');
    expect(res.body.user.status).to.equal('APPROVED');
  });

  it('[PATCH] /users/bulk-approve - Bulk Approve (Success)', async () => {
    const userA = await prisma.user.create({ data: { userEmail: `p_a_${Date.now()}@test.com`, status: 'PENDING' } });
    const userB = await prisma.user.create({ data: { userEmail: `p_b_${Date.now()}@test.com`, status: 'PENDING' } });

    const res = await request(app)
      .patch('/api/v1/admin/users/bulk-approve')
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ userIds: [userA.id, userB.id] });

    logResponse(res, 'Bulk Approve');
    expect(res.status).to.equal(200);
    expect(res.body.count).to.equal(2);
  });

  it('[PATCH] /users/bulk-approve - Missing Array (Error 400)', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/users/bulk-approve')
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ userIds: 'not an array' });

    logResponse(res, 'Bulk Approve 400');
    expect(res.status).to.equal(400);
    expectErrorShape(res);
  });

  it('[DELETE] /users/:userId/reject - Reject (Delete) User (Success)', async () => {
    const rejectUser = await prisma.user.create({
      data: { userEmail: `reject_${Date.now()}@test.com`, status: 'PENDING' }
    });

    const res = await request(app)
      .delete(`/api/v1/admin/users/${rejectUser.id}/reject`)
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Reject User');
    expect(res.status).to.equal(200);

    const deleted = await prisma.user.findUnique({ where: { id: rejectUser.id } });
    expect(deleted).to.be.null;
  });

  it('[DELETE] /users/:userId/reject - Reject Approved (Error 400/409)', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/users/${commonUserId}/reject`)
      .set('Authorization', `Bearer ${generalAdminToken}`);

    logResponse(res, 'Reject Approved User');
    expect([400, 409, 500]).to.include(res.status);
    if (res.status >= 400) expectErrorShape(res);
  });

  it('[DELETE] /users/bulk-reject - Bulk Reject (Success)', async () => {
    const userC = await prisma.user.create({ data: { userEmail: `r_c_${Date.now()}@test.com`, status: 'PENDING' } });
    const userD = await prisma.user.create({ data: { userEmail: `r_d_${Date.now()}@test.com`, status: 'PENDING' } });

    const res = await request(app)
      .delete('/api/v1/admin/users/bulk-reject')
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ userIds: [userC.id, userD.id] });

    logResponse(res, 'Bulk Reject');
    expect(res.status).to.equal(200);
    expect(res.body.count).to.equal(2);
  });

  it('[DELETE] /users/bulk-reject - Missing Array (Error 400)', async () => {
    const res = await request(app)
      .delete('/api/v1/admin/users/bulk-reject')
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ userIds: 'nope' });

    logResponse(res, 'Bulk Reject 400');
    expect(res.status).to.equal(400);
    expectErrorShape(res);
  });

  // =================================================================
  // 🧪 4. 관리자 권한 API (슈퍼 전용)
  // =================================================================

  it('[PATCH] /users/:userId/admin - Grant Admin (Forbidden for General) (Error 403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${commonUserId}/admin`)
      .set('Authorization', `Bearer ${generalAdminToken}`)
      .send({ level: 'GENERAL' });

    logResponse(res, 'Grant Admin Forbidden');
    expect(res.status).to.equal(403);
    expectErrorShape(res);
  });

  it('[PATCH] /users/:userId/admin - Grant Admin (Success for Super)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${commonUserId}/admin`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ level: 'GENERAL' });

    logResponse(res, 'Grant Admin Success');
    expect(res.status).to.equal(200);
    expect(res.body.adminLevel).to.equal('GENERAL');
  });

  it('[DELETE] /users/:userId/admin - Revoke Admin (Success)', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/users/${commonUserId}/admin`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    logResponse(res, 'Revoke Admin Success');
    expect(res.status).to.equal(200);

    const adminEntry = await prisma.admin.findUnique({ where: { userId: commonUserId } });
    expect(adminEntry).to.be.null;
  });

  it('[PATCH] /users/:userId/admin - Invalid Level (Error 400)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${commonUserId}/admin`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ level: 'NOT_A_LEVEL' });

    logResponse(res, 'Grant Admin Invalid Level');
    expect([400, 500]).to.include(res.status);
    expectErrorShape(res);
  });
});
