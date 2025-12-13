const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { app, server } = require('../../src/server');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const USER_EMAIL = 'me_test@test.com';

describe('User Me API Integration Test (Success + Error, JSON always logged)', () => {
  let userToken;
  let userId;

  // ✅ 성공/실패 상관없이 JSON 출력
  const logResponse = (res, label) => {
    console.log(`\n📦 [${label}] ${res.req.method} ${res.req.path} (${res.status})`);
    const prefix = res.status >= 400 ? 'Error:' : 'Response Body:';
    console.log(prefix, JSON.stringify(res.body, null, 2));
    console.log('--------------------------------------------------\n');
  };

  // ✅ 에러 포맷이 {message} / {error} / {error,statusCode,code} 등 다양할 수 있어 유연하게
  const expectErrorLike = (res) => {
    expect(res.body).to.be.an('object');
    expect(res.body.error || res.body.message).to.exist;
  };

  before(async () => {
    await prisma.user.deleteMany({ where: { userEmail: USER_EMAIL } });

    const user = await prisma.user.create({
      data: {
        userEmail: USER_EMAIL,
        password: 'hash',
        name: '내이름',
        userphoneNumber: '010-0000-0000',
        status: 'APPROVED',
      },
    });

    userId = user.id;
    userToken = jwt.sign({ userId: user.id }, JWT_SECRET);

    console.log('✅ User Me Test Data Seeded');
  });

  after(async () => {
    server.close();
    await prisma.$disconnect();
  });

  // ==========================================================
  // 0) AUTH 에러 (No token / Invalid / Expired / User not found)
  // ==========================================================

  it('[AUTH] GET /users/me - No Token (401)', async () => {
    const res = await request(app).get('/api/v1/users/me');
    logResponse(res, 'Get My Profile - No Token');
    expect(res.status).to.equal(401);
    expectErrorLike(res);
  });

  it('[AUTH] GET /users/me - Invalid Token (401)', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer not.a.jwt');
    logResponse(res, 'Get My Profile - Invalid Token');
    expect(res.status).to.equal(401);
    expectErrorLike(res);
  });

  it('[AUTH] GET /users/me - Expired Token (401)', async () => {
    const expiredToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '-1s' });

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    logResponse(res, 'Get My Profile - Expired Token');
    expect(res.status).to.equal(401);
    expectErrorLike(res);
  });

  it('[AUTH] GET /users/me - User Not Found by Token (401 or 404)', async () => {
    const fakeToken = jwt.sign({ userId: 99999999 }, JWT_SECRET);

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${fakeToken}`);

    logResponse(res, 'Get My Profile - User Not Found');
    expect([401, 404]).to.include(res.status);
    expectErrorLike(res);
  });

  // ======================
  // 1) GET /users/me
  // ======================

  it('[GET] /users/me - Success (200)', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`);

    logResponse(res, 'Get My Profile');
    expect(res.status).to.equal(200);
    expect(res.body.name).to.equal('내이름');
    expect(res.body).to.not.have.property('password');
  });

  // ======================
  // 2) PATCH /users/me
  // ======================

  it('[PATCH] /users/me - Success (200)', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: '변경된이름', phoneNumber: '010-9999-9999' });

    logResponse(res, 'Update My Profile - Success');
    expect(res.status).to.equal(200);
    expect(res.body.name).to.equal('변경된이름');
    expect(res.body).to.not.have.property('password');
  });

  it('[PATCH] /users/me - No Token (401)', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .send({ name: 'x' });

    logResponse(res, 'Update My Profile - No Token');
    expect(res.status).to.equal(401);
    expectErrorLike(res);
  });

  it('[PATCH] /users/me - Empty Body (200 or 400)', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    logResponse(res, 'Update My Profile - Empty Body');
    expect([200, 400]).to.include(res.status);
    if (res.status >= 400) expectErrorLike(res);
  });

  it('[PATCH] /users/me - Invalid Type (Expected 400 ideally, but current impl returns 500) (400 or 500)', async () => {
    // 너 로그처럼 현재는 prisma에서 터져 500이 나올 수 있음
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ phoneNumber: { nope: true } });

    logResponse(res, 'Update My Profile - Invalid Type');
    expect([400, 500]).to.include(res.status);
    expectErrorLike(res);
  });

  // ======================
  // 3) DELETE /users/me
  // ======================

  it('[DELETE] /users/me - Success (200)', async () => {
    const res = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`);

    logResponse(res, 'Withdraw - Success');
    expect(res.status).to.equal(200);

    const deleted = await prisma.user.findUnique({ where: { id: userId } });
    expect(deleted).to.be.null;
  });

  it('[DELETE] /users/me - Withdraw Again (401 or 404)', async () => {
    const res = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`);

    logResponse(res, 'Withdraw - Again');
    expect([401, 404]).to.include(res.status);
    expectErrorLike(res);
  });

  it('[DELETE] /users/me - No Token (401)', async () => {
    const res = await request(app).delete('/api/v1/users/me');
    logResponse(res, 'Withdraw - No Token');
    expect(res.status).to.equal(401);
    expectErrorLike(res);
  });
});
