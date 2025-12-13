const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { app, server } = require('../src/server'); // server.js 경로 확인 필요

const prisma = new PrismaClient();

// 테스트용 상수
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const ADMIN_EMAIL = 'admin_dist_test@test.com';
const INSTRUCTOR_A_EMAIL = 'inst_a_dist@test.com';
const INSTRUCTOR_B_EMAIL = 'inst_b_dist@test.com';

describe('Distance API Integration Test (Read-Only & DB Logic)', () => {
    let adminToken;
    let instructorAId; // 기준 강사
    let instructorBId; // 비교군 강사
    let unitAId;       // 기준 부대 (가까운 곳)
    let unitBId;       // 비교군 부대 (먼 곳)

    // ✅ [로그 헬퍼] 성공/실패 여부 상관없이 모든 JSON 응답 출력
    const logResponse = (res, label = 'TEST RESULT') => {
        console.log(`\n📦 [${label}] ${res.req.method} ${res.req.path}`);
        console.log(`Status: ${res.status}`);
        if (res.body) {
            console.log('Response Body:', JSON.stringify(res.body, null, 2));
        }
        console.log('--------------------------------------------------\n');
    };

    // ✅ 1. 테스트 데이터 초기화
    before(async () => {
        try {
            // 1-1. 데이터 정리 (FK 제약 고려 순서: 자식 -> 부모)
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

            // --------------------------------------------------
            // 1-2. 기초 데이터 생성 (팀)
            const team = await prisma.team.create({ data: { name: '거리팀' } });

            // 1-3. 관리자 생성 (Token 발급용)
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

            // 1-4. 강사 2명 생성
            // 강사 A
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

            // 강사 B
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

            // 1-5. 부대 2개 생성
            const unitA = await prisma.unit.create({
                data: { name: '부대A(가까움)', region: '서울', addressDetail: '서울' }
            });
            unitAId = unitA.id;

            const unitB = await prisma.unit.create({
                data: { name: '부대B(멈)', region: '부산', addressDetail: '부산' }
            });
            unitBId = unitB.id;

            // 1-6. 거리 데이터 시딩 (InstructorUnitDistance)
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
    // 🧪 1. Usage API Test
    // =================================================================
    describe('1. Kakao Usage API', () => {
        it('[GET] /usage/today - Should return initialized stats', async () => {
            const res = await request(app)
                .get('/api/v1/distance/usage/today')
                .set('Authorization', `Bearer ${adminToken}`);

            logResponse(res, 'Usage Today (Success)');
            
            expect(res.status).to.equal(200);
            expect(res.body.routeCount).to.equal(0);
            
            // 날짜 확인 (Local -> UTC 변환 고려)
            const now = new Date();
            const serverDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
            const todayStr = serverDate.toISOString().split('T')[0];
            
            expect(res.body.date).to.include(todayStr);
        });
    });

    // =================================================================
    // 🧪 2. Single Distance Check
    // =================================================================
    describe('2. Single Distance Check', () => {
        it('[GET] /:instId/:unitId - Should return correct distance record', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/${instructorAId}/${unitAId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            logResponse(res, 'Get Single Distance (Success)');

            expect(res.status).to.equal(200);
            expect(Number(res.body.distance)).to.equal(5000); 
            expect(res.body.userId).to.equal(instructorAId);
            expect(res.body.unitId).to.equal(unitAId);
        });

        // [에러 유발] 존재하지 않는 데이터 조회 -> 404
        it('[GET] /:instId/:unitId - Error: Not Found (404)', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/${instructorBId}/${unitBId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            logResponse(res, 'Get Single Distance (404 Not Found)'); 
            expect(res.status).to.equal(404);
            expect(res.body.error).to.exist;
        });

        // [에러 유발] 숫자가 아닌 ID -> 400
        it('[GET] /:instId/:unitId - Error: Invalid ID (400)', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/invalid_id/${unitAId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            logResponse(res, 'Get Single Distance (400 Bad Request)'); 
            expect(res.status).to.equal(400);
            // 에러 메시지가 'instructorId/unitId는 숫자여야 합니다.' 인지 확인 가능
        });
    });

    // =================================================================
    // 🧪 3. Filter Units by Distance
    // =================================================================
    describe('3. Get Units Within Distance', () => {
        it('[GET] Should return only nearby units (Max 10km)', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/instructor/${instructorAId}/within`)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ min: 0, max: 10000 });

            logResponse(res, 'Units Within 10km (Success)');

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(1);
            expect(res.body[0].unitId).to.equal(unitAId);
        });

        // [에러 유발] min > max -> 400
        it('[GET] Error: Invalid Range (min > max) (400)', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/instructor/${instructorAId}/within`)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ min: 20000, max: 10000 }); // min이 max보다 큼

            logResponse(res, 'Units Within (400 Invalid Range)');
            expect(res.status).to.equal(400);
        });

        // [에러 유발] 음수 값 -> 400
        it('[GET] Error: Negative Value (400)', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/instructor/${instructorAId}/within`)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ min: -5 });

            logResponse(res, 'Units Within (400 Negative Value)');
            expect(res.status).to.equal(400);
        });
    });

    // =================================================================
    // 🧪 4. Filter Instructors by Distance
    // =================================================================
    describe('4. Get Instructors Near Unit', () => {
        it('[GET] Should return only nearby instructors', async () => {
            const res = await request(app)
                .get(`/api/v1/distance/unit/${unitAId}/nearby-instructors`)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ max: 10000 });

            logResponse(res, 'Instructors Near Unit (Success)');

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(1);
            expect(res.body[0].userId).to.equal(instructorAId);
            expect(res.body[0].instructor.user.name).to.equal('강사A');
        });
    });

    // =================================================================
    // ⚠️ 5. Skipped APIs
    // =================================================================
    describe('5. Skipped APIs (External Dependency)', () => {
        it('[POST] /calculate - SKIPPED (Requires Kakao API)', () => {
            console.log('    ℹ️  Skipping POST /calculate to avoid external API calls.');
        });

        it('[POST] /batch/run - SKIPPED (Requires Kakao API)', () => {
            console.log('    ℹ️  Skipping POST /batch/run to avoid external API calls.');
        });
    });
});