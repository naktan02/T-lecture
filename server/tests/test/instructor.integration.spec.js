const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { app, server } = require('../../src/server');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

const INSTRUCTOR_EMAIL = 'inst_func_test@test.com';
const OTHER_USER_EMAIL = 'not_instructor@test.com';

describe('Instructor API Integration Test (Full Coverage, Stable)', () => {
    let instructorToken;
    let nonInstructorToken;
    let instructorUserId; 
    let virtueId;

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

    // 특정 월에 “배정된(Pending/Accepted)” 날짜 문자열(YYYY-MM-DD)들을 뽑아오기
    async function getAssignedDatesInMonth(userId, year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const assignments = await prisma.instructorUnitAssignment.findMany({
        where: {
            userId,
            state: { in: ['Pending', 'Accepted'] }, 
            UnitSchedule: { date: { gte: startDate, lte: endDate } },
        },
        include: { UnitSchedule: true },
        });

        return assignments
        .map(a => a.UnitSchedule?.date)
        .filter(Boolean)
        .map(d => new Date(d).toISOString().split('T')[0]);
    }

    before(async () => {
        await prisma.instructorVirtue.deleteMany();
        await prisma.instructorAvailability.deleteMany();
        await prisma.instructorStats.deleteMany();
        await prisma.instructorUnitDistance.deleteMany();
        await prisma.instructorUnitAssignment.deleteMany();
        await prisma.unitSchedule.deleteMany();
        await prisma.trainingLocation.deleteMany();
        await prisma.unit.deleteMany();
        await prisma.instructor.deleteMany();
        await prisma.virtue.deleteMany();
        await prisma.user.deleteMany({
        where: { userEmail: { in: [INSTRUCTOR_EMAIL, OTHER_USER_EMAIL] } }
        });

        // 덕목 생성 (PUT /virtues)
        const virtue = await prisma.virtue.create({ data: { name: '리더십' } });
        virtueId = virtue.id;

        // 강사 유저 생성
        const instUser = await prisma.user.create({
        data: {
            userEmail: INSTRUCTOR_EMAIL,
            password: 'hash',
            name: '나강사',
            status: 'APPROVED',
            instructor: { create: { location: '서울', category: 'Main' } }
        },
        include: { instructor: true }
        });

        instructorUserId = instUser.id;
        instructorToken = jwt.sign({ userId: instUser.id }, JWT_SECRET);

        // 일반 유저 (권한 테스트용)
        const normalUser = await prisma.user.create({
        data: {
            userEmail: OTHER_USER_EMAIL,
            password: 'hash',
            name: '일반유저',
            status: 'APPROVED',
        }
        });
        nonInstructorToken = jwt.sign({ userId: normalUser.id }, JWT_SECRET);

        // 레거시 통계 (stats에서 참고)
        await prisma.instructorStats.create({
        data: { instructorId: instUser.id, legacyPracticumCount: 5, autoPromotionEnabled: true }
        });

        // ✅ Promotion 통과를 위해 “8시간짜리 Accepted 배정” 여러 건 시딩 (총 56시간)
        const countAssignments = 7; // 8*7=56
        for (let i = 0; i < countAssignments; i++) {
        const day = new Date();
        day.setDate(day.getDate() - (60 + i));
        day.setHours(0, 0, 0, 0);

        const unit = await prisma.unit.create({
            data: {
            name: `PromoUnit_${i}_${Date.now()}`,
            workStartTime: new Date('2025-01-01T09:00:00.000Z'),
            workEndTime: new Date('2025-01-01T17:00:00.000Z'),
            schedules: { create: [{ date: day }] }
            },
            include: { schedules: true }
        });

        await prisma.instructorUnitAssignment.create({
            data: {
            userId: instUser.id,
            unitScheduleId: unit.schedules[0].id,
            state: 'Accepted'
            }
        });
        }

        console.log('✅ Instructor Test Data Seeded (Promotion eligible)');
    });

    after(async () => {
        if (server) server.close();
        await prisma.$disconnect();
    });

    // =================================================================
    // AUTH 공통
    // =================================================================
    // 토큰 없음 에러
    it('[AUTH] No Token (401)', async () => {
        const res = await request(app).get('/api/v1/instructor/stats');
        logResponse(res, 'No Token');
        expect(res.status).to.equal(401);
        expectErrorShape(res);
    });

    // =================================================================
    // 1) Availability (GET/PUT)
    // =================================================================
    // Availability 생성
    it('[PUT] /availability - Success (must include assigned dates if any)', async () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;

        const assignedDates = await getAssignedDatesInMonth(instructorUserId, year, month);

        const base = new Date(year, month - 1, 1);
        const baseStr = base.toISOString().split('T')[0];

        const dates = Array.from(new Set([...assignedDates, baseStr]));

        const res = await request(app)
        .put('/api/v1/instructor/availability')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ year, month, dates });

        logResponse(res, 'Update Availability Success');
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('message');
    });

    // Availability 생성 - validation error
    it('[PUT] /availability - Validation Error (400) missing dates array', async () => {
        const today = new Date();
        const res = await request(app)
        .put('/api/v1/instructor/availability')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ year: today.getFullYear(), month: today.getMonth() + 1, dates: 'nope' });

        logResponse(res, 'Update Availability 400');
        expect(res.status).to.equal(400);
        expectErrorShape(res);
    });
    // ✅ 일부러 assignedDates[0]을 빼버림
    it('[PUT] /availability - Conflict (409) exclude assigned date', async () => {
        const some = await prisma.instructorUnitAssignment.findFirst({
        where: { userId: instructorUserId, state: { in: ['Pending', 'Accepted'] } },
        include: { UnitSchedule: true }
        });

        if (!some?.UnitSchedule?.date) {
        return;
        }

        const d = new Date(some.UnitSchedule.date);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;

        const assignedDates = await getAssignedDatesInMonth(instructorUserId, year, month);
        expect(assignedDates.length).to.be.greaterThan(0);
        const dates = assignedDates.slice(1);

        const res = await request(app)
        .put('/api/v1/instructor/availability')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ year, month, dates });

        logResponse(res, 'Update Availability 409');
        expect(res.status).to.equal(409);
        expectErrorShape(res);
    });

    // Availability 조회
    it('[GET] /availability - Success', async () => {
        const today = new Date();
        const res = await request(app)
        .get('/api/v1/instructor/availability')
        .set('Authorization', `Bearer ${instructorToken}`)
        .query({ year: today.getFullYear(), month: today.getMonth() + 1 });

        logResponse(res, 'Get Availability');
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
    });

    it('[GET] /availability - Validation Error (400) missing query', async () => {
        const res = await request(app)
        .get('/api/v1/instructor/availability')
        .set('Authorization', `Bearer ${instructorToken}`);

        logResponse(res, 'Get Availability 400');
        expect(res.status).to.equal(400);
        expectErrorShape(res);
    });

    it('[GET] /availability - Forbidden (403)', async () => {
        const res = await request(app)
        .get('/api/v1/instructor/availability')
        .set('Authorization', `Bearer ${nonInstructorToken}`)
        .query({ year: 2025, month: 1 });

        logResponse(res, 'Get Availability 403');
        expect(res.status).to.equal(403);
        expectErrorShape(res);
    });

    // =================================================================
    // 2) Stats (GET)
    // =================================================================

    it('[GET] /stats - Success', async () => {
        const res = await request(app)
        .get('/api/v1/instructor/stats')
        .set('Authorization', `Bearer ${instructorToken}`);

        logResponse(res, 'Get Stats');
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('lectureHours');
        expect(res.body.lectureHours).to.be.a('number');
    });

    it('[GET] /stats - Forbidden (403)', async () => {
        const res = await request(app)
        .get('/api/v1/instructor/stats')
        .set('Authorization', `Bearer ${nonInstructorToken}`);

        logResponse(res, 'Get Stats 403');
        expect(res.status).to.equal(403);
        expectErrorShape(res);
    });

    // =================================================================
    // 3) Virtues (PUT)
    // =================================================================

    it('[PUT] /virtues - Success', async () => {
        const res = await request(app)
        .put('/api/v1/instructor/virtues')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ virtueIds: [virtueId] });

        logResponse(res, 'Update Virtues');
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('message');
    });

    it('[PUT] /virtues - Invalid Type (400)', async () => {
        const res = await request(app)
        .put('/api/v1/instructor/virtues')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ virtueIds: 'wrong' });

        logResponse(res, 'Update Virtues 400');
        expect(res.status).to.equal(400);
        expectErrorShape(res);
    });

    it('[PUT] /virtues - Forbidden (403)', async () => {
        const res = await request(app)
        .put('/api/v1/instructor/virtues')
        .set('Authorization', `Bearer ${nonInstructorToken}`)
        .send({ virtueIds: [virtueId] });

        logResponse(res, 'Update Virtues 403');
        expect(res.status).to.equal(403);
        expectErrorShape(res);
    });

    // =================================================================
    // 4) Promotion (POST)
    // =================================================================

    it('[POST] /promotion - Success (desiredLevel required)', async () => {
        const res = await request(app)
        .post('/api/v1/instructor/promotion')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ desiredLevel: 'Main' });

        logResponse(res, 'Request Promotion Success');
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('qualificationMet', true);
        expect(res.body).to.have.property('requestedLevel', 'Main');
    });

    it('[POST] /promotion - Missing Body (400)', async () => {
        const res = await request(app)
        .post('/api/v1/instructor/promotion')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({});

        logResponse(res, 'Request Promotion 400');
        expect(res.status).to.equal(400);
        expectErrorShape(res);
    });

    it('[POST] /promotion - Forbidden (403)', async () => {
        const res = await request(app)
        .post('/api/v1/instructor/promotion')
        .set('Authorization', `Bearer ${nonInstructorToken}`)
        .send({ desiredLevel: 'Main' });

        logResponse(res, 'Request Promotion 403');
        expect(res.status).to.equal(403);
        expectErrorShape(res);
    });
});
