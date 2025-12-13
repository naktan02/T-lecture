// server/test/test-kakao-navi-multi.js
require('dotenv').config();

console.log('KAKAO_REST_API_KEY loaded?', !!process.env.KAKAO_REST_API_KEY);

const kakaoService = require('../../src/infra/kakao.service');
const distanceService = require('../src/domains/distance/services/distance.service');
const prisma = require('../../src/libs/prisma');

async function main() {
    try {
        console.log('🚀 Starting Kakao Navi MULTI Test...');

        // 1. 강사 3명 주소 (임시 예시)
        const instructorAddresses = [
        '서울특별시 용산구 한강대로 405',      // 서울역 근처
        '서울특별시 종로구 세종대로 175',      // 광화문 근처
        '서울특별시 마포구 양화로 45'          // 합정 근처
        ];

        // 2. 부대(목적지) 2개 주소 (임시 예시)
        const unitAddresses = [
        '서울특별시 서초구 서초대로 396',      // 교대역 근처
        '서울특별시 송파구 올림픽로 300'       // 잠실종합운동장 근처
        ];

        // 3. 오늘 사용량 baseline
        const now = new Date();
        const todayDate = new Date(Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
        ));

        let beforeUsage = await prisma.kakaoApiUsage.findUnique({
        where: { date: todayDate },
        });

        console.log('\n📊 Usage BEFORE:');
        console.log(beforeUsage || '   (no row yet)');

        // 4. 주소 → 좌표 변환 (중복 호출 줄이려고 미리 변환)
        console.log('\n🔄 Converting instructor addresses to coordinates...');
        const instructorCoords = [];
        for (const addr of instructorAddresses) {
        const c = await kakaoService.addressToCoordinates(addr);
        instructorCoords.push(c);
        console.log(`   [Instructor] ${addr} -> ${c.lat}, ${c.lng}`);
        }

        console.log('\n🔄 Converting unit addresses to coordinates...');
        const unitCoords = [];
        for (const addr of unitAddresses) {
        const c = await kakaoService.addressToCoordinates(addr);
        unitCoords.push(c);
        console.log(`   [Unit]       ${addr} -> ${c.lat}, ${c.lng}`);
        }

        // 5. 강사3 × 부대2 = 6 조합에 대해 거리 계산
        console.log('\n🚗 Calculating distances for all combinations (3 instructors × 2 units)...');

        let count = 0;

        for (let i = 0; i < instructorCoords.length; i++) {
        for (let j = 0; j < unitCoords.length; j++) {
            const origin = instructorCoords[i];
            const dest = unitCoords[j];

            console.log(`\n[Pair ${++count}] Instructor#${i + 1} -> Unit#${j + 1}`);
            console.log(`   Origin: ${origin.lat}, ${origin.lng}`);
            console.log(`   Dest:   ${dest.lat}, ${dest.lng}`);

            const result = await distanceService.calculateDistance(
            origin.lat,
            origin.lng,
            dest.lat,
            dest.lng
            );

            console.log('   ✅ Distance:', result.distance, 'm');
            console.log('   ✅ Duration:', result.duration, 'sec');
        }
        }

        // 6. 사용량 다시 확인
        const afterUsage = await prisma.kakaoApiUsage.findUnique({
        where: { date: todayDate },
        });

        console.log('\n📊 Usage AFTER:');
        console.log(afterUsage);

        if (beforeUsage && afterUsage) {
        console.log(
            `\n📈 routeCount diff: ${afterUsage.routeCount - beforeUsage.routeCount} (expected ~= ${count})`
        );
        console.log(
            `📈 geocodeCount diff: ${afterUsage.geocodeCount - beforeUsage.geocodeCount}`
        );
        } else if (!beforeUsage && afterUsage) {
        console.log(
            `\n📈 routeCount diff: ${afterUsage.routeCount} (expected ~= ${count})`
        );
        console.log(`📈 geocodeCount: ${afterUsage.geocodeCount}`);
        } else {
        console.log('\n⚠ kakaoApiUsage row not found even AFTER test.');
        }

        console.log('\n✅ MULTI test done. (총 호출 수:', count, ')');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
        console.error('   Response data:', error.response.data);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
