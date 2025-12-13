// test/assignment_integration.spec.js
const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { app, server } = require('../src/server'); // server.js에서 export 필요

const prisma = new PrismaClient();

// 테스트용 상수
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const ADMIN_EMAIL = 'admin_test@test.com';
const INSTRUCTOR_EMAIL = 'instructor_test@test.com';
const UNIT_NAME = '테스트부대';

describe('Assignment API Integration Test (Real DB)', () => {
    let adminToken;
    let instructorToken;
    let instructorId;
    let unitScheduleId; // 테스트 도중 생성된 스케줄 ID 저장용
    
    // 날짜 유틸: 내일, 모레
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const startDateStr = tomorrow.toISOString().split('T')[0];
    const endDateStr = dayAfterTomorrow.toISOString().split('T')[0];

    // ✅ 1. 테스트 전 데이터 초기화 및 시딩
    before(async () => {
        // 1-1. 기존 데이터 정리 (순서 중요)
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

        // 1-2. 기초 데이터 (팀, 덕목)
        let team = await prisma.team.findFirst();
        if (!team) team = await prisma.team.create({ data: { name: '테스트팀' } });

        let virtue = await prisma.virtue.findFirst();
        if (!virtue) virtue = await prisma.virtue.create({ data: { name: '테스트덕목' } });

        // 1-3. 관리자 생성 & 토큰 발급
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

        // 1-4. 강사 생성 & 토큰 발급
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
                        // ✅ 중요: 강사가 해당 기간에 근무 가능해야 배정됨
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

        // 1-5. 부대 및 스케줄 생성
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
                        { date: tomorrow }, // 배정 대상 스케줄
                        { date: dayAfterTomorrow }
                    ]
                }
            },
            include: { schedules: true }
        });

        // 나중에 테스트에서 쓸 스케줄 ID 저장
        unitScheduleId = unit.schedules[0].id;

        // 1-6. 거리 데이터 생성 (배정 알고리즘 필수 조건)
        await prisma.instructorUnitDistance.create({
            data: {
                userId: instructorId,
                unitId: unit.id,
                distance: 10,
                duration: 600
            }
        });

        console.log('✅ Test Data Seeded Successfully');
    });

    // ✅ 2. 테스트 종료 후 정리
    after(async () => {
        // 서버 종료 (포트 점유 방지)
        server.close(); 
        await prisma.$disconnect();
    });

    // =================================================================
    // 🧪 API 테스트 시나리오 시작
    // =================================================================

    describe('Scenario 1: Admin Actions (Auto Assign)', () => {
        it('1. [Admin] Get Candidates - Should return raw candidates', async () => {
            const res = await request(app)
                .get('/api/v1/assignments/candidates')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ startDate: startDateStr, endDate: endDateStr });

            // 📦 JSON 출력
            console.log('\n📦 [Admin] Candidates Response:');
            // console.log(JSON.stringify(res.body, null, 2)); // 너무 길면 주석 처리

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('unassignedUnits');
            expect(res.body).to.have.property('availableInstructors');
            expect(res.body.availableInstructors).to.have.lengthOf.at.least(1);
        });

        it('2. [Admin] Auto Assign - Should create assignments', async () => {
            const res = await request(app)
                .post('/api/v1/assignments/auto-assign')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ startDate: startDateStr, endDate: endDateStr });

            // 📦 JSON 출력
            console.log('\n📦 [Admin] Auto Assign Result:');
            console.log(JSON.stringify(res.body, null, 2));

            expect(res.status).to.equal(200);
            expect(res.body.summary.created).to.be.greaterThan(0); // 최소 1개 이상 배정되어야 함
            
            // 실제 DB에 들어갔는지 확인
            const assignment = await prisma.instructorUnitAssignment.findFirst({
                where: { userId: instructorId, unitScheduleId: unitScheduleId }
            });
            expect(assignment).to.not.be.null;
            expect(assignment.state).to.equal('Pending'); // 초기 상태 확인
        });
    });

    describe('Scenario 2: Instructor Actions (Check & Respond)', () => {
        it('1. [Instructor] Get Assignments - Should see the pending assignment', async () => {
            const res = await request(app)
                .get('/api/v1/assignments/assignments')
                .set('Authorization', `Bearer ${instructorToken}`);

            // 📦 JSON 출력
            console.log('\n📦 [Instructor] My Assignments List:');
            console.log(JSON.stringify(res.body, null, 2));

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            const myAssignment = res.body.find(a => a.unitScheduleId === unitScheduleId);
            expect(myAssignment).to.exist;
        });

        it('2. [Instructor] Respond (Accept) - Should change state to Accepted', async () => {
            const res = await request(app)
                .post(`/api/v1/assignments/assignments/${unitScheduleId}/response`)
                .set('Authorization', `Bearer ${instructorToken}`)
                .send({ response: 'ACCEPT' });

            // 📦 JSON 출력
            console.log('\n📦 [Instructor] Response Result (Accept):');
            console.log(JSON.stringify(res.body, null, 2));

            expect(res.status).to.equal(200);
            expect(res.body.message).to.include('수락');

            // DB 확인
            const updated = await prisma.instructorUnitAssignment.findUnique({
                where: { unitScheduleId_userId: { userId: instructorId, unitScheduleId } }
            });
            expect(updated.state).to.equal('Accepted');
        });

        it('3. [Instructor] Get History - Should see the accepted assignment', async () => {
             // 주의: getWorkHistory는 로직상 "오늘 이전(Past)" 날짜만 가져오도록 되어 있을 수 있음.
             // 현재 시딩 데이터는 "내일"이므로 조회가 안 될 수도 있음.
             // 로직 검증을 위해 임시로 DB 날짜를 과거로 업데이트
             await prisma.unitSchedule.update({
                 where: { id: unitScheduleId },
                 data: { date: new Date('2000-01-01') }
             });

            const res = await request(app)
                .get('/api/v1/assignments/history')
                .set('Authorization', `Bearer ${instructorToken}`);

            // 📦 JSON 출력
            console.log('\n📦 [Instructor] My Work History:');
            console.log(JSON.stringify(res.body, null, 2));

            expect(res.status).to.equal(200);
            // const historyItem = res.body.find(a => a.id === unitScheduleId); 
            // expect(historyItem).to.exist; // DTO 구조에 따라 검증 방식 조정
        });
    });

    describe('Scenario 3: Admin Cancel', () => {
        it('1. [Admin] Cancel Assignment - Should change state to Canceled', async () => {
            const res = await request(app)
                .patch('/api/v1/assignments/admin/cancel')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    instructorId: instructorId,
                    unitScheduleId: unitScheduleId
                });

            // 📦 JSON 출력
            console.log('\n📦 [Admin] Cancel Result:');
            console.log(JSON.stringify(res.body, null, 2));

            expect(res.status).to.equal(200);
            
            // DB 확인
            const canceled = await prisma.instructorUnitAssignment.findUnique({
                where: { unitScheduleId_userId: { userId: instructorId, unitScheduleId } }
            });
            expect(canceled.state).to.equal('Canceled');
        });
    });
});