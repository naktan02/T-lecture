//src/test/assignment_integration.spec2.js
const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { app, server } = require('../src/server');

const prisma = new PrismaClient();

// 테스트용 상수
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const ADMIN_EMAIL = 'admin_test@test.com';
const INSTRUCTOR_EMAIL = 'instructor_test@test.com';
const UNIT_NAME = '테스트부대';

describe('Assignment API Integration Test (Error Scenarios)', () => {
    let adminToken;
    let instructorToken;
    let instructorId;
    let unitScheduleId; 
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const startDateStr = tomorrow.toISOString().split('T')[0];
    const endDateStr = dayAfterTomorrow.toISOString().split('T')[0];

    // [헬퍼 함수] 에러 발생 시 JSON 로그 출력
    const logIfError = (res) => {
        if (res.status >= 400) {
            console.log(`\n❌ [API ERROR EXPECTED] ${res.req.method} ${res.req.path}`);
            console.log('Status:', res.status);
            console.log('Response Body:', JSON.stringify(res.body, null, 2));
            console.log('--------------------------------------------------\n');
        }
    };

    // ✅ 1. 테스트 전 데이터 초기화 및 시딩 (정상 환경 구성)
    before(async () => {
        try {
            await prisma.instructorUnitAssignment.deleteMany();
            await prisma.instructorUnitDistance.deleteMany();
            await prisma.instructorAvailability.deleteMany();
            await prisma.instructorVirtue.deleteMany();
            await prisma.unitSchedule.deleteMany();
            await prisma.trainingLocation.deleteMany();
            await prisma.unit.deleteMany();
            await prisma.instructor.deleteMany();
            await prisma.admin.deleteMany();
            await prisma.user.deleteMany({
                where: { userEmail: { in: [ADMIN_EMAIL, INSTRUCTOR_EMAIL] } }
            });

            let team = await prisma.team.findFirst();
            if (!team) team = await prisma.team.create({ data: { name: '테스트팀' } });

            let virtue = await prisma.virtue.findFirst();
            if (!virtue) virtue = await prisma.virtue.create({ data: { name: '테스트덕목' } });

            // 관리자 생성
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

            // 강사 생성
            const instructorUser = await prisma.user.create({
                data: {
                    userEmail: INSTRUCTOR_EMAIL,
                    password: 'hash',
                    name: '김강사',
                    userphoneNumber: '010-1111-2222',
                    status: 'APPROVED',
                    instructor: {
                        create: {
                            teamId: team.id,
                            category: 'Main',
                            location: '서울',
                            virtues: { create: { virtueId: virtue.id } },
                            availabilities: {
                                create: [
                                    { availableOn: tomorrow },
                                    { availableOn: dayAfterTomorrow }
                                ]
                            }
                        }
                    }
                },
                include: { instructor: true }
            });
            instructorId = instructorUser.instructor.userId;
            instructorToken = jwt.sign({ userId: instructorUser.id }, JWT_SECRET);

            // 부대 생성
            const unit = await prisma.unit.create({
                data: {
                    name: UNIT_NAME,
                    region: '경기',
                    addressDetail: '경기 어딘가',
                    educationStart: tomorrow,
                    educationEnd: dayAfterTomorrow,
                    trainingLocations: {
                        create: [{ originalPlace: '대연병장', instructorsNumbers: 1 }]
                    },
                    schedules: {
                        create: [
                            { date: tomorrow },
                            { date: dayAfterTomorrow }
                        ]
                    }
                },
                include: { schedules: true }
            });
            unitScheduleId = unit.schedules[0].id;

            // 거리 데이터 생성
            await prisma.instructorUnitDistance.create({
                data: {
                    userId: instructorId,
                    unitId: unit.id,
                    distance: 10,
                    duration: 600
                }
            });

            console.log('✅ Test Data Seeded Successfully');
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
    // 🧪 에러 유발 테스트 시나리오
    // =================================================================

    describe('Scenario 1: Admin Actions (Intentional Errors)', () => {
        // [에러 유발] 필수 파라미터 누락
        it('1. [Admin] Get Candidates - Missing Date Parameters (Should fail)', async () => {
            const res = await request(app)
                .get('/api/v1/assignments/candidates')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ startDate: startDateStr }); // endDate 누락

            logIfError(res); 

            // 400 Bad Request 기대
            expect(res.status).to.equal(400); 
            expect(res.body.error).to.exist;
        });

        // [에러 유발] 날짜 순서 엉망
        it('2. [Admin] Auto Assign - Invalid Date Range (Should fail)', async () => {
            const res = await request(app)
                .post('/api/v1/assignments/auto-assign')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ startDate: endDateStr, endDate: startDateStr }); // 시작일이 종료일보다 늦음

            logIfError(res);

            expect(res.status).to.equal(400);
            expect(res.body.error).to.exist;
        });
    });

    describe('Scenario 2: Instructor Actions (Intentional Errors)', () => {
        // [에러 유발] 토큰 없이 요청
        it('1. [Instructor] Get Assignments - No Token (Should fail)', async () => {
            const res = await request(app)
                .get('/api/v1/assignments/assignments');
                // .set('Authorization', ...) // 토큰 누락

            logIfError(res);

            // 401 Unauthorized 기대
            expect(res.status).to.equal(401);
        });

        // [에러 유발] 잘못된 응답 값 전송
        it('2. [Instructor] Respond - Invalid Response Value (Should fail)', async () => {
            // 테스트를 위해 임시로 배정 데이터 하나를 강제로 만듦 (응답할 대상이 있어야 하므로)
            await prisma.instructorUnitAssignment.create({
                data: {
                    userId: instructorId,
                    unitScheduleId: unitScheduleId,
                    state: 'Pending',
                    classification: 'Temporary'
                }
            }).catch(() => {}); // 이미 있으면 무시

            const res = await request(app)
                .post(`/api/v1/assignments/assignments/${unitScheduleId}/response`)
                .set('Authorization', `Bearer ${instructorToken}`)
                .send({ response: 'MAYBE' }); // ACCEPT/REJECT가 아님

            logIfError(res);

            // 400 Bad Request 기대 (Validation Error)
            expect(res.status).to.equal(400);
        });

        // [에러 유발] 존재하지 않는 배정에 대한 응답
        it('3. [Instructor] Respond - Assignment Not Found (Should fail)', async () => {
            const fakeId = 999999;
            const res = await request(app)
                .post(`/api/v1/assignments/assignments/${fakeId}/response`)
                .set('Authorization', `Bearer ${instructorToken}`)
                .send({ response: 'ACCEPT' });

            logIfError(res);

            // 404 Not Found 기대
            expect(res.status).to.equal(404);
        });
    });

    describe('Scenario 3: Admin Cancel (Intentional Errors)', () => {
        // [에러 유발] 필수 파라미터 누락
        it('1. [Admin] Cancel Assignment - Missing Parameter (Should fail)', async () => {
            const res = await request(app)
                .patch('/api/v1/assignments/admin/cancel')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    // instructorId 누락
                    unitScheduleId: unitScheduleId
                });

            logIfError(res);

            expect(res.status).to.equal(400);
        });
    });
});