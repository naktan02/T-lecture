const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { app, server } = require('../src/server'); // server.js 경로 확인 필요

const prisma = new PrismaClient();

// 테스트용 상수
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const ADMIN_EMAIL = 'admin_msg_test@test.com';
const INSTRUCTOR_EMAIL = 'instructor_msg_test@test.com';

describe('Message & Metadata API Integration Test', () => {
    let adminToken;
    let instructorToken;
    let instructorId;
    let teamId;
    let virtueId;
    let unitScheduleId;
    let sentMessageId; // 테스트 도중 발송된 메시지 ID 저장용

    // [로그 헬퍼] 성공/실패 여부 상관없이 JSON 응답 출력
    const logResponse = (res, label = 'TEST RESULT') => {
        console.log(`\n📦 [${label}] ${res.req.method} ${res.req.path}`);
        console.log(`Status: ${res.status}`);
        if (res.body) {
            console.log('Response Body:', JSON.stringify(res.body, null, 2));
        }
        console.log('--------------------------------------------------\n');
    };

    // ✅ 1. 테스트 데이터 초기화 (Before All)
    before(async () => {
        try {
            // 1-1. 데이터 정리 (FK 제약 조건 고려하여 자식 테이블부터 삭제)
            // (1) 메시지 관련
            await prisma.messageAssignment.deleteMany();
            await prisma.messageReceipt.deleteMany();
            await prisma.message.deleteMany();
            
            // (2) 배정 및 거리 관련 (강사와 부대를 참조함)
            await prisma.instructorUnitAssignment.deleteMany();
            await prisma.instructorUnitDistance.deleteMany(); // ✅ 추가됨 (거리 데이터)
            
            // (3) 부대 관련
            await prisma.unitSchedule.deleteMany();
            await prisma.trainingLocation.deleteMany(); // (혹시 몰라 명시)
            await prisma.unit.deleteMany();
            
            // (4) 강사 관련 (강사를 참조하는 테이블 먼저 삭제)
            await prisma.instructorVirtue.deleteMany();
            await prisma.instructorAvailability.deleteMany(); // ✅ 추가됨 (근무 가능일)
            await prisma.instructor.deleteMany();             // 이제 삭제 가능
            
            // (5) 유저 및 관리자
            await prisma.admin.deleteMany();
            await prisma.user.deleteMany({
                where: { userEmail: { in: [ADMIN_EMAIL, INSTRUCTOR_EMAIL] } }
            });
            
            // (6) 메타데이터
            await prisma.messageTemplate.deleteMany();
            await prisma.team.deleteMany();
            await prisma.virtue.deleteMany();

            // ---------------------------------------------------------
            // 1-2. 메타데이터 생성 (팀, 덕목, 템플릿)
            const team = await prisma.team.create({ data: { name: '테스트팀' } });
            teamId = team.id;

            const virtue = await prisma.virtue.create({ data: { name: '테스트덕목' } });
            virtueId = virtue.id;

            await prisma.messageTemplate.createMany({
                data: [
                    { key: 'TEMPORARY', title: '임시 배정', body: '임시 배정: {{unitName}} / {{scheduleText}}' },
                    { key: 'CONFIRMED_LEADER', title: '확정(리더)', body: '확정 리더: {{unitName}} / 동료: {{colleagues}}' },
                    { key: 'CONFIRMED_MEMBER', title: '확정(일반)', body: '확정 일반: {{unitName}} / 주소: {{address}}' }
                ]
            });

            // 1-3. 유저 생성 (관리자, 강사)
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
                            location: '서울'
                        }
                    }
                },
                include: { instructor: true }
            });
            instructorId = instructorUser.instructor.userId;
            instructorToken = jwt.sign({ userId: instructorUser.id }, JWT_SECRET);

            // 1-4. 부대 및 배정 데이터 생성 (Pending 상태)
            const unit = await prisma.unit.create({
                data: {
                    name: '제1테스트부대',
                    region: '경기',
                    addressDetail: '경기도 양주시',
                    educationStart: new Date(),
                    educationEnd: new Date(),
                    schedules: {
                        create: [{ date: new Date() }]
                    },
                    trainingLocations: {
                        create: [{ originalPlace: '연병장', instructorsNumbers: 5 }]
                    }
                },
                include: { schedules: true }
            });
            unitScheduleId = unit.schedules[0].id;

            // 임시 배정 메시지 테스트를 위해 'Pending' 상태로 배정 생성
            await prisma.instructorUnitAssignment.create({
                data: {
                    userId: instructorId,
                    unitScheduleId: unitScheduleId,
                    state: 'Pending',
                    classification: 'Temporary'
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
    // 🧪 1. Metadata API Tests
    // =================================================================
    describe('1. Metadata API', () => {
        it('[GET] Teams - Should return team list', async () => {
            const res = await request(app).get('/api/v1/metadata/teams');
            logResponse(res, 'Metadata - Get Teams');
            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
        });

        it('[PUT] Update Team - Should update name (Admin)', async () => {
            const res = await request(app)
                .put(`/api/v1/metadata/teams/${teamId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: '수정된팀이름' });
            
            logResponse(res, 'Metadata - Update Team');
            expect(res.status).to.equal(200);
            expect(res.body.name).to.equal('수정된팀이름');
        });

        it('[PUT] Update Team - Error: Invalid ID (404)', async () => {
            const res = await request(app)
                .put(`/api/v1/metadata/teams/99999`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Fail' });

            logResponse(res, 'Metadata - Update Team Error');
            expect(res.status).to.equal(404);
        });

        it('[GET] Templates - Should return templates (Admin)', async () => {
            const res = await request(app)
                .get('/api/v1/metadata/templates')
                .set('Authorization', `Bearer ${adminToken}`);
            
            logResponse(res, 'Metadata - Get Templates');
            expect(res.status).to.equal(200);
        });

        it('[PUT] Update Template - Should update body', async () => {
            const res = await request(app)
                .put('/api/v1/metadata/templates/TEMPORARY')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: '수정된 임시 알림', body: '수정된 본문: {{unitName}}' });

            logResponse(res, 'Metadata - Update Template');
            expect(res.status).to.equal(200);
            expect(res.body.title).to.equal('수정된 임시 알림');
        });
    });

    // =================================================================
    // 🧪 2. Message API - Notice (공지)
    // =================================================================
    describe('2. Message API - Notices', () => {
        it('[POST] Create Notice - Should create a notice', async () => {
            const res = await request(app)
                .post('/api/v1/messages/notices')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: '긴급 공지', body: '서버 점검 안내입니다.' });

            logResponse(res, 'Message - Create Notice');
            expect(res.status).to.equal(201);
            expect(res.body.title).to.equal('긴급 공지');
        });

        it('[POST] Create Notice - Error: Missing Body (400)', async () => {
            const res = await request(app)
                .post('/api/v1/messages/notices')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: '제목만 있음' });

            logResponse(res, 'Message - Create Notice Error');
            expect(res.status).to.equal(400);
        });

        it('[GET] Get Notices - Should return list', async () => {
            const res = await request(app)
                .get('/api/v1/messages/notices')
                .set('Authorization', `Bearer ${instructorToken}`);

            logResponse(res, 'Message - Get Notices');
            expect(res.status).to.equal(200);
            expect(res.body).to.have.lengthOf.at.least(1);
        });
    });

    // =================================================================
    // 🧪 3. Message API - Sending (발송)
    // =================================================================
    describe('3. Message API - Sending', () => {
        it('[POST] Send Temporary - Should send to Pending assignments', async () => {
            // 현재 Pending 상태인 배정이 1개 있음
            const res = await request(app)
                .post('/api/v1/messages/send/temporary')
                .set('Authorization', `Bearer ${adminToken}`);

            logResponse(res, 'Message - Send Temporary');
            expect(res.status).to.equal(200);
            expect(res.body.count).to.be.greaterThan(0);
        });

        it('[POST] Send Confirmed - Error: No Accepted assignments (404)', async () => {
            // 아직 Accepted 상태인 배정이 없음 -> 404 NO_TARGETS 에러 예상
            const res = await request(app)
                .post('/api/v1/messages/send/confirmed')
                .set('Authorization', `Bearer ${adminToken}`);

            logResponse(res, 'Message - Send Confirmed (Empty)');
            expect(res.status).to.equal(404);
        });

        it('--> [Setup] Change Assignment State to Accepted', async () => {
            // 확정 메시지 테스트를 위해 배정 상태를 Accepted로 강제 변경
            await prisma.instructorUnitAssignment.update({
                where: { unitScheduleId_userId: { userId: instructorId, unitScheduleId } },
                data: { state: 'Accepted', classification: 'Confirmed' }
            });
            console.log('    (Updated assignment state to Accepted for next test)');
        });

        it('[POST] Send Confirmed - Should send to Accepted assignments', async () => {
            const res = await request(app)
                .post('/api/v1/messages/send/confirmed')
                .set('Authorization', `Bearer ${adminToken}`);

            logResponse(res, 'Message - Send Confirmed');
            expect(res.status).to.equal(200);
            expect(res.body.count).to.be.greaterThan(0);
        });
    });

    // =================================================================
    // 🧪 4. Message API - Receipt (수신 및 읽음)
    // =================================================================
    describe('4. Message API - Receipt', () => {
        it('[GET] My Messages - Should return received messages', async () => {
            const res = await request(app)
                .get('/api/v1/messages/')
                .set('Authorization', `Bearer ${instructorToken}`);

            logResponse(res, 'Message - Get My Messages');
            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be.at.least(1);

            // 읽음 처리를 위해 메시지 ID 저장
            sentMessageId = res.body[0].messageId;
        });

        it('[PATCH] Read Message - Should mark as read', async () => {
            const res = await request(app)
                .patch(`/api/v1/messages/${sentMessageId}/read`)
                .set('Authorization', `Bearer ${instructorToken}`);

            logResponse(res, 'Message - Read Message');
            expect(res.status).to.equal(200);
            
            // DB 확인
            const receipt = await prisma.messageReceipt.findUnique({
                where: { userId_messageId: { userId: instructorId, messageId: sentMessageId } }
            });
            expect(receipt.readAt).to.not.be.null;
        });

        it('[PATCH] Read Message - Error: Invalid ID (404)', async () => {
            const res = await request(app)
                .patch(`/api/v1/messages/999999/read`)
                .set('Authorization', `Bearer ${instructorToken}`);

            logResponse(res, 'Message - Read Message Error');
            expect(res.status).to.equal(404);
        });
    });
});