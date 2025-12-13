const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { app, server } = require('../../src/server'); // 경로 확인 완료

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const ADMIN_EMAIL = 'unit_admin_test@test.com';

describe('Unit API Integration Test (All Routes)', () => {
    let adminToken;
    let createdUnitId;
    let createdScheduleId;

    // ✅ [로그 헬퍼] 성공/실패 여부 상관없이 JSON 본문 출력
    const logResponse = (res, label) => {
        console.log(`\n📦 [${label}] ${res.req.method} ${res.req.path} (${res.status})`);
        if (res.body) {
            const prefix = res.status >= 400 ? 'Error:' : 'Response Body:';
            console.log(prefix, JSON.stringify(res.body, null, 2));
        } else if (res.status === 204) {
            console.log('Response Body: (204 No Content)');
        }
        console.log('--------------------------------------------------\n');
    };

    before(async () => {
        // 1. DB 정리 (FK 제약 방지 핵심 순서)
        await prisma.messageAssignment.deleteMany();
        await prisma.messageReceipt.deleteMany();
        await prisma.message.deleteMany();
        
        await prisma.instructorUnitAssignment.deleteMany();
        await prisma.instructorUnitDistance.deleteMany();
        await prisma.instructorAvailability.deleteMany();
        await prisma.instructorVirtue.deleteMany();
        await prisma.instructor.deleteMany();
        
        await prisma.unitSchedule.deleteMany();
        await prisma.trainingLocation.deleteMany();
        await prisma.unit.deleteMany();
        
        await prisma.admin.deleteMany();
        await prisma.user.deleteMany({ where: { userEmail: ADMIN_EMAIL } });

        // 2. 관리자 생성 (토큰 발급용)
        const adminUser = await prisma.user.create({
            data: {
                userEmail: ADMIN_EMAIL,
                password: 'hash',
                name: '관리자',
                status: 'APPROVED',
                admin: { create: { level: 'SUPER' } }
            }
        });
        adminToken = jwt.sign({ userId: adminUser.id }, JWT_SECRET);
        console.log('✅ Unit Test Data Seeded');
    });

    after(async () => {
        if (server) server.close();
        await prisma.$disconnect();
    });

    // =================================================================
    // 🧪 1. POST / (단건 등록) & POST /upload/excel (일괄 등록)
    // =================================================================

    it('[POST] / - Create Unit (Success, 201)', async () => {
        const res = await request(app)
            .post('/api/v1/units')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: '제1테스트부대',
                unitType: 'Army',
                region: '서울',
                trainingLocations: [
                    { originalPlace: '연병장', instructorsNumbers: 5 }
                ]
            });
        
        logResponse(res, 'Create Unit');
        expect(res.status).to.equal(201);
        createdUnitId = res.body.data.id;
    });

    it('[POST] / - Missing Name (Error 400)', async () => {
        const res = await request(app)
            .post('/api/v1/units')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ region: '서울' }); // name 누락
        
        logResponse(res, 'Create Unit Fail');
        // ✅ 수정된 Service 로직 덕분에 400이 기대됨
        expect(res.status).to.equal(400); 
    });
    
    it('[POST] /upload/excel - No File Attached (Error 400)', async () => {
        const res = await request(app)
            .post('/api/v1/units/upload/excel')
            .set('Authorization', `Bearer ${adminToken}`);
            
        logResponse(res, 'Excel Upload Fail');
        expect(res.status).to.equal(400);
        expect(res.body.error).to.include('파일이 업로드되지 않았습니다');
    });

    // =================================================================
    // 🧪 2. GET / (목록 조회) & GET /:id (상세 조회)
    // =================================================================

    it('[GET] / - Get List (Success)', async () => {
        const res = await request(app)
            .get('/api/v1/units')
            .set('Authorization', `Bearer ${adminToken}`)
            .query({ keyword: '테스트부대' });

        logResponse(res, 'Get Unit List');
        expect(res.status).to.equal(200);
        expect(res.body.data.data).to.be.an('array');
        expect(res.body.data.data.length).to.equal(1);
    });

    it('[GET] /:id - Get Detail (Success)', async () => {
        const res = await request(app)
            .get(`/api/v1/units/${createdUnitId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        logResponse(res, 'Get Unit Detail');
        expect(res.status).to.equal(200);
        expect(res.body.data.id).to.equal(createdUnitId);
    });

    it('[GET] /:id - Not Found (Error 404)', async () => {
        const res = await request(app)
            .get(`/api/v1/units/99999`)
            .set('Authorization', `Bearer ${adminToken}`);

        logResponse(res, 'Get Unit 404');
        expect(res.status).to.equal(404);
        expect(res.body.code).to.equal('UNIT_NOT_FOUND');
    });

    // =================================================================
    // 🧪 3. PATCH /:id/basic & PATCH /:id/officer (정보 수정)
    // =================================================================
    
    it('[PATCH] /:id/basic - Update Basic Info (Success)', async () => {
        const res = await request(app)
            .patch(`/api/v1/units/${createdUnitId}/basic`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ region: '부산' });

        logResponse(res, 'Update Basic Info');
        expect(res.status).to.equal(200);
        expect(res.body.data.region).to.equal('부산');
    });

    it('[PATCH] /:id/officer - Update Officer Info (Success)', async () => {
        const res = await request(app)
            .patch(`/api/v1/units/${createdUnitId}/officer`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ officerName: '김간부' });

        logResponse(res, 'Update Officer');
        expect(res.status).to.equal(200);
        expect(res.body.data.officerName).to.equal('김간부');
    });

    // =================================================================
    // 🧪 4. 하위 리소스: Schedules (일정 추가/삭제)
    // =================================================================
    
    it('[POST] /:id/schedules - Add Schedule (Success, 201)', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const res = await request(app)
            .post(`/api/v1/units/${createdUnitId}/schedules`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ date: tomorrow.toISOString() });

        logResponse(res, 'Add Schedule');
        expect(res.status).to.equal(201);
        createdScheduleId = res.body.data.id;
    });

    it('[DELETE] /:id/schedules/:scheduleId - Remove Schedule (Success)', async () => {
        const res = await request(app)
            .delete(`/api/v1/units/${createdUnitId}/schedules/${createdScheduleId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        logResponse(res, 'Remove Schedule');
        expect(res.status).to.equal(200);
    });

    // =================================================================
    // 🧪 5. DELETE /:id (부대 삭제)
    // =================================================================
    
    it('[DELETE] /:id - Delete Unit (Success, 204)', async () => {
        const res = await request(app)
            .delete(`/api/v1/units/${createdUnitId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        logResponse(res, 'Delete Unit');
        expect(res.status).to.equal(204);
        expect(res.body).to.be.empty; 
    });
});