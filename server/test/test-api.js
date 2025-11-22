// server/test/api-scenario.js
const axios = require('axios');
const readline = require('readline');

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_EMAIL = `instructor_${Date.now()}@test.com`;
const TEST_PASSWORD = 'password123';

// 입력을 받기 위한 인터페이스
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function runTest() {
    try {
        console.log('🚀 API 시나리오 테스트 시작...\n');

        // 1. 관리자 로그인 (Seed 데이터)
        console.log('1. [Admin] 로그인 시도...');
        const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@t-lecture.com',
            password: 'admin'
        });
        const adminToken = adminLoginRes.data.accessToken;
        console.log('✅ 관리자 로그인 성공\n');

        // 2. 인증번호 발송
        console.log(`2. [Auth] 인증번호 발송 요청 (${TEST_EMAIL})...`);
        await axios.post(`${BASE_URL}/auth/code/send`, { email: TEST_EMAIL });
        console.log('✅ 인증번호 발송 요청 완료.');
        console.log('⚠️  서버 로그나 DB(email_verifications)에서 6자리 인증번호를 확인하세요.');

        // 3. 인증번호 입력 및 검증
        await new Promise((resolve) => {
            rl.question('👉 인증번호 6자리를 입력하세요: ', async (code) => {
                try {
                    await axios.post(`${BASE_URL}/auth/code/verify`, {
                        email: TEST_EMAIL,
                        code: code.trim()
                    });
                    console.log('✅ 이메일 인증 성공\n');
                    resolve();
                } catch (error) {
                    console.error('❌ 인증 실패:', error.response?.data?.error || error.message);
                    process.exit(1);
                }
            });
        });

        // 4. 회원가입
        console.log('4. [Auth] 강사 회원가입 요청...');
        const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            name: '테스트강사',
            phoneNumber: '010-1111-2222',
            role: 'INSTRUCTOR',
            address: '서울특별시 용산구 한강대로 405'
        });
        const newUserId = registerRes.data.id;
        console.log(`✅ 회원가입 요청 완료 (ID: ${newUserId}, Status: PENDING)\n`);

        // 5. 관리자 승인
        console.log(`5. [Admin] 회원 승인 처리 (ID: ${newUserId})...`);
        await axios.patch(
            `${BASE_URL}/admin/users/${newUserId}/approve`,
            { role: 'INSTRUCTOR' },
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        console.log('✅ 회원 승인 완료\n');

        // 6. 강사 로그인
        console.log('6. [Instructor] 로그인 시도...');
        const userLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        const userToken = userLoginRes.data.accessToken;
        console.log('✅ 강사 로그인 성공\n');

        // 7. 내 정보 조회
        console.log('7. [User] 내 프로필 조회...');
        const profileRes = await axios.get(`${BASE_URL}/users/me`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('✅ 프로필 조회 성공:', profileRes.data.userEmail, '\n');

        // 8. 근무 가능일 설정 (강사 전용)
        console.log('8. [Instructor] 근무 가능일 설정...');
        await axios.put(`${BASE_URL}/instructor/availability`, {
            year: 2025,
            month: 12,
            dates: ["2025-12-01", "2025-12-02"]
        }, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('✅ 근무 가능일 설정 완료\n');

        console.log('🎉 모든 테스트가 성공적으로 완료되었습니다!');

    } catch (error) {
        console.error('❌ 테스트 중 오류 발생:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, error.response.data);
        } else {
            console.error(error.message);
        }
    } finally {
        rl.close();
    }
}

runTest();