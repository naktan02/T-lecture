const request = require('supertest');
const { expect } = require('chai');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { app, server } = require('../../src/server');

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';

// ⚠️ auth 라우터 mount가 다르면 여기만 수정
const BASE = '/api/v1/auth';

describe('Auth API Integration Test (Full Coverage, No Sinon)', () => {
  const agent = request.agent(app);

  // 테스트용 계정들
  const EMAIL_OK = 'auth_ok@test.com';
  const EMAIL_DUP = 'auth_dup@test.com';
  const EMAIL_RESET = 'auth_reset@test.com';

  // 외부 의존(메일 발송) 막기용
  let emailService;
  let originalSendVerificationCode;

  // 로그인 후 토큰/쿠키 검증용
  let approvedUserId;
  let approvedAccessToken;

  // ✅ 성공/에러 모두 JSON 출력
  const logResponse = (res, label) => {
    console.log(`\n📦 [${label}] ${res.req.method} ${res.req.path} (${res.status})`);
    if (res.body) {
      const prefix = res.status >= 400 ? 'Error:' : 'Response Body:';
      console.log(prefix, JSON.stringify(res.body, null, 2));
    }
    const setCookie = res.headers?.['set-cookie'];
    if (setCookie) console.log('Set-Cookie:', setCookie);
    console.log('--------------------------------------------------\n');
  };

  const expectErrorShape = (res) => {
    expect(res.status).to.be.at.least(400);
    expect(res.body).to.be.an('object');
    expect(res.body.error || res.body.message || res.body.code).to.exist;
  };

  before(async () => {
    // ✅ 0) 이메일 발송 함수 "직접" 덮어쓰기 (sinon 필요 없음)
    // 경로가 프로젝트마다 다를 수 있음: 너가 쓰는 emailService 실제 경로로 맞춰줘
    emailService = require('../../src/infra/email.service');
    originalSendVerificationCode = emailService.sendVerificationCode;
    emailService.sendVerificationCode = async () => true; // ✅ no-op

    // ✅ 1) DB 정리 (FK 안전하게)
    await prisma.emailVerification.deleteMany({
      where: { email: { in: [EMAIL_OK, EMAIL_DUP, EMAIL_RESET] } },
    });

    // refreshToken 테이블이 있으면 정리 (전체 삭제 OK)
    if (prisma.refreshToken) await prisma.refreshToken.deleteMany().catch(() => {});

    // 혹시 남아있으면 FK 때문에 user 삭제가 막힐 수 있는 것들 방어
    if (prisma.instructorVirtue) await prisma.instructorVirtue.deleteMany().catch(() => {});
    if (prisma.instructorAvailability) await prisma.instructorAvailability.deleteMany().catch(() => {});
    if (prisma.instructorStats) await prisma.instructorStats.deleteMany().catch(() => {});
    if (prisma.instructor) await prisma.instructor.deleteMany().catch(() => {});
    if (prisma.admin) await prisma.admin.deleteMany().catch(() => {});

    await prisma.user.deleteMany({
      where: { userEmail: { in: [EMAIL_OK, EMAIL_DUP, EMAIL_RESET] } },
    });

    // ✅ 2) 로그인 테스트용 APPROVED 유저 seed
    const hashed = await bcrypt.hash('pw1234!', 10);

    const u = await prisma.user.create({
      data: {
        userEmail: EMAIL_OK,
        password: hashed,
        name: '승인유저',
        userphoneNumber: '010-1111-1111',
        status: 'APPROVED',
      },
    });
    approvedUserId = u.id;

    // ✅ 3) 중복 이메일 유저
    await prisma.user.create({
      data: {
        userEmail: EMAIL_DUP,
        password: hashed,
        name: '중복유저',
        userphoneNumber: '010-2222-2222',
        status: 'APPROVED',
      },
    });

    // ✅ 4) 비번 재설정 유저
    await prisma.user.create({
      data: {
        userEmail: EMAIL_RESET,
        password: await bcrypt.hash('oldpw!', 10),
        name: '리셋유저',
        userphoneNumber: '010-3333-3333',
        status: 'APPROVED',
      },
    });
  });

  after(async () => {
    // ✅ 덮어쓴 함수 원복
    if (emailService && originalSendVerificationCode) {
      emailService.sendVerificationCode = originalSendVerificationCode;
    }
    server.close();
    await prisma.$disconnect();
  });

  // =========================================================
  // 1) 인증코드 발송/검증
  // =========================================================
  it('[POST] /code/send - Success (200)', async () => {
    const res = await agent.post(`${BASE}/code/send`).send({ email: EMAIL_OK });

    logResponse(res, 'Send Code Success');
    expect(res.status).to.equal(200);

    const latest = await prisma.emailVerification.findFirst({
      where: { email: EMAIL_OK },
      orderBy: { createdAt: 'desc' },
    });
    expect(latest).to.exist;
  });

  it('[POST] /code/send - Missing email (400)', async () => {
    const res = await agent.post(`${BASE}/code/send`).send({});
    logResponse(res, 'Send Code Missing Email');
    expect(res.status).to.equal(400);
    expectErrorShape(res);
  });

  it('[POST] /code/verify - Success (200)', async () => {
    await prisma.emailVerification.create({
      data: {
        email: EMAIL_OK,
        code: '123456',
        expiresAt: new Date(Date.now() + 3 * 60 * 1000),
        isVerified: false,
      },
    });

    const res = await agent
      .post(`${BASE}/code/verify`)
      .send({ email: EMAIL_OK, code: '123456' });

    logResponse(res, 'Verify Code Success');
    expect(res.status).to.equal(200);
  });

  it('[POST] /code/verify - Wrong code (400)', async () => {
    await prisma.emailVerification.create({
      data: {
        email: EMAIL_OK,
        code: '999999',
        expiresAt: new Date(Date.now() + 3 * 60 * 1000),
        isVerified: false,
      },
    });

    const res = await agent
      .post(`${BASE}/code/verify`)
      .send({ email: EMAIL_OK, code: '000000' });

    logResponse(res, 'Verify Code Wrong');
    expect(res.status).to.equal(400);
    expectErrorShape(res);
  });

  // =========================================================
  // 2) 회원가입
  // =========================================================
  it('[POST] /register - Email not verified (400)', async () => {
    const res = await agent.post(`${BASE}/register`).send({
      email: 'new_user@test.com',
      password: 'pw1234!',
      name: '신규유저',
      phoneNumber: '010-0000-0000',
      type: 'USER',
    });

    logResponse(res, 'Register Not Verified');
    expect(res.status).to.equal(400);
    expectErrorShape(res);
  });

  it('[POST] /register - Duplicate email (400/409)', async () => {
    await prisma.emailVerification.create({
      data: {
        email: EMAIL_DUP,
        code: '111111',
        expiresAt: new Date(Date.now() + 3 * 60 * 1000),
        isVerified: true,
      },
    });

    const res = await agent.post(`${BASE}/register`).send({
      email: EMAIL_DUP,
      password: 'pw1234!',
      name: '중복가입',
      phoneNumber: '010-9999-9999',
      type: 'USER',
    });

    logResponse(res, 'Register Duplicate');
    expect([400, 409]).to.include(res.status);
    expectErrorShape(res);
  });

  it('[POST] /register - Success (201)', async () => {
    const newEmail = 'new_ok@test.com';

    await prisma.emailVerification.create({
      data: {
        email: newEmail,
        code: '222222',
        expiresAt: new Date(Date.now() + 3 * 60 * 1000),
        isVerified: true,
      },
    });

    const res = await agent.post(`${BASE}/register`).send({
      email: newEmail,
      password: 'pw1234!',
      name: '가입유저',
      phoneNumber: '010-1212-1212',
      type: 'USER',
    });

    logResponse(res, 'Register Success');
    expect(res.status).to.equal(201);
    expect(res.body).to.be.an('object');

    // cleanup
    await prisma.user.deleteMany({ where: { userEmail: newEmail } });
    await prisma.emailVerification.deleteMany({ where: { email: newEmail } });
  });

  // =========================================================
  // 3) 로그인 / 리프레시 / 로그아웃
  // =========================================================
  it('[POST] /login - Missing email/password (400)', async () => {
    const res = await agent.post(`${BASE}/login`).send({ email: EMAIL_OK });
    logResponse(res, 'Login Missing Password');
    expect(res.status).to.equal(400);
    expectErrorShape(res);
  });

  it('[POST] /login - Wrong password (401/400)', async () => {
    const res = await agent.post(`${BASE}/login`).send({
      email: EMAIL_OK,
      password: 'wrongpw',
      loginType: 'USER',
      deviceId: 'dev-1',
    });

    logResponse(res, 'Login Wrong Password');
    expect([401, 400]).to.include(res.status);
    expectErrorShape(res);
  });

  it('[POST] /login - Success (200) + sets refreshToken cookie', async () => {
    const res = await agent.post(`${BASE}/login`).send({
      email: EMAIL_OK,
      password: 'pw1234!',
      loginType: 'USER',
      deviceId: 'dev-1',
    });

    logResponse(res, 'Login Success');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('accessToken');
    expect(res.body).to.have.property('user');

    approvedAccessToken = res.body.accessToken;

    const setCookie = res.headers['set-cookie'] || [];
    expect(setCookie.join(' ')).to.include('refreshToken=');

    // (선택) refresh 토큰이 jwt 형식인지 확인
    const cookieLine = setCookie.find((c) => c.startsWith('refreshToken='));
    if (cookieLine) {
      const refreshToken = cookieLine.split(';')[0].split('=')[1];
      const payload = jwt.verify(refreshToken, REFRESH_SECRET);
      expect(payload.userId).to.equal(approvedUserId);
    }
  });

  it('[POST] /refresh - Missing cookie (401)', async () => {
    const res = await request(app).post(`${BASE}/refresh`).send({});
    logResponse(res, 'Refresh Missing Cookie');
    expect(res.status).to.equal(401);
    expectErrorShape(res);
  });

  it('[POST] /refresh - Success (200)', async () => {
    const res = await agent.post(`${BASE}/refresh`).send({});
    logResponse(res, 'Refresh Success');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('accessToken');
  });

  it('[POST] /logout - No Token (401)', async () => {
    const res = await request(app).post(`${BASE}/logout`).send({});
    logResponse(res, 'Logout No Token');
    expect(res.status).to.equal(401);
    expectErrorShape(res);
  });

  it('[POST] /logout - Success (200) clears cookie', async () => {
    const res = await agent
      .post(`${BASE}/logout`)
      .set('Authorization', `Bearer ${approvedAccessToken}`)
      .send({ deviceId: 'dev-1' });

    logResponse(res, 'Logout Success');
    expect(res.status).to.equal(200);

    const setCookie = res.headers['set-cookie'] || [];
    expect(setCookie.join(' ')).to.include('refreshToken=');
  });

  // =========================================================
  // 4) 비밀번호 재설정
  // =========================================================
  it('[POST] /reset-password - Missing fields (400)', async () => {
    const res = await request(app).post(`${BASE}/reset-password`).send({
      email: EMAIL_RESET,
      code: '123456',
      // newPassword 누락
    });

    logResponse(res, 'Reset Password Missing Fields');
    expect(res.status).to.equal(400);
    expectErrorShape(res);
  });

  it('[POST] /reset-password - Success (200) then login with new password', async () => {
    await prisma.emailVerification.create({
      data: {
        email: EMAIL_RESET,
        code: '777777',
        expiresAt: new Date(Date.now() + 3 * 60 * 1000),
        isVerified: false,
      },
    });

    const res = await request(app).post(`${BASE}/reset-password`).send({
      email: EMAIL_RESET,
      code: '777777',
      newPassword: 'newpw!!',
    });

    logResponse(res, 'Reset Password Success');
    expect(res.status).to.equal(200);

    const loginRes = await request(app).post(`${BASE}/login`).send({
      email: EMAIL_RESET,
      password: 'newpw!!',
      loginType: 'USER',
      deviceId: 'dev-reset',
    });

    logResponse(loginRes, 'Login After Reset');
    expect(loginRes.status).to.equal(200);
    expect(loginRes.body).to.have.property('accessToken');
  });
});
