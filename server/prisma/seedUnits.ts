// server/prisma/seedUnits.ts
// 부대 1000개 시드 데이터 생성 (자동 테스트용)
// 실행: npx tsx prisma/seedUnits.ts

/* eslint-disable no-console */

import { PrismaClient, MilitaryType } from '@prisma/client';

const prisma = new PrismaClient();

// 군구분 비율: 육군 60%, 해군/공군/해병/국직 각 10%
const MILITARY_TYPES: { type: MilitaryType; weight: number }[] = [
  { type: 'Army', weight: 60 },
  { type: 'Navy', weight: 10 },
  { type: 'AirForce', weight: 10 },
  { type: 'Marines', weight: 10 },
  { type: 'MND', weight: 10 },
];

// 광역/지역 데이터
const REGIONS: {
  wideArea: string;
  regions: string[];
  latRange: [number, number];
  lngRange: [number, number];
}[] = [
  {
    wideArea: '서울특별시',
    regions: ['용산구', '종로구', '강남구', '서초구', '송파구', '마포구', '영등포구'],
    latRange: [37.45, 37.6],
    lngRange: [126.85, 127.15],
  },
  {
    wideArea: '경기도',
    regions: [
      '수원시',
      '성남시',
      '고양시',
      '용인시',
      '부천시',
      '안산시',
      '화성시',
      '평택시',
      '의정부시',
      '파주시',
      '김포시',
    ],
    latRange: [37.1, 37.85],
    lngRange: [126.7, 127.4],
  },
  {
    wideArea: '인천광역시',
    regions: ['남동구', '연수구', '부평구', '계양구', '서구'],
    latRange: [37.35, 37.55],
    lngRange: [126.55, 126.8],
  },
  {
    wideArea: '강원도',
    regions: [
      '춘천시',
      '원주시',
      '강릉시',
      '속초시',
      '철원군',
      '화천군',
      '양구군',
      '인제군',
      '홍천군',
    ],
    latRange: [37.3, 38.3],
    lngRange: [127.5, 129.0],
  },
  {
    wideArea: '충청남도',
    regions: ['천안시', '공주시', '보령시', '아산시', '논산시', '계룡시', '서산시'],
    latRange: [36.3, 36.95],
    lngRange: [126.5, 127.3],
  },
  {
    wideArea: '충청북도',
    regions: ['청주시', '충주시', '제천시', '진천군', '음성군', '괴산군'],
    latRange: [36.45, 37.15],
    lngRange: [127.2, 128.0],
  },
  {
    wideArea: '전라북도',
    regions: ['전주시', '군산시', '익산시', '정읍시', '남원시', '김제시'],
    latRange: [35.4, 36.1],
    lngRange: [126.7, 127.5],
  },
  {
    wideArea: '전라남도',
    regions: ['목포시', '여수시', '순천시', '나주시', '광양시', '담양군'],
    latRange: [34.5, 35.3],
    lngRange: [126.3, 127.8],
  },
  {
    wideArea: '경상북도',
    regions: ['포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시'],
    latRange: [35.8, 36.9],
    lngRange: [128.3, 129.5],
  },
  {
    wideArea: '경상남도',
    regions: ['창원시', '진주시', '통영시', '김해시', '거제시', '양산시', '밀양시'],
    latRange: [34.9, 35.6],
    lngRange: [128.0, 129.1],
  },
  {
    wideArea: '대전광역시',
    regions: ['동구', '서구', '유성구', '대덕구', '중구'],
    latRange: [36.25, 36.45],
    lngRange: [127.3, 127.5],
  },
  {
    wideArea: '대구광역시',
    regions: ['동구', '서구', '남구', '북구', '수성구', '달서구'],
    latRange: [35.8, 35.95],
    lngRange: [128.5, 128.75],
  },
  {
    wideArea: '부산광역시',
    regions: ['영도구', '해운대구', '남구', '동래구', '사하구', '금정구'],
    latRange: [35.05, 35.25],
    lngRange: [128.95, 129.2],
  },
];

const LAST_NAMES = [
  '김',
  '이',
  '박',
  '최',
  '정',
  '강',
  '조',
  '윤',
  '장',
  '임',
  '한',
  '오',
  '서',
  '신',
  '권',
  '황',
];
const FIRST_NAMES = [
  '민준',
  '서준',
  '도윤',
  '예준',
  '시우',
  '하준',
  '지호',
  '주원',
  '현우',
  '도현',
  '지훈',
  '건우',
  '우진',
  '성민',
  '재원',
  '태현',
];
const PLACES = [
  '대강당',
  '연병장',
  '체육관',
  '교육관',
  '회의실',
  '다목적실',
  '세미나실',
  '훈련장',
  '교육센터',
  '강의실',
];

// 유틸리티 함수
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function getMilitaryType(): MilitaryType {
  const rand = randomInt(1, 100);
  let cumulative = 0;
  for (const { type, weight } of MILITARY_TYPES) {
    cumulative += weight;
    if (rand <= cumulative) return type;
  }
  return 'Army';
}

function generateUnitName(
  level: 'corps' | 'division' | 'brigade' | 'battalion' | 'company' | 'platoon',
  index: number,
): string {
  const corpsNum = (index % 8) + 1; // 1~8군단
  const divisionNum = (index % 30) + 1; // 1~30사단
  const brigadeNum = (index % 10) + 1; // 1~10여단
  const battalionNum = (index % 5) + 1; // 1~5대대
  const companyNum = (index % 4) + 1; // 1~4중대
  const platoonNum = (index % 3) + 1; // 1~3소대

  switch (level) {
    case 'corps':
      return `제${corpsNum}군단`;
    case 'division':
      return `제${corpsNum}군단 제${divisionNum}사단`;
    case 'brigade':
      return `제${corpsNum}군단 제${divisionNum}사단 제${brigadeNum}여단`;
    case 'battalion':
      return `제${corpsNum}군단 제${divisionNum}사단 제${brigadeNum}여단 제${battalionNum}대대`;
    case 'company':
      return `제${corpsNum}군단 제${divisionNum}사단 제${brigadeNum}여단 제${battalionNum}대대 제${companyNum}중대`;
    case 'platoon':
      return `제${corpsNum}군단 제${divisionNum}사단 제${brigadeNum}여단 제${battalionNum}대대 제${platoonNum}소대`;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function runSeedUnits() {
  console.log('🏢 부대 1000개 생성 시작...\n');

  // 교육 기간 분포: 12월 40%, 1월 40%, 2월 20%
  const educationMonths: { year: number; month: number }[] = [];
  for (let i = 0; i < 400; i++) educationMonths.push({ year: 2025, month: 11 }); // 12월
  for (let i = 0; i < 400; i++) educationMonths.push({ year: 2026, month: 0 }); // 1월
  for (let i = 0; i < 200; i++) educationMonths.push({ year: 2026, month: 1 }); // 2월
  educationMonths.sort(() => Math.random() - 0.5);

  // 부대 레벨 분포
  const unitLevels: ('corps' | 'division' | 'brigade' | 'battalion' | 'company' | 'platoon')[] = [];
  for (let i = 0; i < 50; i++) unitLevels.push('corps'); // 50개
  for (let i = 0; i < 100; i++) unitLevels.push('division'); // 100개
  for (let i = 0; i < 400; i++) unitLevels.push('battalion'); // 400개 (2~3 장소)
  for (let i = 0; i < 350; i++) unitLevels.push('company'); // 350개
  for (let i = 0; i < 100; i++) unitLevels.push('platoon'); // 100개
  unitLevels.sort(() => Math.random() - 0.5);

  // 불가일자 분포: 20% 단일, 10% 복수
  const excludedDateTypes: ('none' | 'single' | 'multiple')[] = [];
  for (let i = 0; i < 200; i++) excludedDateTypes.push('single'); // 200개
  for (let i = 0; i < 100; i++) excludedDateTypes.push('multiple'); // 100개
  for (let i = 0; i < 700; i++) excludedDateTypes.push('none'); // 700개
  excludedDateTypes.sort(() => Math.random() - 0.5);

  let createdCount = 0;

  for (let i = 0; i < 1000; i++) {
    const level = unitLevels[i];
    const unitName = generateUnitName(level, i);
    const militaryType = getMilitaryType();
    const regionData = randomChoice(REGIONS);

    const { year, month } = educationMonths[i];
    const dayOfMonth = randomInt(1, 25);
    const startDate = new Date(Date.UTC(year, month, dayOfMonth));
    const endDate = new Date(Date.UTC(year, month, dayOfMonth + 2)); // 3일차

    // 불가일자 생성
    let excludedDates: string[] = [];
    const excludedType = excludedDateTypes[i];
    if (excludedType === 'single') {
      // 교육 둘째날을 불가일자로
      excludedDates = [formatDate(new Date(Date.UTC(year, month, dayOfMonth + 1)))];
    } else if (excludedType === 'multiple') {
      // 교육 둘째날, 셋째날을 불가일자로
      excludedDates = [
        formatDate(new Date(Date.UTC(year, month, dayOfMonth + 1))),
        formatDate(new Date(Date.UTC(year, month, dayOfMonth + 2))),
      ];
    }

    const lat = randomFloat(regionData.latRange[0], regionData.latRange[1]);
    const lng = randomFloat(regionData.lngRange[0], regionData.lngRange[1]);
    const region = randomChoice(regionData.regions);
    const officerName = `${randomChoice(LAST_NAMES)}${randomChoice(FIRST_NAMES)}`;

    // 교육장소 수: 대대급은 2~3개, 나머지는 1개
    const locationCount = level === 'battalion' ? randomInt(2, 3) : 1;
    const plannedPerLocation = level === 'battalion' ? 100 : randomInt(40, 150);

    try {
      const unit = await prisma.unit.create({
        data: {
          name: unitName,
          unitType: militaryType,
          wideArea: regionData.wideArea,
          region: region,
          addressDetail: `${regionData.wideArea} ${region} 군부대로 ${randomInt(1, 999)}`,
          detailAddress: `본관 ${randomInt(1, 5)}층`,
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6)),
          educationStart: startDate,
          educationEnd: endDate,
          workStartTime: new Date('1970-01-01T09:00:00Z'),
          workEndTime: new Date('1970-01-01T18:00:00Z'),
          lunchStartTime: new Date('1970-01-01T12:00:00Z'),
          lunchEndTime: new Date('1970-01-01T13:00:00Z'),
          officerName: officerName,
          officerPhone: `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
          officerEmail: `${officerName.toLowerCase()}${randomInt(1, 99)}@army.mil.kr`,
          isStaffLocked: false,
          excludedDates: excludedDates,
        },
      });

      // 교육장소 생성
      for (let loc = 0; loc < locationCount; loc++) {
        await prisma.trainingLocation.create({
          data: {
            unitId: unit.id,
            originalPlace: loc === 0 ? randomChoice(PLACES) : `추가장소${loc + 1}`,
            changedPlace: null,
            hasInstructorLounge: true,
            hasWomenRestroom: true,
            hasCateredMeals: Math.random() > 0.3,
            hasHallLodging: Math.random() > 0.4,
            allowsPhoneBeforeAfter: true,
            plannedCount: plannedPerLocation,
            actualCount: randomInt(Math.floor(plannedPerLocation * 0.7), plannedPerLocation),
            note: null,
          },
        });
      }

      // 일정 생성 (불가일자 제외)
      const excludedSet = new Set(excludedDates);
      const currentDate = new Date(startDate);
      let scheduleCount = 0;

      while (currentDate <= endDate && scheduleCount < 3) {
        const dateStr = formatDate(currentDate);
        if (!excludedSet.has(dateStr)) {
          await prisma.unitSchedule.create({
            data: { unitId: unit.id, date: new Date(currentDate) },
          });
          scheduleCount++;
        }
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }

      createdCount++;
      if (createdCount % 100 === 0) {
        console.log(`  📊 ${createdCount}/1000 부대 생성 완료...`);
      }
    } catch (error: any) {
      console.error(`  ❌ 부대 생성 실패 (${unitName}):`, error.message);
    }
  }

  console.log(`\n✅ 부대 ${createdCount}개 생성 완료!\n`);

  // 통계 출력
  const stats = await prisma.unit.groupBy({
    by: ['unitType'],
    _count: { id: true },
  });
  console.log('📊 군구분별 부대 수:');
  for (const s of stats) {
    console.log(`  - ${s.unitType}: ${s._count.id}개`);
  }
}

// 직접 실행 시
if (require.main === module) {
  runSeedUnits()
    .catch((e) => {
      console.error('❌ 생성 실패:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
