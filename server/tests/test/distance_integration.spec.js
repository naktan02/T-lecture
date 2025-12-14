const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { app, server } = require('../../src/server'); 

const prisma = new PrismaClient();

// 테스트용 상수
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const ADMIN_EMAIL = 'admin_dist_test@test.com';
const INSTRUCTOR_A_EMAIL = 'inst_a_dist@test.com';
const INSTRUCTOR_B_EMAIL = 'inst_b_dist@test.com';

describe('Distance API Integration Test (Full Coverage)', () => {
    let adminToken;
    let instructorAToken;
    let instructorAId;
    let instructorBId;
    let unitAId;
    let unitBId;

    // ✅ [로그 헬퍼] 성공/실패 여부 상관없이 모든 JSON 응답 출력
    const logResponse = (res, label = 'TEST RESULT') => {
        console.log(`\n📦 [${label}] ${res.req.method} ${res.req.path}`);
        console.log(`Status: ${res.status}`);
        if (res.body) {
            console.log('Response Body:', JSON.stringify(res.body, null, 2));
        }
        console.log('--------------------------------------------------\n');
    };
    
    // ✅ [에러 헬퍼] 에러 응답 형식 검증
    const expectErrorShape = (res) => {
        expect(res.status).to.be.at.least(400);
        expect(res.body).to.be.an('object');
        expect(res.body.error || res.body.message || res.body.code).to.exist;
    };


    // ✅ 1. 테스트 데이터 초기화
    before(async () => {
        try {
            await prisma.messageAssignment.deleteMany();
            await prisma.messageReceipt.deleteMany();
            await prisma.message.deleteMany();

            await prisma.instructorUnitDistance.deleteMany();
            await prisma.kakaoApiUsage.deleteMany();
            
            await prisma.instructorUnitAssignment.deleteMany();
            await prisma.instructorAvailability.deleteMany();
            await prisma.instructorVirtue.deleteMany();
            await prisma.unitSchedule.deleteMany();
            await prisma.trainingLocation.deleteMany();
            
            await prisma.unit.deleteMany();
            await prisma.instructor.deleteMany();
            await prisma.admin.deleteMany();
            await prisma.user.deleteMany({
                where: { userEmail: { in: [ADMIN_EMAIL, INSTRUCTOR_A_EMAIL, INSTRUCTOR_B_EMAIL] } }
            });
            await prisma.team.deleteMany();

            const team = await prisma.team.create({ data: { name: '거리팀' } });

            const adminUser = await prisma.user.create({
                data: {
                    userEmail: ADMIN_EMAIL,
                    password: 'hash',
                    name: '관리자',
                    userphoneNumber: '010-0000-0000',
                    status: 'APPROVED',
                    admin: { create: { level: 'SUPER' } }
                }
            });
            adminToken = jwt.sign({ userId: adminUser.id }, JWT_SECRET);

            const userA = await prisma.user.create({
                data: {
                    userEmail: INSTRUCTOR_A_EMAIL,
                    password: 'hash',
                    name: '강사A',
                    userphoneNumber: '010-1111-1111',
                    status: 'APPROVED',
                    instructor: { create: { teamId: team.id, category: 'Main', location: '서울' } }
                },
                include: { instructor: true }
            });
            instructorAId = userA.instructor.userId;
            instructorAToken = jwt.sign({ userId: instructorAId }, JWT_SECRET);

            const userB = await prisma.user.create({
                data: {
                    userEmail: INSTRUCTOR_B_EMAIL,
                    password: 'hash',
                    name: '강사B',
                    userphoneNumber: '010-2222-2222',
                    status: 'APPROVED',
                    instructor: { 
                        create: { 
                            teamId: team.id, 
                            category: 'Co', 
                            location: '부산' 
                        } 
                    }
                },
                include: { instructor: true }
            });
            instructorBId = userB.instructor.userId;

            const unitA = await prisma.unit.create({
                data: { name: '부대A(가까움)', region: '서울', addressDetail: '서울' }
            });
            unitAId = unitA.id;

            const unitB = await prisma.unit.create({
                data: { name: '부대B(멈)', region: '부산', addressDetail: '부산' }
            });
            unitBId = unitB.id;

            // 거리 데이터 시딩 (InstructorUnitDistance)
            await prisma.instructorUnitDistance.createMany({
                data: [
                    { userId: instructorAId, unitId: unitAId, distance: 5000, duration: 1200 },   
                    { userId: instructorAId, unitId: unitBId, distance: 400000, duration: 14400 }, 
                    { userId: instructorBId, unitId: unitAId, distance: 395000, duration: 14000 }  
                ]
            });

            console.log('✅ Distance Test Data Seeded');
        } catch (e) {
            console.error(e);
            throw e;
        }
    });

    after(async () => {
        if (server) server.close();
        await prisma.$disconnect();
    });
    
    // =================================================================
    // 🧪 0. Common Auth Check (모든 Distance API는 ADMIN 권한 필요)
    // =================================================================
    describe('0. Auth & Role Check', () => {
        // 토큰 없음 에러
        it('[GET] /usage/today - Error: No Token (401)', async () => {
            const res = await request(app)
                .get('/api/v1/distance/usage/today')
                .send();

            logResponse(res, 'Auth Check (401 No Token)');
            expect(res.status).to.equal(401);
            expectErrorShape(res);
        });

        // 관리자 토큰 없음 에러
        it('[GET] /usage/today - Error: Non-Admin Token (403)', async () => {
            const res = await request(app)
                .get('/api/v1/distance/usage/today')
                .set('Authorization', `Bearer ${instructorAToken}`)
                .send();

            logResponse(res, 'Auth Check (403 Non-Admin)');
            expect(res.status).to.equal(403);
            expectErrorShape(res);
        });
    });

    // =================================================================
    // 🧪 1. Usage API Test (GET /usage/today)
    // =================================================================
    describe('1. Kakao Usage API (GET /usage/today)', () => {
        // 오늘 api 할당량 조회 성공
        it('[GET] /usage/today - Success: Should return initialized stats', async () => {
            const res = await request(app)
                .get('/api/v1/distance/usage/today')
                .set('Authorization', `Bearer ${adminToken}`);

            logResponse(res, 'Usage Today (Success)');
            
            expect(res.status).to.equal(200);
            expect(res.body.routeCount).to.equal(0);
        });
    });

    // =================================================================
    // 🧪 2. Single Distance Check (GET /:instId/:unitId)
    // =================================================================
    // 
    describe('2. Single Distance Check (GET /:instId/:unitId)', () => {
        it('[GET] Success: Should return correct distance record', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/${instructorAId}/${unitAId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            logResponse(res, 'Get Single Distance (Success)');

            expect(res.status).to.equal(200);
            expect(Number(res.body.distance)).to.equal(5000); 
        });

        // ✅ Error: Not Found (404) - No distance record
        it('[GET] Error: Not Found (404) - No distance record', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/${instructorBId}/${unitBId}`) 
                .set('Authorization', `Bearer ${adminToken}`);

            logResponse(res, 'Get Single Distance (404 Not Found)'); 
            expect(res.status).to.equal(404);
            expectErrorShape(res);
            expect(res.body.code).to.equal('DISTANCE_NOT_FOUND');
        });

        // ✅ Error: Invalid ID (400) - Non-numeric ID
        it('[GET] Error: Invalid ID (400) - Non-numeric ID', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/invalid_id/${unitAId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            logResponse(res, 'Get Single Distance (400 Bad Request)'); 
            expect(res.status).to.equal(400);
            expectErrorShape(res);
            expect(res.body.error).to.include('숫자여야 합니다');
        });
    });

    // =================================================================
    // 🧪 3. Filter Units by Distance (GET /instructor/:instId/within)
    // =================================================================
    describe('3. Get Units Within Distance (GET /instructor/:instId/within)', () => {
        // ✅ Success
        it('[GET] Success: Should return only nearby units (Max 10km)', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/instructor/${instructorAId}/within`)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ min: 0, max: 10000 });

            logResponse(res, 'Units Within 10km (Success)');

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array').with.lengthOf(1);
            expect(res.body[0].unitId).to.equal(unitAId);
        });

        // ✅ Error: Invalid Range (400) - min > max
        it('[GET] Error: Invalid Range (400) - min > max', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/instructor/${instructorAId}/within`)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ min: 20000, max: 10000 }); // min이 max보다 큼

            logResponse(res, 'Units Within (400 Invalid Range)');
            expect(res.status).to.equal(400);
            expectErrorShape(res);
            expect(res.body.error).to.include('올바르지 않습니다');
        });

        // ✅ Error: Invalid ID (400) - Non-numeric instructorId
        it('[GET] Error: Invalid ID (400) - Non-numeric instructorId', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/instructor/abc/within`)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ min: 0, max: 10000 });

            logResponse(res, 'Units Within (400 Invalid ID)');
            expect(res.status).to.equal(400);
            expectErrorShape(res);
            expect(res.body.error).to.include('숫자여야 합니다');
        });
    });

    // =================================================================
    // 🧪 4. Filter Instructors by Distance (GET /unit/:unitId/nearby-instructors)
    // =================================================================

    describe('4. Get Instructors Near Unit (GET /unit/:unitId/nearby-instructors)', () => {
        // ✅ Success
        it('[GET] Success: Should return only nearby instructors', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/unit/${unitAId}/nearby-instructors`)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ max: 10000 });

            logResponse(res, 'Instructors Near Unit (Success)');

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array').with.lengthOf(1);
            expect(res.body[0].userId).to.equal(instructorAId);
        });

        // ✅ Error: Invalid ID (400) - Non-numeric unitId
        it('[GET] Error: Invalid ID (400) - Non-numeric unitId', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/unit/xyz/nearby-instructors`)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ max: 10000 });

            logResponse(res, 'Instructors Near Unit (400 Invalid ID)');
            expect(res.status).to.equal(400);
            expectErrorShape(res);
        });

        // ✅ Error: Invalid Range (400) - Negative min
        it('[GET] Error: Invalid Range (400) - Negative min', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/unit/${unitAId}/nearby-instructors`)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ min: -100 });

            logResponse(res, 'Instructors Near Unit (400 Negative Range)');
            expect(res.status).to.equal(400);
            expectErrorShape(res);
            expect(res.body.error).to.include('올바르지 않습니다');
        });
    });

    // =================================================================
    // 🧪 5. Manual Calculation (POST /calculate)
    // =================================================================
    describe('5. Manual Calculation (POST /calculate)', () => {
        // ✅ Error: Missing Body Fields (400)
        it('[POST] Error: Missing Body Fields (400)', async () => {
            const res = await request(app)
                .post('/api/v1/distance/calculate')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ unitId: unitAId }); // instructorId 누락

            logResponse(res, 'Calculate (400 Missing Fields)');
            expect(res.status).to.equal(400);
            expectErrorShape(res);
            expect(res.body.error).to.include('instructorId와 unitId가 필요합니다');
        });

        // 성공 테스트는 Kakao API Mocking이 필요하므로 생략합니다.
    });
    
    // =================================================================
    // 🧪 6. Manual Batch Run (POST /batch/run)
    // =================================================================
    describe('6. Manual Batch Run (POST /batch/run)', () => {
        // ✅ Error: Invalid Limit (40  0) - Non-positive limit
        it('[POST] Error: Invalid Limit (400) - Non-positive limit', async () => {
            const res = await request(app)
                .post('/api/v1/distance/batch/run')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ limit: 0 }); // 0은 양수가 아님

            logResponse(res, 'Batch Run (400 Invalid Limit)');
            expect(res.status).to.equal(400);
            expectErrorShape(res);
            expect(res.body.error).to.include('양의 숫자여야 합니다');
        });

        // 성공 테스트는 Kakao API Mocking이 필요하므로 생략합니다.
    });

});