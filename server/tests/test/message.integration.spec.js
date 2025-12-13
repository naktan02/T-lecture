const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { app, server } = require('../../src/server'); // 경로 확인 완료

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const ADMIN_EMAIL = 'msg_admin_test@test.com';
const INSTRUCTOR_EMAIL = 'msg_inst_test@test.com';

describe('Message API Integration Test (All 6 Routes)', () => {
    let adminToken, instructorToken, instructorId;
    let unitScheduleId; // 발송 테스트용
    let sentMessageId;  // 읽음 테스트용

    // ✅ [로그 헬퍼] 성공 여부와 관계없이 JSON 본문 출력
    const logResponse = (res, label) => {
        console.log(`\n📦 [${label}] ${res.req.method} ${res.req.path} (${res.status})`);
        if (res.body) {
            const prefix = res.status >= 400 ? 'Error:' : 'Response Body:';
            console.log(prefix, JSON.stringify(res.body, null, 2));
        }
        console.log('--------------------------------------------------\n');
    };

    // ✅ 1. 테스트 데이터 초기화 및 시딩
    before(async () => {
        try {
            await prisma.messageReceipt.deleteMany();      // 있다면
            await prisma.message.deleteMany();             // 있다면
            await prisma.instructorUnitAssignment.deleteMany(); // 있다면
            await prisma.instructorUnitDistance.deleteMany();   // 있다면
            await prisma.instructorAvailability.deleteMany();   // 있다면
            await prisma.instructorVirtue.deleteMany();         // 있다면
            await prisma.instructorStats.deleteMany();          // 있다면

            // 너가 이미 지우던 것들
            await prisma.unitSchedule.deleteMany();
            await prisma.unit.deleteMany();

            // ✅ 이제 부모 삭제
            await prisma.instructor.deleteMany();
            await prisma.admin.deleteMany();               // user/admin 관계 있으면
            await prisma.user.deleteMany();
            await prisma.messageTemplate.deleteMany();
            // 1-2. 템플릿 생성 (발송 테스트 필수)
            await prisma.messageTemplate.createMany({
                data: [
                    { key: 'TEMPORARY', title: '임시 배정', body: '임시: {{unitName}}' },
                    { key: 'CONFIRMED_LEADER', title: '확정 리더', body: '확정 리더: {{unitName}}' },
                    { key: 'CONFIRMED_MEMBER', title: '확정 멤버', body: '확정 멤버: {{unitName}}' }
                ]
            });
            
            // 1-3. 유저 생성
            const admin = await prisma.user.create({
                data: { userEmail: ADMIN_EMAIL, password: 'hash', name: 'Admin', status: 'APPROVED', admin: { create: { level: 'SUPER' } } }
            });
            adminToken = jwt.sign({ userId: admin.id }, JWT_SECRET);

            const inst = await prisma.user.create({
                data: { userEmail: INSTRUCTOR_EMAIL, password: 'hash', name: 'Inst', status: 'APPROVED', instructor: { create: { location: 'Seoul' } } },
                include: { instructor: true }
            });
            instructorId = inst.instructor.userId;
            instructorToken = jwt.sign({ userId: inst.id }, JWT_SECRET);
            
            // 1-4. 부대/일정 생성 (발송 테스트용)
            const unit = await prisma.unit.create({
                data: { name: '테스트부대', region: '경기', addressDetail: '경기', schedules: { create: [{ date: new Date() }] } },
                include: { schedules: true }
            });
            unitScheduleId = unit.schedules[0].id;
            
            // 1-5. 임시 배정 생성 (Pending 상태)
            await prisma.instructorUnitAssignment.create({
                data: { userId: instructorId, unitScheduleId: unitScheduleId, state: 'Pending', classification: 'Temporary' }
            });

            console.log('✅ Message Test Data Seeded');
        } catch (error) {
            console.error('❌ Seeding Failed:', error);
            throw error;
        }
    });

    after(async () => {
        if (server) server.close();
        await prisma.$disconnect();
    });

    // =================================================================
    // 🧪 1. POST /notices (공지 작성)
    // =================================================================
    
    it('[POST] /notices - Create Notice (Success, 201)', async () => {
        const res = await request(app)
            .post('/api/v1/messages/notices')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: '긴급 공지', body: '서버 점검 안내입니다.' });
        logResponse(res, 'Create Notice');
        expect(res.status).to.equal(201);
        expect(res.body.title).to.equal('긴급 공지');
    });

    it('[POST] /notices - Missing Body (Error 400)', async () => {
        const res = await request(app)
            .post('/api/v1/messages/notices')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: '제목만 있음' });
        logResponse(res, 'Create Notice Fail');
        expect(res.status).to.equal(400);
        expect(res.body.code).to.equal('VALIDATION_ERROR');
    });
    
    // =================================================================
    // 🧪 2. GET /notices (공지 조회)
    // =================================================================

    it('[GET] /notices - Get Notice List (Success)', async () => {
        const res = await request(app)
            .get('/api/v1/messages/notices')
            .set('Authorization', `Bearer ${instructorToken}`); // 강사도 조회 가능
        logResponse(res, 'Get Notices');
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.at.least(1);
    });

    // =================================================================
    // 🧪 3. POST /send/temporary (임시 배정 발송)
    // =================================================================
    
    it('[POST] /send/temporary - Send Temporary Message (Success)', async () => {
        // DB에 Pending 상태의 배정이 있으므로 발송 성공 예상
        const res = await request(app)
            .post('/api/v1/messages/send/temporary')
            .set('Authorization', `Bearer ${adminToken}`);
        logResponse(res, 'Send Temporary');
        expect(res.status).to.equal(200);
        expect(res.body.count).to.be.greaterThan(0);
        
        // 다음 테스트를 위해 배정 상태를 Accepted로 변경
        await prisma.instructorUnitAssignment.update({
            where: { unitScheduleId_userId: { userId: instructorId, unitScheduleId } },
            data: { state: 'Accepted', classification: 'Confirmed' }
        });
    });

    it('[POST] /send/temporary - No Target (Error 404)', async () => {
        // 이미 발송되었고 상태가 Accepted로 변경되어 발송 대상이 없으므로 404 예상
        const res = await request(app)
            .post('/api/v1/messages/send/temporary')
            .set('Authorization', `Bearer ${adminToken}`);
        logResponse(res, 'Send Temporary 404');
        expect(res.status).to.equal(404);
        expect(res.body.code).to.equal('NO_TARGETS');
    });

    // =================================================================
    // 🧪 4. POST /send/confirmed (확정 배정 발송)
    // =================================================================

    it('[POST] /send/confirmed - Send Confirmed Message (Success)', async () => {
        // 이전 테스트에서 Accepted로 변경되었으므로 발송 성공 예상
        const res = await request(app)
            .post('/api/v1/messages/send/confirmed')
            .set('Authorization', `Bearer ${adminToken}`);
        logResponse(res, 'Send Confirmed');
        expect(res.status).to.equal(200);
        expect(res.body.count).to.be.greaterThan(0);
    });
    
    it('[POST] /send/confirmed - No Target (Error 404)', async () => {
        // 이미 발송되어 대상이 없으므로 404 예상
        const res = await request(app)
            .post('/api/v1/messages/send/confirmed')
            .set('Authorization', `Bearer ${adminToken}`);
        logResponse(res, 'Send Confirmed 404');
        expect(res.status).to.equal(404);
        expect(res.body.code).to.equal('NO_TARGETS');
    });

    // =================================================================
    // 🧪 5. GET / (내 메시지함 조회)
    // =================================================================
    
    it('[GET] / - Get My Messages (Success)', async () => {
        // 템플릿 발송, 공지 발송 등으로 DB에 메시지가 쌓인 상태
        const res = await request(app)
            // ✅ URL 수정: /my 대신 루트('/') 사용
            .get('/api/v1/messages/') 
            .set('Authorization', `Bearer ${instructorToken}`);
        
        logResponse(res, 'Get My Messages (Success)');
        
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.at.least(2); // 공지 + 임시/확정
        
        // 읽음 테스트를 위해 메시지 ID 저장
        sentMessageId = res.body[0].messageId;
    });

    // =================================================================
    // 🧪 6. PATCH /:messageId/read (읽음 처리)
    // =================================================================

    it('[PATCH] /:id/read - Mark as Read (Success)', async () => {
        const res = await request(app)
            .patch(`/api/v1/messages/${sentMessageId}/read`)
            .set('Authorization', `Bearer ${instructorToken}`);
        
        logResponse(res, 'Read Message');
        expect(res.status).to.equal(200);
        
        // DB에서 읽음 시간 확인 가능 (간접 검증)
    });

    it('[PATCH] /:id/read - Not Found (Error 404)', async () => {
        const res = await request(app)
            .patch(`/api/v1/messages/999999/read`)
            .set('Authorization', `Bearer ${instructorToken}`);
        
        logResponse(res, 'Read Message 404');
        expect(res.status).to.equal(404);
        expect(res.body.code).to.equal('MESSAGE_NOT_FOUND');
    });
});