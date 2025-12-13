const request = require('supertest');
const { expect } = require('chai');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { app, server } = require('../../src/server'); // server.js 경로 확인 필요

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const ADMIN_EMAIL = 'metadata_admin_test@test.com';

describe('Metadata API Integration Test (All Routes)', () => {
    let adminToken;
    let teamId;
    let virtueId;

    // ✅ [로그 헬퍼] 성공/실패 여부 상관없이 요청 정보와 응답 본문(JSON)을 출력
    const logResponse = (res, label) => {
        console.log(`\n📦 [${label}] ${res.req.method} ${res.req.path}`);
        console.log(`Status: ${res.status}`);
        if (res.body) {
            console.log('Response Body:', JSON.stringify(res.body, null, 2));
        }
        console.log('--------------------------------------------------\n');
    };

    // ✅ 1. 테스트 데이터 초기화 및 시딩
before(async () => {
        try {
            // 1-1. DB 정리 (FK 제약 조건 고려: 자식 -> 부모 순서)
            
            // 🟢 [FK P2003 해결 핵심] Message 관련 테이블 먼저 삭제
            await prisma.messageAssignment.deleteMany(); 
            await prisma.messageReceipt.deleteMany(); 
            await prisma.message.deleteMany(); 
            await prisma.messageTemplate.deleteMany(); // 메타데이터도 여기서 삭제

            // Assignment 및 Distance 관련 테이블 삭제
            await prisma.instructorUnitAssignment.deleteMany(); // 이제 안전하게 삭제됨
            await prisma.instructorUnitDistance.deleteMany();
            
            // Instructor 관련 테이블 삭제
            await prisma.instructorVirtue.deleteMany();
            await prisma.instructorAvailability.deleteMany();
            await prisma.instructorStats.deleteMany();
            await prisma.instructor.deleteMany(); 

            // Unit 관련 테이블 삭제
            await prisma.unitSchedule.deleteMany();
            await prisma.trainingLocation.deleteMany();
            await prisma.unit.deleteMany();

            // 유저/관리자 정리
            await prisma.admin.deleteMany();
            await prisma.user.deleteMany({ where: { userEmail: ADMIN_EMAIL } });

            // 나머지 메타데이터 테이블 정리
            await prisma.team.deleteMany();
            await prisma.virtue.deleteMany();

            // ---------------------------------------------------------
            // 1-2. 데이터 시딩 (이후 코드는 동일)
            
            // (1) 팀 생성
            const team = await prisma.team.create({ data: { name: '초기테스트팀' } });
            teamId = team.id;

            // (2) 덕목 생성
            const virtue = await prisma.virtue.create({ data: { name: '초기테스트덕목' } });
            virtueId = virtue.id;

            // (3) 메시지 템플릿 생성
            await prisma.messageTemplate.create({
                data: { key: 'TEMPORARY', title: '임시 타이틀', body: '내용: {{content}}' }
            });

            // (4) 관리자 계정 생성 (토큰 발급용)
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

            console.log('✅ Metadata Test Data Seeded');
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
    // 🧪 1. Public 조회 API (인증 불필요)
    // =================================================================
    
    it('[GET] /api/v1/metadata/instructor - 통합 메타데이터 조회 (Success)', async () => {
        const res = await request(app).get('/api/v1/metadata/instructor');
        
        logResponse(res, 'Get Instructor Meta');
        
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('virtues');
        expect(res.body).to.have.property('teams');
        expect(res.body).to.have.property('categories');
    });

    it('[GET] /api/v1/metadata/teams - 팀 목록 조회 (Success)', async () => {
        const res = await request(app).get('/api/v1/metadata/teams');
        
        logResponse(res, 'Get Teams');
        
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body[0].name).to.equal('초기테스트팀');
    });

    it('[GET] /api/v1/metadata/virtues - 덕목 목록 조회 (Success)', async () => {
        const res = await request(app).get('/api/v1/metadata/virtues');
        
        logResponse(res, 'Get Virtues');
        
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body[0].name).to.equal('초기테스트덕목');
    });

    // =================================================================
    // 🧪 2. Protected 조회 API (관리자 전용)
    // =================================================================

    it('[GET] /api/v1/metadata/templates - 템플릿 목록 조회 (Success)', async () => {
        const res = await request(app)
            .get('/api/v1/metadata/templates')
            .set('Authorization', `Bearer ${adminToken}`);
        
        logResponse(res, 'Get Templates');
        
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body[0].key).to.equal('TEMPORARY');
    });

    // =================================================================
    // 🧪 3. 수정 API - 팀 (Team)
    // =================================================================

    it('[PUT] /api/v1/metadata/teams/:id - 팀 수정 (Success)', async () => {
        const res = await request(app)
            .put(`/api/v1/metadata/teams/${teamId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: '수정된팀이름' });
        
        logResponse(res, 'Update Team (Success)');
        
        expect(res.status).to.equal(200);
        expect(res.body.name).to.equal('수정된팀이름');
    });

    it('[PUT] /api/v1/metadata/teams/:id - 필수값 누락 (Error 400)', async () => {
        // name 필드 없이 요청
        const res = await request(app)
            .put(`/api/v1/metadata/teams/${teamId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({}); 
        
        logResponse(res, 'Update Team (400 Bad Request)');
        
        expect(res.status).to.equal(400);
        expect(res.body.code).to.equal('VALIDATION_ERROR');
    });

    it('[PUT] /api/v1/metadata/teams/:id - 존재하지 않는 ID (Error 404)', async () => {
        const res = await request(app)
            .put('/api/v1/metadata/teams/99999')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Fail' });
        
        logResponse(res, 'Update Team (404 Not Found)');
        
        expect(res.status).to.equal(404);
        expect(res.body.code).to.equal('NOT_FOUND');
    });

    // =================================================================
    // 🧪 4. 수정 API - 덕목 (Virtue)
    // =================================================================

    it('[PUT] /api/v1/metadata/virtues/:id - 덕목 수정 (Success)', async () => {
        const res = await request(app)
            .put(`/api/v1/metadata/virtues/${virtueId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: '수정된덕목' });
        
        logResponse(res, 'Update Virtue (Success)');
        
        expect(res.status).to.equal(200);
        expect(res.body.name).to.equal('수정된덕목');
    });

    it('[PUT] /api/v1/metadata/virtues/:id - 필수값 누락 (Error 400)', async () => {
        const res = await request(app)
            .put(`/api/v1/metadata/virtues/${virtueId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({}); // name 없음
        
        logResponse(res, 'Update Virtue (400 Bad Request)');
        
        expect(res.status).to.equal(400);
        expect(res.body.code).to.equal('VALIDATION_ERROR');
    });

    it('[PUT] /api/v1/metadata/virtues/:id - 존재하지 않는 ID (Error 404)', async () => {
        const res = await request(app)
            .put('/api/v1/metadata/virtues/99999')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Fail' });
        
        logResponse(res, 'Update Virtue (404 Not Found)');
        
        expect(res.status).to.equal(404);
        expect(res.body.code).to.equal('NOT_FOUND');
    });

    // =================================================================
    // 🧪 5. 수정 API - 템플릿 (Template)
    // =================================================================

    it('[PUT] /api/v1/metadata/templates/:key - 템플릿 수정 (Success)', async () => {
        const res = await request(app)
            .put('/api/v1/metadata/templates/TEMPORARY')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: '변경타이틀', body: '변경본문' });
        
        logResponse(res, 'Update Template (Success)');
        
        expect(res.status).to.equal(200);
        expect(res.body.title).to.equal('변경타이틀');
    });

    it('[PUT] /api/v1/metadata/templates/:key - 필수값 누락 (Error 400)', async () => {
        const res = await request(app)
            .put('/api/v1/metadata/templates/TEMPORARY')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: '타이틀만보냄' }); // body 누락
        
        logResponse(res, 'Update Template (400 Bad Request)');
        
        expect(res.status).to.equal(400);
        expect(res.body.code).to.equal('VALIDATION_ERROR');
    });

    it('[PUT] /api/v1/metadata/templates/:key - 존재하지 않는 Key (Error 404)', async () => {
        const res = await request(app)
            .put('/api/v1/metadata/templates/INVALID_KEY')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Fail', body: 'Fail' });
        
        logResponse(res, 'Update Template (404 Not Found)');
        
        expect(res.status).to.equal(404);
        expect(res.body.code).to.equal('NOT_FOUND');
    });
});