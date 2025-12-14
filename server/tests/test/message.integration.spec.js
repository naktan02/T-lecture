const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { app, server } = require('../../src/server'); 

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
            await prisma.messageReceipt.deleteMany();      
            await prisma.message.deleteMany();             
            await prisma.instructorUnitAssignment.deleteMany(); 
            await prisma.instructorUnitDistance.deleteMany();   
            await prisma.instructorAvailability.deleteMany();   
            await prisma.instructorVirtue.deleteMany();         
            await prisma.instructorStats.deleteMany();        
            await prisma.unitSchedule.deleteMany();
            await prisma.unit.deleteMany();
            await prisma.instructor.deleteMany();
            await prisma.admin.deleteMany();               
            await prisma.user.deleteMany();
            await prisma.messageTemplate.deleteMany();
            await prisma.messageTemplate.createMany({
                data: [
                    { key: 'TEMPORARY', title: '임시 배정', body: '임시: {{unitName}}' },
                    { key: 'CONFIRMED_LEADER', title: '확정 리더', body: '확정 리더: {{unitName}}' },
                    { key: 'CONFIRMED_MEMBER', title: '확정 멤버', body: '확정 멤버: {{unitName}}' }
                ]
            });
            
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
            
            const unit = await prisma.unit.create({
                data: { name: '테스트부대', region: '경기', addressDetail: '경기', schedules: { create: [{ date: new Date() }] } },
                include: { schedules: true }
            });
            unitScheduleId = unit.schedules[0].id;
            
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
    
    // 공지 발송 완료
    it('[POST] /notices - Create Notice (Success, 201)', async () => {
        const res = await request(app)
            .post('/api/v1/messages/notices')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: '긴급 공지', body: '서버 점검 안내입니다.' });
        logResponse(res, 'Create Notice');
        expect(res.status).to.equal(201);
        expect(res.body.title).to.equal('긴급 공지');
    });

    // 공지 발송 실패
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

    // 공지 조회 성공
    it('[GET] /notices - Get Notice List (Success)', async () => {
        const res = await request(app)
            .get('/api/v1/messages/notices')
            .set('Authorization', `Bearer ${instructorToken}`);
        logResponse(res, 'Get Notices');
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.at.least(1);
    });

    // =================================================================
    // 🧪 3. POST /send/temporary (임시 배정 발송)
    // =================================================================
    // 임시 배정 발송 성공
    it('[POST] /send/temporary - Send Temporary Message (Success)', async () => {
        const res = await request(app)
            .post('/api/v1/messages/send/temporary')
            .set('Authorization', `Bearer ${adminToken}`);
        logResponse(res, 'Send Temporary');
        expect(res.status).to.equal(200);
        expect(res.body.count).to.be.greaterThan(0);
        
        await prisma.instructorUnitAssignment.update({
            where: { unitScheduleId_userId: { userId: instructorId, unitScheduleId } },
            data: { state: 'Accepted', classification: 'Confirmed' }
        });
    });

    // 임시 배정 발송 실패
    it('[POST] /send/temporary - No Target (Error 404)', async () => {
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
    // 확정 배정 발송 성공
    it('[POST] /send/confirmed - Send Confirmed Message (Success)', async () => {
        const res = await request(app)
            .post('/api/v1/messages/send/confirmed')
            .set('Authorization', `Bearer ${adminToken}`);
        logResponse(res, 'Send Confirmed');
        expect(res.status).to.equal(200);
        expect(res.body.count).to.be.greaterThan(0);
    });
    
    // 확정 배정 발송 실패
    it('[POST] /send/confirmed - No Target (Error 404)', async () => {
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
    // 내 메시지함 조회 성공
    it('[GET] / - Get My Messages (Success)', async () => {
        const res = await request(app)
            .get('/api/v1/messages/') 
            .set('Authorization', `Bearer ${instructorToken}`);
        
        logResponse(res, 'Get My Messages (Success)');
        
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.be.at.least(2); 
        sentMessageId = res.body[0].messageId;
    });

    // =================================================================
    // 🧪 6. PATCH /:messageId/read (읽음 처리)
    // =================================================================
    // 읽음 처리 성공
    it('[PATCH] /:id/read - Mark as Read (Success)', async () => {
        const res = await request(app)
            .patch(`/api/v1/messages/${sentMessageId}/read`)
            .set('Authorization', `Bearer ${instructorToken}`);
        
        logResponse(res, 'Read Message');
        expect(res.status).to.equal(200);
    });

    // 읽음 처리 실패
    it('[PATCH] /:id/read - Not Found (Error 404)', async () => {
        const res = await request(app)
            .patch(`/api/v1/messages/999999/read`)
            .set('Authorization', `Bearer ${instructorToken}`);
        
        logResponse(res, 'Read Message 404');
        expect(res.status).to.equal(404);
        expect(res.body.code).to.equal('MESSAGE_NOT_FOUND');
    });
});