// server/test/instructor.spec.js
const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/server');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// 로그 헬퍼 (성공/실패 모두 출력)
const logResponse = (method, url, status, body) => {
  console.log(`\n👉 [${method}] ${url} (Status: ${status})`);
  
  // 204 (No Content)는 본문이 없으므로 제외하고, 나머지는 모두 출력
  if (status !== 204) {
    console.log('📦 Response JSON:');
    console.log(JSON.stringify(body, null, 2));
  }
  console.log('--------------------------------------------------');
};

describe('👨‍🏫 Instructor(강사) API 통합 테스트', function () {
  this.timeout(20000); // 20초 (DB 연결 및 트랜잭션 고려)

  let instructorToken;
  let testUserId;
  const TEST_EMAIL = `test_inst_${Date.now()}@test.com`;
  const TEST_PASSWORD = 'password123';

  // [사전 작업] 테스트용 강사 계정 생성 & 로그인
  before(async () => {
    // 1. 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    // 2. 강사 유저 생성 (DB 직접 삽입)
    const user = await prisma.user.create({
      data: {
        userEmail: TEST_EMAIL,
        password: hashedPassword,
        name: '테스트강사',
        userphoneNumber: '010-1234-5678',
        status: 'APPROVED', // 승인 상태여야 로그인 가능
        instructor: {
          create: {
            location: '서울시 강남구',
            profileCompleted: true,
            isTeamLeader: false
          }
        }
      }
    });
    testUserId = user.id;
    console.log(`\n✅ 테스트용 강사 생성 완료 (ID: ${testUserId})`);

    // 3. 로그인하여 토큰 발급
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    
    instructorToken = res.body.accessToken;
    console.log('🔑 강사 토큰 발급 완료');
  });

  // [사후 작업] 테스트 데이터 정리
  after(async () => {
    if (testUserId) {
      // 강사 테이블은 Cascade 설정에 따라 자동 삭제되거나, 명시적 삭제 필요
      // 여기서는 User를 지우면 연결된 데이터가 지워지도록 Prisma 스키마가 설정되어 있다고 가정하거나
      // 안전하게 트랜잭션으로 삭제
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
      console.log('🧹 테스트 계정 삭제 완료');
    }
    await prisma.$disconnect();
  });

  // ============================================================
  // 1. 근무 가능일 조회 (GET)
  // ============================================================
  it('1. [GET] /instructor/availability - 초기 근무 가능일 조회 (빈 배열 예상)', (done) => {
    request(app)
      .get('/api/v1/instructor/availability')
      .query({ year: 2025, month: 5 })
      .set('Authorization', `Bearer ${instructorToken}`)
      .expect(200)
      .end((err, res) => {
        logResponse('GET', '/api/v1/instructor/availability', res.status, res.body);
        if (err) return done(err);
        
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.equal(0); // 처음엔 없어야 함
        done();
      });
  });

  // ============================================================
  // 2. 근무 가능일 수정 (PUT)
  // ============================================================
  it('2. [PUT] /instructor/availability - 근무 가능일 등록', (done) => {
    const dates = ['2025-05-05', '2025-05-06'];
    
    request(app)
      .put('/api/v1/instructor/availability')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ year: 2025, month: 5, dates })
      .expect(200)
      .end((err, res) => {
        logResponse('PUT', '/api/v1/instructor/availability', res.status, res.body);
        if (err) return done(err);
        
        expect(res.body.message).to.include('저장');
        
        // 검증: 다시 조회해서 들어갔는지 확인
        request(app)
            .get('/api/v1/instructor/availability')
            .query({ year: 2025, month: 5 })
            .set('Authorization', `Bearer ${instructorToken}`)
            .end((e, r) => {
                expect(r.body).to.include('2025-05-05');
                expect(r.body).to.include('2025-05-06');
                done();
            });
      });
  });

  // ============================================================
  // 3. 내 통계 조회 (GET) - [신규 API]
  // ============================================================
  it('3. [GET] /instructor/stats - 내 통계 조회 (DB 연동 확인)', (done) => {
    request(app)
      .get('/api/v1/instructor/stats')
      .set('Authorization', `Bearer ${instructorToken}`)
      .expect(200)
      .end((err, res) => {
        logResponse('GET', '/api/v1/instructor/stats', res.status, res.body);
        if (err) return done(err);
        
        expect(res.body).to.have.property('assignmentCount');
        expect(res.body).to.have.property('lectureHours');
        expect(res.body.instructorId).to.equal(testUserId);
        
        // 아직 배정된 게 없으니 0이어야 정상
        expect(res.body.assignmentCount).to.equal(0);
        expect(res.body.lectureHours).to.equal(0);
        done();
      });
  });

  // ============================================================
  // 4. 강의 과목 수정 (PUT) - [신규 API]
  // ============================================================
  it('4. [PUT] /instructor/virtues - 강의 가능 과목 수정', async () => {
    // 1) 테스트용 덕목(Virtue)이 DB에 있는지 확인 후 없으면 생성
    let virtue = await prisma.virtue.findFirst();
    if (!virtue) {
        virtue = await prisma.virtue.create({ data: { name: '테스트덕목' } });
    }

    // 2) API 호출
    const res = await request(app)
      .put('/api/v1/instructor/virtues')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ virtueIds: [virtue.id] })
      .expect(200);

    logResponse('PUT', '/api/v1/instructor/virtues', res.status, res.body);
    expect(res.body.message).to.include('수정');

    // 3) DB 검증 (실제 관계 테이블에 들어갔는지)
    const check = await prisma.instructorVirtue.findFirst({
        where: { instructorId: testUserId, virtueId: virtue.id }
    });
    expect(check).to.not.be.null;
  });

  // ============================================================
  // 5. [변경] 승급 신청 (POST) - 자격 미달 테스트
  // ============================================================
  it('5. [POST] /instructor/promotion - 승급 신청 (자격 미달 시 실패 확인)', (done) => {
    // 테스트 강사는 방금 생성되어서 강의 시간이 0시간임 -> 자격 미달(400) 예상
    request(app)
      .post('/api/v1/instructor/promotion')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ desiredLevel: 'Main' })
      .expect(400) // 성공(200)이 아니라 실패(400)를 기대함 (검증 로직 작동 확인)
      .end((err, res) => {
        logResponse('POST', '/api/v1/instructor/promotion', res.status, res.body);
        if (err) return done(err);
        
        expect(res.body.error).to.include('자격이 부족합니다'); // 에러 메시지 검증
        done();
      });
  });

});