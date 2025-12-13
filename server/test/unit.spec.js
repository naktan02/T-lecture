const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/server'); 
const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 로그 헬퍼 (성공/실패 모두 출력)
const logResponse = (method, url, status, body) => {
  console.log(`\n👉 [${method}] ${url} (Status: ${status})`);
  
  // 204 (No Content)는 본문이 없으므로 제외하고, 나머지는 모두 출력
  if (status !== 204) {
    console.log('📦 Response JSON:');
    console.log(JSON.stringify(body, null, 2));
  }
  console.log('--------------------------------------------------');
};

describe('📋 Unit(부대) API 통합 테스트', () => {
  
  let adminToken;      // 관리자 토큰
  let createdUnitId;   // 생성된 부대 ID
  let createdScheduleId; // 생성된 일정 ID

  // [사전 작업] 관리자 로그인하여 토큰 확보 (Seed 데이터 계정 사용)
  before((done) => {
    request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@t-lecture.com', 
        password: 'admin',            
        loginType: 'ADMIN' // 관리자 로그인 타입 명시
      })
      .end((err, res) => {
        if (err) return done(err);
        adminToken = res.body.accessToken;
        console.log('\n🔑 관리자 토큰 확보 완료');
        done();
      });
  });

  // ============================================================
  // 1. 단건 등록 (Create) - ✅ TrainingLocation 상세 필드 검증 추가
  // ============================================================
  it('1. [POST] /units - 신규 부대를 단건 등록하고 모든 필드를 검증해야 한다', (done) => {
    const newUnit = {
      name: 'Mocha단건부대',
      unitType: 'Army',
      wideArea: '경기',
      region: '파주',
      addressDetail: '경기도 파주시 문산읍 임진각로 148',
      officerName: '김단건',
      officerPhone: '010-1111-1111',
      officerEmail: 'single@mil.kr',
      
      // 일정 및 교육장소 (중첩 데이터)
      schedules: ['2025-06-01', '2025-06-02'], 
      trainingLocations: [
        { 
          originalPlace: '대강당', 
          changedPlace: '강의동 101호', // [신규 필드]
          plannedCount: 100, 
          instructorsNumbers: 3, // [신규 필드]
          hasInstructorLounge: true, // [신규 필드]
          hasWomenRestroom: false, // [신규 필드]
          note: '빔프로젝터 있음' 
        }
      ]
    };

    request(app)
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`) // 관리자 토큰 필수
      .send(newUnit)
      .expect(201)
      .end(async (err, res) => {
        logResponse('POST', '/api/v1/units', res.status, res.body);
        if (err) return done(err);
        
        // [검증 1] 응답 기본 구조 확인
        expect(res.body.result).to.equal('Success');
        expect(res.body.data.name).to.equal('Mocha단건부대');
        expect(res.body.data.schedules).to.be.an('array');
        
        createdUnitId = res.body.data.id; // 다음 테스트를 위해 ID 저장

        // [검증 2] DB에서 TrainingLocation 상세 필드 검증
        const location = await prisma.trainingLocation.findFirst({
            where: { unitId: createdUnitId }
        });
        
        expect(location).to.not.be.null;
        expect(location.originalPlace).to.equal('대강당');
        expect(location.changedPlace).to.equal('강의동 101호'); // String 필드 검증
        expect(location.instructorsNumbers).to.equal(3); // Number 필드 검증
        expect(location.hasInstructorLounge).to.be.true; // Boolean true 검증
        expect(location.hasWomenRestroom).to.be.false;  // Boolean false 검증

        done();
      });
  });

  // ============================================================
  // 2. 엑셀 일괄 등록 (Upload) - ✅ TrainingLocation 상세 필드 검증 추가
  // ============================================================
  it('2. [POST] /units/upload/excel - 엑셀 파일로 부대를 일괄 등록해야 한다', (done) => {
    // unit.mapper.js의 excelRowToRawUnit 함수가 기대하는 '한글 헤더' 사용
    const excelData = [
      { 
        '부대명': '엑셀부대_A', 
        '군구분': 'Army', 
        '광역': '충남', 
        '지역': '계룡', 
        '주소': '충청남도 계룡시 신도안면',
        '담당자명': '박육군',
        '연락처': '010-2222-3333',
        '이메일': 'army@test.com',
        '교육일정': '2025-07-01, 2025-07-02', 
        '교육장소명': '본청 대회의실',
        '계획인원': 200,
        // [신규 필드] - unit.mapper.js에 매핑된 한글 헤더 사용
        '투입강사수': 5, 
        '강사휴게실여부': 'O', 
        '수탁급식여부': true, // boolean 값도 mapper에서 처리
        '변경교육장소명': '신규 강의실',
        '비고': '보안 서약서 필요'
      },
      { 
        '부대명': '엑셀부대_B', 
        '군구분': 'Navy', 
        '광역': '경기', 
        '지역': '평택', 
        '주소': '경기도 평택시 포승읍',
        '담당자명': '이해군',
        '연락처': '010-4444-5555',
        '이메일': 'navy@test.com',
        '교육일정': '2025-08-15',
        '교육장소명': '해군 회관',
        '계획인원': 150
      }
    ];

    // SheetJS를 사용하여 가짜 엑셀 파일(Buffer) 생성
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(excelData);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    request(app)
      .post('/api/v1/units/upload/excel')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', excelBuffer, 'test_full_data.xlsx') // 파일 첨부
      .expect(201)
      .end(async (err, res) => {
        logResponse('POST', '/api/v1/units/upload/excel', res.status, res.body);
        if (err) return done(err);
        
        // [검증] 응답 구조: { result: "Success", message: "...", data: { count: N } }
        expect(res.body.result).to.equal('Success');
        expect(res.body.message).to.include('2개');
        expect(res.body.data.count).to.equal(2);

        // [DB 검증] 엑셀로 등록된 부대의 상세 필드가 올바르게 저장되었는지 확인
        const unitA = await prisma.unit.findFirst({ where: { name: '엑셀부대_A' }, include: { trainingLocations: true } });
        expect(unitA.trainingLocations[0].instructorsNumbers).to.equal(5);
        expect(unitA.trainingLocations[0].hasInstructorLounge).to.be.true; // 'O' -> true
        expect(unitA.trainingLocations[0].changedPlace).to.equal('신규 강의실');
        
        done();
      });
  });

  // ============================================================
  // 3. 목록 조회 (Read List)
  // ============================================================
  it('3. [GET] /units - 부대 목록을 조회해야 한다 (검색 포함)', (done) => {
    request(app)
      .get('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ keyword: '엑셀', page: 1, limit: 10 }) // 방금 엑셀로 넣은 부대 검색
      .expect(200)
      .end((err, res) => {
        logResponse('GET', '/api/v1/units?keyword=엑셀', res.status, res.body);
        if (err) return done(err);
        
        // [검증] 응답 구조: { result: "Success", data: { data: [], meta: {} } }
        expect(res.body.result).to.equal('Success');
        expect(res.body.data.data).to.be.an('array');
        expect(res.body.data.data.length).to.be.at.least(1);
        done();
      });
  });

  // ============================================================
  // 4. 상세 조회 (Read Detail)
  // ============================================================
  it('4. [GET] /units/:id - 부대 상세 정보를 조회해야 한다', (done) => {
    request(app)
      .get(`/api/v1/units/${createdUnitId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .end((err, res) => {
        logResponse('GET', `/api/v1/units/${createdUnitId}`, res.status, res.body);
        if (err) return done(err);
        
        // [검증] 응답 구조: { result: "Success", data: { ... } }
        expect(res.body.result).to.equal('Success');
        expect(res.body.data.id).to.equal(createdUnitId);
        expect(res.body.data.schedules).to.be.an('array');
        // 부대 상세 조회 시 TrainingLocation의 변경된 필드도 포함됨을 간접 확인
        expect(res.body.data.trainingLocations[0].changedPlace).to.equal('강의동 101호'); 
        done();
      });
  });

  // ============================================================
  // 5. 기본 정보 수정 (Update Basic)
  // ============================================================
  it('5. [PATCH] /units/:id/basic - 부대 기본 정보를 수정해야 한다', (done) => {
    request(app)
      .patch(`/api/v1/units/${createdUnitId}/basic`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '수정된Mocha부대', region: '서울' })
      .expect(200)
      .end((err, res) => {
        logResponse('PATCH', `/api/v1/units/${createdUnitId}/basic`, res.status, res.body);
        if (err) return done(err);
        
        expect(res.body.result).to.equal('Success');
        expect(res.body.data.name).to.equal('수정된Mocha부대');
        expect(res.body.data.region).to.equal('서울');
        done();
      });
  });

  // ============================================================
  // 6. 담당자 정보 수정 (Update Officer)
  // ============================================================
  it('6. [PATCH] /units/:id/officer - 부대 담당자 정보를 수정해야 한다', (done) => {
    request(app)
      .patch(`/api/v1/units/${createdUnitId}/officer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ officerName: '최변경', officerPhone: '010-9999-8888' })
      .expect(200)
      .end((err, res) => {
        logResponse('PATCH', `/api/v1/units/${createdUnitId}/officer`, res.status, res.body);
        if (err) return done(err);
        
        expect(res.body.result).to.equal('Success');
        expect(res.body.data.officerName).to.equal('최변경');
        done();
      });
  });

  // ============================================================
  // 7. 일정 추가 (Sub-resource Create)
  // ============================================================
  it('7. [POST] /units/:id/schedules - 교육 일정을 추가해야 한다', (done) => {
    request(app)
      .post(`/api/v1/units/${createdUnitId}/schedules`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ date: '2025-12-25' })
      .expect(201)
      .end((err, res) => {
        logResponse('POST', `/api/v1/units/${createdUnitId}/schedules`, res.status, res.body);
        if (err) return done(err);
        
        expect(res.body.result).to.equal('Success');
        expect(res.body.data.date).to.include('2025-12-25');
        
        createdScheduleId = res.body.data.id; // 삭제 테스트를 위해 ID 저장
        done();
      });
  });

  // ============================================================
  // 8. 일정 삭제 (Sub-resource Delete)
  // ============================================================
  it('8. [DELETE] /units/:id/schedules/:scheduleId - 교육 일정을 삭제해야 한다', (done) => {
    request(app)
      .delete(`/api/v1/units/${createdUnitId}/schedules/${createdScheduleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .end((err, res) => {
        logResponse('DELETE', `/api/v1/units/${createdUnitId}/schedules/${createdScheduleId}`, res.status, res.body);
        if (err) return done(err);
        
        expect(res.body.result).to.equal('Success');
        expect(res.body.message).to.include('삭제');
        done();
      });
  });

  // ============================================================
  // 9. 부대 삭제 (Delete) - [정리]
  // ============================================================
  it('9. [DELETE] /units/:id - 부대를 영구 삭제해야 한다', (done) => {
    request(app)
      .delete(`/api/v1/units/${createdUnitId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204) // No Content (Body 없음)
      .end(async (err, res) => {
        logResponse('DELETE', `/api/v1/units/${createdUnitId}`, res.status, {});
        if (err) return done(err);
        
        // 엑셀로 만든 부대들도 정리
        const excelUnits = await prisma.unit.findMany({ where: { name: { startsWith: '엑셀부대_' } } });
        for (const unit of excelUnits) {
            await prisma.unit.delete({ where: { id: unit.id } }).catch(() => {});
        }

        done();
      });
  });

});