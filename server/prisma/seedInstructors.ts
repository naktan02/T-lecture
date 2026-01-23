// server/prisma/seedInstructors.ts
// 실제 강사 일정 데이터 기반 강사 50명 생성
// 실행: npx tsx prisma/seedInstructors.ts

/* eslint-disable no-console */

import 'dotenv/config';
import { UserCategory } from '../src/generated/prisma/client.js';
import prisma from '../src/libs/prisma.js';
import bcrypt from 'bcrypt';
import ExcelJS from 'exceljs';
import axios from 'axios';

// 전국 실제 도로명주소 50개 (Kakao API로 좌표 변환 예정)
const REAL_ADDRESSES = [
  // 서울 (15곳)
  '서울특별시 강남구 테헤란로 152',
  '서울특별시 서초구 서초대로 396',
  '서울특별시 송파구 올림픽로 300',
  '서울특별시 마포구 월드컵북로 396',
  '서울특별시 영등포구 여의대로 108',
  '서울특별시 종로구 세종대로 209',
  '서울특별시 용산구 한강대로 405', // 용산구청
  '서울특별시 광진구 능동로 120',
  '서울특별시 강서구 공항대로 247',
  '서울특별시 강동구 천호대로 1017',
  '서울특별시 노원구 동일로 1414',
  '서울특별시 은평구 은평로 195', // 은평구청
  '서울특별시 관악구 관악로 145',
  '서울특별시 동대문구 천호대로 145', // 동대문구청
  '서울특별시 성북구 성북로 76',

  // 경기 (15곳)
  '경기도 성남시 분당구 판교역로 166',
  '경기도 수원시 영통구 광교로 156',
  '경기도 용인시 처인구 중부대로 1199', // 용인시청
  '경기도 고양시 일산동구 중앙로 1286',
  '경기도 파주시 문발로 242',
  '경기도 화성시 남양읍 시청로 159', // 화성시청
  '경기도 안양시 동안구 시민대로 230',
  '경기도 부천시 길주로 210',
  '경기도 안산시 단원구 광덕대로 142',
  '경기도 의정부시 청사로 1', // 의정부시청
  '경기도 남양주시 경춘로 1037',
  '경기도 평택시 평택로 51',
  '경기도 시흥시 시청로 20', // 시흥시청
  '경기도 김포시 걸포로 170', // 김포시청
  '경기도 광주시 파발로 155', // 광주시청

  // 인천 (3곳)
  '인천광역시 연수구 컨벤시아대로 165',
  '인천광역시 남동구 예술로 198',
  '인천광역시 부평구 부평대로 168',

  // 강원 (2곳)
  '강원특별자치도 춘천시 중앙로 1',
  '강원특별자치도 원주시 서원대로 158',

  // 충청 (5곳)
  '충청남도 천안시 동남구 대흥로 215',
  '충청북도 청주시 상당구 상당로 155',
  '대전광역시 유성구 대학로 99',
  '충청남도 아산시 번영로 224',
  '충청북도 청주시 흥덕구 가로수로 1462', // 청주 청사

  // 전라 (5곳)
  '전북특별자치도 전주시 완산구 효자로 225',
  '광주광역시 서구 내방로 111',
  '전라남도 여수시 시청로 1',
  '전북특별자치도 익산시 인북로 140', // 익산시청
  '전라남도 목포시 평화로 29',

  // 경상 (5곳)
  '경상북도 포항시 남구 시청로 1', // 포항시청
  '부산광역시 해운대구 센텀중앙로 79',
  '경상남도 창원시 성산구 중앙대로 151',
  '대구광역시 중구 공평로 88',
  '울산광역시 남구 삼산로 257',
];

// Kakao Local API를 사용해서 주소를 위도/경도로 변환
async function getCoordinatesFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;

  if (!kakaoApiKey) {
    console.warn('⚠️ KAKAO_REST_API_KEY가 설정되지 않았습니다. 좌표 변환을 건너뜁니다.');
    return null;
  }

  try {
    const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
      headers: {
        Authorization: `KakaoAK ${kakaoApiKey}`,
      },
      params: {
        query: address,
      },
    });

    if (response.data.documents && response.data.documents.length > 0) {
      const { x, y } = response.data.documents[0];
      return { lat: parseFloat(y), lng: parseFloat(x) };
    }

    console.warn(`⚠️ 좌표를 찾을 수 없음: ${address}`);
    return null;
  } catch (error) {
    console.error(`❌ Kakao API 호출 실패 (${address}):`, error);
    return null;
  }
}

// 주소 목록을 좌표로 변환 (캐싱)
async function convertAddressesToCoordinates() {
  console.log('🗺️ Kakao API로 주소를 좌표로 변환 중...');
  const locations: Array<{ address: string; lat: number; lng: number }> = [];

  for (const address of REAL_ADDRESSES) {
    const coords = await getCoordinatesFromAddress(address);
    if (coords) {
      locations.push({ address, ...coords });
      console.log(`  ✅ ${address} -> (${coords.lat}, ${coords.lng})`);
    } else {
      // 좌표를 못 가져온 경우 기본값 사용 (서울시청 근처)
      locations.push({ address, lat: 37.5665, lng: 126.978 });
      console.log(`  ⚠️ ${address} -> 기본 좌표 사용`);
    }
    // API 호출 제한을 피하기 위한 딜레이
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`  ✅ 총 ${locations.length}개 주소 변환 완료\n`);
  return locations;
}

// 요일 매핑
const DAY_MAP: { [key: string]: number } = {
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
};

// 유틸리티 함수
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhoneNumber(): string {
  return `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
}

// 요일 문자열 파싱 ("월, 화" -> [1, 2])
function parseDays(dayString: string | null): number[] {
  if (!dayString) return [];
  if (dayString.includes('모두 가능')) return [1, 2, 3, 4, 5];
  if (dayString.includes('모두 불가능')) return [];

  const days: number[] = [];
  for (const [dayName, dayNum] of Object.entries(DAY_MAP)) {
    if (dayString.includes(dayName)) {
      days.push(dayNum);
    }
  }
  return days;
}

// 주차 날짜 범위 정의 (2026년 1-2월, 엑셀 데이터의 7-8월을 1-2월로 변경)
const WEEK_RANGES = [
  { start: new Date(Date.UTC(2026, 0, 5)), days: 5 }, // 1/5(월)~1/9(금)
  { start: new Date(Date.UTC(2026, 0, 12)), days: 5 }, // 1/12(월)~1/16(금)
  { start: new Date(Date.UTC(2026, 0, 19)), days: 5 }, // 1/19(월)~1/23(금)
  { start: new Date(Date.UTC(2026, 0, 26)), days: 5 }, // 1/26(월)~1/30(금)
  { start: new Date(Date.UTC(2026, 1, 2)), days: 5 }, // 2/2(월)~2/6(금)
];

// Excel에서 강사 일정 읽기
async function readInstructorSchedule() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('../instruct_schedule.xlsx');

  const sheet = workbook.worksheets[0]; // 7월 시트
  const instructors: Array<{ name: string; availableDates: Date[] }> = [];

  // Row 2부터 강사 데이터 (Row 1은 헤더)
  for (let rowNum = 2; rowNum <= sheet.rowCount && instructors.length < 50; rowNum++) {
    const row = sheet.getRow(rowNum);
    const name = row.getCell(2).value as string; // 성함
    if (!name) continue;

    const availableDates: Date[] = [];

    // 각 주차별 가능한 요일 파싱 (컬럼 3~7: 5개 주차)
    for (let weekIdx = 0; weekIdx < 5 && weekIdx < WEEK_RANGES.length; weekIdx++) {
      const cellValue = row.getCell(3 + weekIdx).value;
      const dayString = cellValue ? String(cellValue) : null;
      const days = parseDays(dayString);

      // 해당 주의 시작일로부터 가능한 요일에 해당하는 날짜 생성
      const weekStart = WEEK_RANGES[weekIdx].start;
      for (const day of days) {
        // day는 1(월)~5(금), 월요일이 weekStart이므로 day-1을 더함
        const date = new Date(weekStart);
        date.setUTCDate(date.getUTCDate() + (day - 1));
        availableDates.push(date);
      }
    }

    instructors.push({ name, availableDates });
  }

  return instructors;
}

export async function runSeedInstructors() {
  console.log('👥 실제 강사 데이터 생성 시작...\n');

  const password = await bcrypt.hash('test1234', 10);

  // 팀과 덕목 조회
  const teams = await prisma.team.findMany({ orderBy: { id: 'asc' } });
  const virtues = await prisma.virtue.findMany({ orderBy: { id: 'asc' } });

  if (teams.length === 0 || virtues.length === 0) {
    console.error('❌ 팀 또는 덕목 데이터가 없습니다. seedCore.ts를 먼저 실행하세요.');
    return;
  }

  if (teams.length !== 7) {
    console.error(`❌ 팀이 7개가 아닙니다. (현재: ${teams.length}개)`);
    return;
  }

  // Kakao API로 주소를 좌표로 변환
  const locations = await convertAddressesToCoordinates();

  // Excel에서 강사 일정 읽기
  console.log('📊 Excel 파일에서 강사 일정 읽는 중...');
  const scheduleData = await readInstructorSchedule();
  console.log(`  ✅ ${scheduleData.length}명의 강사 일정 로드 완료\n`);

  // 강사 분류 (주 20, 부/보조/실습 각 10)
  const categories: { type: UserCategory; count: number }[] = [
    { type: 'Main', count: 20 }, // 주강사 20명
    { type: 'Co', count: 10 }, // 부강사 10명
    { type: 'Assistant', count: 10 }, // 보조강사 10명
    { type: 'Practicum', count: 10 }, // 실습강 10명
  ];

  // 팀 배정: 7개 팀에 균등 분포 (50명 / 7팀 = 약 7명/팀)
  const teamAssignments: number[] = [];
  const instructorsPerTeam = Math.floor(50 / teams.length);
  const remainder = 50 % teams.length;

  for (let t = 0; t < teams.length; t++) {
    const count = instructorsPerTeam + (t < remainder ? 1 : 0);
    for (let i = 0; i < count; i++) {
      teamAssignments.push(teams[t].id);
    }
  }
  // 섞기
  teamAssignments.sort(() => Math.random() - 0.5);

  let instructorIndex = 0;
  const instructorIds: number[] = [];

  console.log('👨‍🏫 강사 50명 생성 중...');

  for (const { type, count } of categories) {
    for (let i = 0; i < count; i++) {
      if (instructorIndex >= scheduleData.length) {
        console.warn('⚠️ 스케줄 데이터가 부족합니다.');
        break;
      }

      const schedule = scheduleData[instructorIndex];
      const name = schedule.name;
      const email = `instructor${String(instructorIndex + 1).padStart(3, '0')}@test.com`;
      const phone = generatePhoneNumber();
      const location = locations[instructorIndex % locations.length];
      const teamId = teamAssignments[instructorIndex];

      // 팀장 설정: 주강사만 가능, 팀당 1명 필수
      let isTeamLeader = false;
      if (type === 'Main') {
        const existingLeader = await prisma.instructor.findFirst({
          where: { teamId, isTeamLeader: true },
        });
        if (!existingLeader) {
          isTeamLeader = true;
        }
      }

      try {
        const user = await prisma.user.create({
          data: {
            userEmail: email,
            password: password,
            name: name,
            userphoneNumber: phone,
            status: 'APPROVED',
            instructor: {
              create: {
                category: type,
                teamId: teamId,
                isTeamLeader: isTeamLeader,
                location: location.address,
                lat: location.lat,
                lng: location.lng,
                generation: randomInt(1, 25),
                restrictedArea: null, // 제한지역 없음
                hasCar: Math.random() > 0.3,
                profileCompleted: true,
              },
            },
          },
        });

        instructorIds.push(user.id);

        // 덕목 할당
        let virtueCount: number;
        if (type === 'Main') {
          virtueCount = virtues.length; // 주강사: 모든 덕목 (15개)
        } else if (type === 'Co') {
          virtueCount = 10; // 부강사: 10개
        } else if (type === 'Assistant') {
          virtueCount = 5; // 보조강사: 5개
        } else {
          virtueCount = 0; // 실습강: 없음
        }

        if (virtueCount > 0) {
          const shuffledVirtues = [...virtues].sort(() => Math.random() - 0.5);
          for (let v = 0; v < Math.min(virtueCount, shuffledVirtues.length); v++) {
            await prisma.instructorVirtue
              .create({
                data: { instructorId: user.id, virtueId: shuffledVirtues[v].id },
              })
              .catch(() => {}); // 중복 무시
          }
        }

        // 교육가능일 생성 (Excel에서 읽은 실제 일정)
        for (const date of schedule.availableDates) {
          await prisma.instructorAvailability
            .create({
              data: { instructorId: user.id, availableOn: date },
            })
            .catch(() => {}); // 중복 무시
        }

        // 강사 통계 초기화
        await prisma.instructorStats
          .create({
            data: {
              instructorId: user.id,
              legacyPracticumCount: type === 'Practicum' ? randomInt(0, 5) : 0,
              autoPromotionEnabled: true,
            },
          })
          .catch(() => {});

        if ((instructorIndex + 1) % 10 === 0) {
          console.log(`  ✅ 강사 ${instructorIndex + 1}/50 생성 완료`);
        }

        instructorIndex++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ 생성 실패: ${email}`, message);
      }
    }
  }

  console.log(`  ✅ 강사 총 ${instructorIndex}명 생성 완료\n`);

  console.log('='.repeat(50));
  console.log('📊 강사 생성 결과');
  console.log('='.repeat(50));
  console.log(`총 강사: ${instructorIndex}명`);
  console.log('  - 주강사(Main): 20명 (모든 덕목 가능, 팀장 가능)');
  console.log('  - 부강사(Co): 10명 (10개 덕목 가능)');
  console.log('  - 보조강사(Assistant): 10명 (5개 덕목 가능)');
  console.log('  - 실습강(Practicum): 10명 (덕목 없음)');
  console.log(`팀 배정: 7개 팀에 균등 분포`);
  console.log('제한지역: 없음');
  console.log('일정 데이터: instruct_schedule.xlsx 기반');
  console.log('='.repeat(50));
  console.log('🔐 테스트 비밀번호: test1234\n');
}

// 직접 실행 시
if (require.main === module) {
  runSeedInstructors()
    .catch((e) => {
      console.error('❌ 생성 실패:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
