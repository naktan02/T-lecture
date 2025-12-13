const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { app, server } = require('../../src/server');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const ADMIN_EMAIL = 'assign_admin@test.com';
const INSTRUCTOR_EMAIL = 'assign_inst@test.com';

describe('Assignment API Integration Test', () => {
    let adminToken, instructorToken, instructorId, unitScheduleId;
    let pastScheduleId; // 이력 테스트용 과거 스케줄 ID
    
    // 날짜 설정
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    
    const startDateStr = yesterday.toISOString().split('T')[0]; // 필터링 시작일 (어제)
    const endDateStr = new Date(new Date().setDate(tomorrow.getDate() + 1)).toISOString().split('T')[0]; // 필터링 종료일 (모레)
    
    // ✅ 수정된 logResponse: 성공 여부와 관계없이 JSON 본문 출력
    const logResponse = (res, label) => {
        console.log(`\n📦 [${label}] ${res.req.method} ${res.req.path} (${res.status})`);
        if (res.body) {
            const prefix = res.status >= 400 ? 'Error:' : 'Response Body:';
            console.log(prefix, JSON.stringify(res.body, null, 2));
        }
        console.log('--------------------------------------------------\n');
    };

    before(async () => {
        // 1. DB 정리 (FK 제약 방지 핵심)
        await prisma.messageAssignment.deleteMany();
        await prisma.messageReceipt.deleteMany();
        await prisma.message.deleteMany();
        
        await prisma.instructorUnitAssignment.deleteMany();
        await prisma.instructorUnitDistance.deleteMany();
        await prisma.instructorAvailability.deleteMany();
        await prisma.unitSchedule.deleteMany();
        await prisma.unit.deleteMany();
        await prisma.instructor.deleteMany();
        await prisma.user.deleteMany({ where: { userEmail: { in: [ADMIN_EMAIL, INSTRUCTOR_EMAIL] } } });
        
        // 2. 데이터 시딩
        const adminUser = await prisma.user.create({
            data: { userEmail: ADMIN_EMAIL, password: 'hash', name: 'Admin', status: 'APPROVED', admin: { create: { level: 'SUPER' } } }
        });
        adminToken = jwt.sign({ userId: adminUser.id }, JWT_SECRET);

        const instUser = await prisma.user.create({
            data: { 
                userEmail: INSTRUCTOR_EMAIL, password: 'hash', name: 'Inst', status: 'APPROVED', 
                instructor: { 
                    create: { 
                        location: 'Seoul',
                        // 내일 근무 가능일 설정
                        availabilities: { create: [{ availableOn: tomorrow }] } 
                    } 
                } 
            },
            include: { instructor: true }
        });
        instructorId = instUser.instructor.userId;
        instructorToken = jwt.sign({ userId: instUser.id }, JWT_SECRET);

        // [현재/미래] 배정 테스트용 데이터
        const unit = await prisma.unit.create({
            data: {
                name: 'UnitFuture', region: 'Seoul', addressDetail: 'Addr',
                trainingLocations: { create: [{ originalPlace: 'Loc1', instructorsNumbers: 1 }] },
                schedules: { create: [{ date: tomorrow }] } // 내일 스케줄
            },
            include: { schedules: true }
        });
        unitScheduleId = unit.schedules[0].id;
        
        // [과거] 이력 테스트용 데이터 (어제 날짜)
        const pastUnit = await prisma.unit.create({
            data: {
                name: 'UnitPast', region: 'Busan', addressDetail: 'Addr',
                schedules: { create: [{ date: yesterday }] }
            },
            include: { schedules: true }
        });
        pastScheduleId = pastUnit.schedules[0].id;
        
        // 과거 배정 생성 및 Accepted 처리 (이력에 포함되어야 함)
        await prisma.instructorUnitAssignment.create({
            data: { userId: instructorId, unitScheduleId: pastScheduleId, state: 'Accepted', classification: 'Confirmed' }
        });

        // 거리 정보 (필수)
        await prisma.instructorUnitDistance.create({
            data: { userId: instructorId, unitId: unit.id, distance: 10, duration: 60 }
        });
        
        console.log('✅ Assignment Test Data Seeded');
    });

    after(async () => {
        server.close();
        await prisma.$disconnect();
    });

    // =================================================================
    // 🧪 API 1, 2, 5: 자동 배정 및 응답 (기존 테스트)
    // =================================================================
    
    it('[POST] /auto-assign - Run Algorithm (Success)', async () => {
        const res = await request(app)
            .post('/api/v1/assignments/auto-assign')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ startDate: startDateStr, endDate: endDateStr });
            
        logResponse(res, 'Auto Assign'); // ✅ 로그 출력
        expect(res.status).to.equal(200);
        expect(res.body.summary.created).to.be.greaterThan(0);
    });

    it('[GET] / - Check My Assignment (Success)', async () => {
        const res = await request(app)
            .get('/api/v1/assignments/')
            .set('Authorization', `Bearer ${instructorToken}`);
            
        logResponse(res, 'Check My Assignment'); // ✅ 로그 출력
        expect(res.status).to.equal(200);
        expect(res.body.find(a => a.unitScheduleId === unitScheduleId)).to.exist;
    });

    it('[POST] /:id/response - Accept Assignment (Success)', async () => {
        const res = await request(app)
            .post(`/api/v1/assignments/${unitScheduleId}/response`)
            .set('Authorization', `Bearer ${instructorToken}`)
            .send({ response: 'ACCEPT' });
            
        logResponse(res, 'Respond Accept'); // ✅ 로그 출력
        expect(res.status).to.equal(200);
    });

    it('[POST] /auto-assign - Invalid Dates (Error 400)', async () => {
        const res = await request(app)
            .post('/api/v1/assignments/auto-assign')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ startDate: endDateStr, endDate: startDateStr }); // 시작 > 종료
            
        logResponse(res, 'Auto Assign Invalid Date'); // 에러 로그 출력
        expect(res.status).to.equal(400);
    });

    it('[POST] /response - Already Accepted (Error 409)', async () => {
        const res = await request(app)
            .post(`/api/v1/assignments/${unitScheduleId}/response`)
            .set('Authorization', `Bearer ${instructorToken}`)
            .send({ response: 'MAYBE' });
            
        logResponse(res, 'Respond Already Accepted (409)'); // 에러 로그 출력
        expect(res.status).to.equal(409); 
    });
    
    // =================================================================
    // 🧪 API 3: /history (근무 이력 조회)
    // =================================================================

    it('[GET] /history - Get Work History (Success)', async () => {
        const res = await request(app)
            .get('/api/v1/assignments/history')
            .set('Authorization', `Bearer ${instructorToken}`);
            
        logResponse(res, 'Get Work History'); // ✅ 로그 출력
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
        // 과거 배정(pastScheduleId)이 이력에 포함되었는지 확인
        expect(res.body.find(a => a.unitScheduleId === pastScheduleId)).to.exist;
    });
    
    // =================================================================
    // 🧪 API 4: /candidates (배정 후보 조회)
    // =================================================================
    
    it('[GET] /candidates - Get Candidates (Success)', async () => {
        const res = await request(app)
            .get('/api/v1/assignments/candidates')
            .set('Authorization', `Bearer ${adminToken}`)
            .query({ startDate: startDateStr, endDate: endDateStr });
            
        logResponse(res, 'Get Candidates'); // ✅ 로그 출력
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('unassignedUnits');
        expect(res.body).to.have.property('availableInstructors');
    });
    
    it('[GET] /candidates - Missing Date (Error 400)', async () => {
        const res = await request(app)
            .get('/api/v1/assignments/candidates')
            .set('Authorization', `Bearer ${adminToken}`)
            .query({ startDate: startDateStr }); // endDate 누락
            
        logResponse(res, 'Get Candidates 400'); // 에러 로그 출력
        expect(res.status).to.equal(400);
        expect(res.body.error).to.include('조회 기간이 필요합니다');
    });

    // =================================================================
    // 🧪 API 6: /:unitScheduleId/cancel (배정 취소)
    // =================================================================
    
    it('[PATCH] /:unitScheduleId/cancel - Admin Cancel (Success)', async () => {
        // 취소할 대상: 미래 배정 (unitScheduleId)
        const res = await request(app)
            .patch(`/api/v1/assignments/${unitScheduleId}/cancel`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ instructorId: instructorId });
            
        logResponse(res, 'Admin Cancel Success'); // ✅ 로그 출력
        expect(res.status).to.equal(200);
        
        // DB에서 상태가 'Canceled'인지 확인
        const canceled = await prisma.instructorUnitAssignment.findUnique({
            where: { unitScheduleId_userId: { userId: instructorId, unitScheduleId } }
        });
        expect(canceled.state).to.equal('Canceled');
    });
    
    it('[PATCH] /:unitScheduleId/cancel - Missing Instructor ID (Error 400)', async () => {
        const res = await request(app)
            .patch(`/api/v1/assignments/${unitScheduleId}/cancel`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ unitScheduleId: unitScheduleId }); // instructorId 누락
            
        logResponse(res, 'Admin Cancel 400'); // 에러 로그 출력
        expect(res.status).to.equal(400);
        expect(res.body.error).to.include('instructorId가 필요합니다');
    });

});