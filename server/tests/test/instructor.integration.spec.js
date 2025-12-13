const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
// ✅ 경로 수정 확인
const { app, server } = require('../../src/server');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const INSTRUCTOR_EMAIL = 'inst_func_test@test.com';

describe('Instructor API Integration Test (All 5 Routes)', () => {
    let instructorToken;
    let instructorId;
    let virtueId;

    // ✅ 로그 헬퍼: 성공/실패 여부와 관계없이 JSON 본문 출력
    const logResponse = (res, label) => {
        console.log(`\n📦 [${label}] ${res.req.method} ${res.req.path} (${res.status})`);
        if (res.body) {
            const prefix = res.status >= 400 ? 'Error:' : 'Response Body:';
            console.log(prefix, JSON.stringify(res.body, null, 2));
        }
        console.log('--------------------------------------------------\n');
    };

    before(async () => {
        // 1. DB 정리 (FK 방지 순서)
        await prisma.instructorVirtue.deleteMany();
        await prisma.instructorAvailability.deleteMany();
        await prisma.instructorStats.deleteMany();
        await prisma.instructorUnitDistance.deleteMany();
        await prisma.instructorUnitAssignment.deleteMany();
        await prisma.instructor.deleteMany();
        await prisma.virtue.deleteMany();
        await prisma.user.deleteMany({ where: { userEmail: INSTRUCTOR_EMAIL } });

        // 2. 덕목 생성 (PUT /virtues 테스트용)
        const virtue = await prisma.virtue.create({ data: { name: '리더십' } });
        virtueId = virtue.id;
        
        // 3. 강사 생성
        const user = await prisma.user.create({
            data: {
                userEmail: INSTRUCTOR_EMAIL,
                password: 'hash',
                name: '나강사',
                status: 'APPROVED',
                instructor: {
                    create: {
                        location: '서울',
                        category: 'Main'
                    }
                }
            },
            include: { instructor: true }
        });
        instructorId = user.instructor.userId;
        instructorToken = jwt.sign({ userId: user.id }, JWT_SECRET);
        
        // 4. 레거시 통계 테이블 생성 (getStats가 이 테이블을 참조할 수 있음)
        await prisma.instructorStats.create({
            data: { instructorId, legacyPracticumCount: 5, autoPromotionEnabled: true }
        });
        
        // 5. 강의 시간 통계가 0시간이 되지 않도록 과거 배정 데이터 시딩 (promotion 테스트용)
        // unitSchedule, unit 데이터 생성 (repository에서 workStartTime을 참조하므로 필수)
        const pastUnit = await prisma.unit.create({
            data: {
                name: 'PastUnit', 
                workStartTime: new Date('2025-01-01T09:00:00.000Z'), // 9시
                workEndTime: new Date('2025-01-01T17:00:00.000Z'), // 17시 (8시간)
                schedules: { create: [{ date: new Date(new Date().setDate(new Date().getDate() - 30)) }] }
            },
            include: { schedules: true }
        });
        // 승급 테스트를 위해 확정 배정 상태로 삽입 (8시간 확보)
        await prisma.instructorUnitAssignment.create({
            data: { 
                userId: instructorId, 
                unitScheduleId: pastUnit.schedules[0].id, 
                state: 'Accepted' 
            }
        });
        
        console.log('✅ Instructor Test Data Seeded');
    });

    after(async () => {
        if (server) server.close();
        await prisma.$disconnect();
    });

    // =================================================================
    // 🧪 1. GET/PUT /availability (근무 가능일 조회/수정)
    // =================================================================

    it('[PUT] /availability - Update Dates (Success)', async () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const dateStr = today.toISOString().split('T')[0];

        const res = await request(app)
            .put('/api/v1/instructor/availability')
            .set('Authorization', `Bearer ${instructorToken}`)
            .send({ year, month, dates: [dateStr] });

        logResponse(res, 'Update Availability');
        expect(res.status).to.equal(200);
    });

    it('[GET] /availability - Get Dates (Success)', async () => {
        const today = new Date();
        const res = await request(app)
            .get('/api/v1/instructor/availability')
            .set('Authorization', `Bearer ${instructorToken}`)
            .query({ year: today.getFullYear(), month: today.getMonth() + 1 });

        logResponse(res, 'Get Availability');
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body).to.have.lengthOf(1);
    });

    it('[GET] /availability - Missing Params (Error 400)', async () => {
        const res = await request(app)
            .get('/api/v1/instructor/availability')
            .set('Authorization', `Bearer ${instructorToken}`);
        
        logResponse(res, 'Get Availability Error');
        expect(res.status).to.equal(400);
        expect(res.body.code).to.equal('VALIDATION_ERROR');
    });

    // =================================================================
    // 🧪 2. GET /stats (통계 조회)
    // =================================================================
    
    it('[GET] /stats - Get Stats (Success)', async () => {
        const res = await request(app)
            .get('/api/v1/instructor/stats')
            .set('Authorization', `Bearer ${instructorToken}`);

        logResponse(res, 'Get Stats');
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('lectureHours');
        expect(res.body.lectureHours).to.equal(8); // 8시간 강의로 시딩했는지 확인
    });

    // =================================================================
    // 🧪 3. PUT /virtues (과목 수정)
    // =================================================================

    it('[PUT] /virtues - Update Virtues (Success)', async () => {
        const res = await request(app)
            .put('/api/v1/instructor/virtues')
            .set('Authorization', `Bearer ${instructorToken}`)
            .send({ virtueIds: [virtueId] });

        logResponse(res, 'Update Virtues');
        expect(res.status).to.equal(200);
    });

    it('[PUT] /virtues - Invalid Data (Error 400)', async () => {
        const res = await request(app)
            .put('/api/v1/instructor/virtues')
            .set('Authorization', `Bearer ${instructorToken}`)
            .send({ virtueIds: "NotArray" });

        logResponse(res, 'Update Virtues Error');
        expect(res.status).to.equal(400);
        expect(res.body.code).to.equal('VALIDATION_ERROR');
    });

    // =================================================================
    // 🧪 4. POST /promotion (승급 신청)
    // =================================================================
    
    it('[POST] /promotion - Request (Success or 400 based on criteria)', async () => {
        const res = await request(app)
            .post('/api/v1/instructor/promotion')
            .set('Authorization', `Bearer ${instructorToken}`)
            .send({ desiredLevel: 'Main' });

        logResponse(res, 'Request Promotion');
        
        // 승급 기준(PROMOTION_CRITERIA)을 통과했는지에 따라 200 또는 400이 발생함.
        if (res.status === 400) {
            expect(res.body.code).to.equal('NOT_ELIGIBLE');
        } else {
            expect(res.status).to.equal(200);
            expect(res.body.qualificationMet).to.be.true;
        }
    });
    
    it('[POST] /promotion - Missing Desired Level (Error 400)', async () => {
        const res = await request(app)
            .post('/api/v1/instructor/promotion')
            .set('Authorization', `Bearer ${instructorToken}`)
            .send({});

        logResponse(res, 'Request Promotion Error');
        expect(res.status).to.equal(400);
        expect(res.body.code).to.equal('VALIDATION_ERROR');
    });
});