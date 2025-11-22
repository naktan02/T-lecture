// test/api-scenario-full.js
const axios = require('axios');
const readline = require('readline');

// ==========================================
// 설정 (환경에 맞게 수정하세요)
// ==========================================
const BASE_URL = 'http://localhost:3000/api/v1';

// 테스트용 관리자 계정 (DB에 미리 존재해야 함)
const ADMIN_CREDENTIALS = {
    email: 'admin@t-lecture.com', // .env의 ADMIN_EMAIL과 같아야 함!
    password: 'admin'             // .env의 ADMIN_PASSWORD와 같아야 함!
};

// 새로 생성할 테스트 강사 정보
const TEST_USER = {
    email: `jmgjgm102@gmail.com`,
    password: '1234',
    name: '테스트강사',
    phoneNumber: '010-1234-5678',
    role: 'INSTRUCTOR',
    address: '경기도 양주시 평화로 1234' // 강사는 주소 필수
};

// 테스트용 부대 정보
const TEST_UNIT = {
    unitType: 'Army',
    name: `제${Math.floor(Math.random() * 99)}사단`,
    wideArea: '경기',
    region: '양주',
    addressDetail: '경기도 양주시 남면 ...',
    lat: 37.12345,
    lng: 127.12345,
    educationStart: new Date('2025-03-01').toISOString(),
    educationEnd: new Date('2025-03-03').toISOString(),
    workStartTime: new Date('2025-03-01T09:00:00').toISOString(),
    workEndTime: new Date('2025-03-01T18:00:00').toISOString(),
    officerName: '김작전',
    officerPhone: '010-9999-8888',
    officerEmail: 'army@mil.kr',
    // 중첩 생성 테스트
    schedules: [
        { date: new Date('2025-03-01').toISOString() },
        { date: new Date('2025-03-02').toISOString() }
    ]
};

// ==========================================
// 유틸리티
// ==========================================
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const log = (step, msg) => console.log(`\n[Step ${step}] ${msg}`);
const errorLog = (err) => {
    console.error('❌ FAILED');
    if (err.response) {
        console.error(`   Status: ${err.response.status}`);
        console.error(`   Message:`, err.response.data);
    } else {
        console.error(`   Error: ${err.message}`);
    }
    process.exit(1);
};

// ==========================================
// 메인 시나리오
// ==========================================
async function runTest() {
    let adminToken = null;
    let userToken = null;
    let newUserId = null;
    let createdUnitId = null;

    console.log('🚀 전체 API 통합 테스트 시작 (Distance 제외)...\n');

    try {
        // ---------------------------------------------------------
        // 1. 관리자 로그인 (Admin Token 확보)
        // ---------------------------------------------------------
        log(1, '관리자 로그인 시도...');
        const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
        adminToken = adminLoginRes.data.accessToken;
        console.log('✅ 관리자 로그인 성공');

        // ---------------------------------------------------------
        // 2. 회원가입 프로세스 (Auth)
        // ---------------------------------------------------------
        log(2, `인증번호 발송 요청 (${TEST_USER.email})...`);
        await axios.post(`${BASE_URL}/auth/code/send`, { email: TEST_USER.email });
        console.log('✅ 인증번호 발송됨. (서버 로그 또는 DB 확인 필요)');

        // 사용자 입력 대기
        await new Promise((resolve) => {
            rl.question('👉 서버 로그에 찍힌 인증번호 6자리를 입력하세요: ', async (code) => {
                try {
                    log(3, '인증번호 검증 시도...');
                    await axios.post(`${BASE_URL}/auth/code/verify`, {
                        email: TEST_USER.email,
                        code: code.trim()
                    });
                    console.log('✅ 이메일 인증 성공');
                    resolve();
                } catch (e) { errorLog(e); }
            });
        });

        log(4, '회원가입 요청 (INSTRUCTOR)...');
        const registerRes = await axios.post(`${BASE_URL}/auth/register`, TEST_USER);
        newUserId = registerRes.data.id;
        console.log(`✅ 회원가입 요청 완료 (ID: ${newUserId}, Status: PENDING)`);

        log(5, '승인 전 로그인 시도 (실패해야 함)...');
        try {
            await axios.post(`${BASE_URL}/auth/login`, {
                email: TEST_USER.email,
                password: TEST_USER.password
            });
            throw new Error('승인 전 로그인이 성공하면 안됩니다.');
        } catch (e) {
            if (e.response && e.response.data.error.includes('대기')) {
                console.log('✅ 예상대로 로그인 실패 (승인 대기 중 메시지 확인)');
            } else {
                throw e;
            }
        }

        // ---------------------------------------------------------
        // 3. 관리자 회원 관리 (Admin)
        // ---------------------------------------------------------
        log(6, '승인 대기 목록 조회 (Admin)...');
        const pendingRes = await axios.get(`${BASE_URL}/admin/users/pending`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const isExist = pendingRes.data.some(u => u.id === newUserId);
        console.log(`✅ 대기 목록 조회 성공 (방금 가입한 유저 존재 확인: ${isExist})`);

        log(7, '유저 승인 처리 (Approve)...');
        await axios.patch(
            `${BASE_URL}/admin/users/${newUserId}/approve`,
            { role: 'INSTRUCTOR' },
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        console.log('✅ 유저 승인 완료');

        // ---------------------------------------------------------
        // 4. 강사 기능 테스트 (Instructor & UserMe)
        // ---------------------------------------------------------
        log(8, '승인 후 강사 로그인...');
        const userLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });
        userToken = userLoginRes.data.accessToken;
        console.log('✅ 강사 로그인 성공');

        log(9, '내 프로필 조회 (UserMe)...');
        const profileRes = await axios.get(`${BASE_URL}/users/me`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log(`✅ 프로필 조회: ${profileRes.data.name} (${profileRes.data.role})`);

        log(10, '내 프로필 수정 (UserMe)...');
        await axios.patch(`${BASE_URL}/users/me`, 
            { name: '변경된이름' },
            { headers: { Authorization: `Bearer ${userToken}` } }
        );
        console.log('✅ 프로필 이름 수정 완료');

        log(11, '근무 가능일 설정 (Instructor)...');
        await axios.put(`${BASE_URL}/instructor/availability`, 
            {
                year: 2025,
                month: 5,
                dates: ["2025-05-10", "2025-05-11", "2025-05-20"]
            },
            { headers: { Authorization: `Bearer ${userToken}` } }
        );
        console.log('✅ 근무 가능일 설정 완료');

        log(12, '근무 가능일 조회 (Instructor)...');
        const availRes = await axios.get(`${BASE_URL}/instructor/availability?year=2025&month=5`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('✅ 설정된 날짜 확인:', availRes.data);

        // ---------------------------------------------------------
        // 5. 부대 관리 테스트 (Unit - Admin Only)
        // ---------------------------------------------------------
        log(13, '부대 생성 (Unit)...');
        const unitRes = await axios.post(`${BASE_URL}/units`, TEST_UNIT, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        createdUnitId = unitRes.data.id;
        console.log(`✅ 부대 생성 완료 (ID: ${createdUnitId})`);

        log(14, '부대 목록 조회...');
        const unitListRes = await axios.get(`${BASE_URL}/units`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`✅ 부대 목록 조회 성공 (총 ${unitListRes.data.length}개)`);

        log(15, '부대 상세 조회...');
        const unitDetailRes = await axios.get(`${BASE_URL}/units/${createdUnitId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`✅ 부대 상세 조회 성공: ${unitDetailRes.data.name}`);

        log(16, '부대 정보 수정...');
        await axios.put(`${BASE_URL}/units/${createdUnitId}`, 
            { officerName: '박변경' },
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        console.log('✅ 부대 담당자 이름 수정 완료');

        // ---------------------------------------------------------
        // 6. 관리자 유저 관리 (Admin)
        // ---------------------------------------------------------
        log(17, '전체 유저 목록 조회 (Admin)...');
        const allUsersRes = await axios.get(`${BASE_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`✅ 전체 유저 조회 성공 (총 ${allUsersRes.data.length}명)`);

        log(18, '특정 유저 상세 조회 (Admin)...');
        const userDetailRes = await axios.get(`${BASE_URL}/admin/users/${newUserId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`✅ 유저 상세 조회 성공: ${userDetailRes.data.userEmail}`);

        // ---------------------------------------------------------
        // 7. 정리 (Cleanup)
        // ---------------------------------------------------------
        log(19, '테스트 데이터 정리 (부대 삭제)...');
        await axios.delete(`${BASE_URL}/units/${createdUnitId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ 부대 삭제 완료');

        log(20, '테스트 데이터 정리 (회원 탈퇴)...');
        // 회원 탈퇴 API는 본인이 호출
        await axios.delete(`${BASE_URL}/users/me`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('✅ 회원 탈퇴 완료');

        console.log('\n🎉 모든 테스트 시나리오가 성공적으로 완료되었습니다!');

    } catch (error) {
        errorLog(error);
    } finally {
        rl.close();
    }
}

runTest();