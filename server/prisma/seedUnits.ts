// server/prisma/seedUnits.ts
// 부대 시드 데이터 생성: 2025년 1000개 + 2026년 1~2월 100개
// 실행: npx tsx prisma/seedUnits.ts

/* eslint-disable no-console */

import 'dotenv/config';
import { MilitaryType } from '../src/generated/prisma/client.js';
import prisma from '../src/libs/prisma.js';

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

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 부대명 생성 (중복 방지를 위한 카운터 기반)
const usedNames = new Set<string>();
function generateUniqueUnitName(year: number, index: number): string {
  const suffixes = ['사단', '여단', '연대', '대대', '부대', '사령부', '지원단', '교육대'];
  const prefixes = [
    '육군',
    '해군',
    '공군',
    '해병',
    '수도방위',
    '특전',
    '기계화',
    '포병',
    '공병',
    '통신',
    '군수',
    '의무',
  ];

  let name = '';
  let attempts = 0;
  while (attempts < 100) {
    const num = Math.floor(index / 8) + 1 + attempts * 10;
    const suffix = suffixes[index % suffixes.length];
    const prefix = prefixes[Math.floor(index / 10) % prefixes.length];
    name = `${prefix}${num}${suffix}(${year})`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
    attempts++;
  }
  // Fallback with UUID-like suffix
  name = `부대${year}-${index}-${Date.now() % 10000}`;
  usedNames.add(name);
  return name;
}

interface UnitConfig {
  year: number;
  month: number;
  hasExtraEducation: boolean;
  excludedType: 'none' | 'single' | 'multiple';
  locationCount: number;
}

async function createUnit(index: number, config: UnitConfig) {
  const { year, month, hasExtraEducation, excludedType, locationCount } = config;

  const unitName = generateUniqueUnitName(year, index);
  const militaryType = getMilitaryType();
  const regionData = randomChoice(REGIONS);
  const region = randomChoice(regionData.regions);
  const lat = randomFloat(regionData.latRange[0], regionData.latRange[1]);
  const lng = randomFloat(regionData.lngRange[0], regionData.lngRange[1]);

  // 기본 교육 일정 (2박3일)
  const dayOfMonth = randomInt(1, 20);

  // 불가일자 생성
  let excludedDates: string[] = [];
  let extraDays = 0;

  if (excludedType === 'single') {
    extraDays = 1;
    excludedDates = [formatDate(new Date(Date.UTC(year, month, dayOfMonth + 1)))];
  } else if (excludedType === 'multiple') {
    extraDays = 2;
    excludedDates = [
      formatDate(new Date(Date.UTC(year, month, dayOfMonth + 1))),
      formatDate(new Date(Date.UTC(year, month, dayOfMonth + 3))),
    ];
  }

  const startDate = new Date(Date.UTC(year, month, dayOfMonth));
  const endDate = new Date(Date.UTC(year, month, dayOfMonth + 2 + extraDays));
  const officerName = `${randomChoice(LAST_NAMES)}${randomChoice(FIRST_NAMES)}`;

  // 부대 생성
  const unit = await prisma.unit.create({
    data: {
      lectureYear: year,
      name: unitName,
      unitType: militaryType,
      wideArea: regionData.wideArea,
      region: region,
      addressDetail: `${regionData.wideArea} ${region} 군부대로 ${randomInt(1, 999)}`,
      detailAddress: `본관 ${randomInt(1, 5)}층`,
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
    },
  });

  // 정규교육 TrainingPeriod 생성
  const mainPeriod = await prisma.trainingPeriod.create({
    data: {
      unitId: unit.id,
      name: '정규교육',
      workStartTime: new Date('1970-01-01T09:00:00Z'),
      workEndTime: new Date('1970-01-01T18:00:00Z'),
      lunchStartTime: new Date('1970-01-01T12:00:00Z'),
      lunchEndTime: new Date('1970-01-01T13:00:00Z'),
      officerName: officerName,
      officerPhone: `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
      officerEmail: `officer${index}@army.mil.kr`,
      isStaffLocked: false,
      excludedDates: excludedDates,
      hasCateredMeals: Math.random() > 0.3,
      hasHallLodging: Math.random() > 0.4,
      allowsPhoneBeforeAfter: true,
    },
  });

  // 교육장소 생성
  const locationIds: number[] = [];
  for (let loc = 0; loc < locationCount; loc++) {
    const location = await prisma.trainingLocation.create({
      data: {
        trainingPeriodId: mainPeriod.id,
        originalPlace: loc === 0 ? randomChoice(PLACES) : `추가장소${loc + 1}`,
        changedPlace: null,
        hasInstructorLounge: true,
        hasWomenRestroom: true,
        note: null,
      },
    });
    locationIds.push(location.id);
  }

  // 정규교육 일정 생성 (불가일자 제외, 3일 보장)
  const excludedSet = new Set(excludedDates);
  const currentDate = new Date(startDate);
  let scheduleCount = 0;

  while (currentDate <= endDate && scheduleCount < 3) {
    const dateStr = formatDate(currentDate);
    if (!excludedSet.has(dateStr)) {
      const schedule = await prisma.unitSchedule.create({
        data: { trainingPeriodId: mainPeriod.id, date: new Date(currentDate) },
      });

      // ScheduleLocation 생성 (각 장소별 인원)
      for (const locId of locationIds) {
        const plannedCount = Math.min(randomInt(40, 150), 200);
        await prisma.scheduleLocation.create({
          data: {
            unitScheduleId: schedule.id,
            trainingLocationId: locId,
            plannedCount: plannedCount,
            actualCount: Math.floor(plannedCount * (0.8 + Math.random() * 0.2)),
          },
        });
      }
      scheduleCount++;
    }
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  // 추가교육 (20% 확률 또는 지정)
  if (hasExtraEducation) {
    // 정규교육 종료 후 1~2개월 후에 추가교육
    const extraMonth = month + randomInt(2, 3);
    const extraYear = extraMonth > 11 ? year + 1 : year;
    const normalizedMonth = extraMonth % 12;
    const extraDay = randomInt(1, 20);

    const extraPeriod = await prisma.trainingPeriod.create({
      data: {
        unitId: unit.id,
        name: '추가교육 1차',
        workStartTime: new Date('1970-01-01T09:00:00Z'),
        workEndTime: new Date('1970-01-01T17:00:00Z'),
        lunchStartTime: new Date('1970-01-01T12:00:00Z'),
        lunchEndTime: new Date('1970-01-01T13:00:00Z'),
        officerName: officerName,
        officerPhone: `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
        officerEmail: `officer${index}extra@army.mil.kr`,
        isStaffLocked: false,
        excludedDates: [],
        hasCateredMeals: true,
        hasHallLodging: false,
        allowsPhoneBeforeAfter: true,
      },
    });

    // 추가교육 장소 (1개)
    const extraLocation = await prisma.trainingLocation.create({
      data: {
        trainingPeriodId: extraPeriod.id,
        originalPlace: randomChoice(PLACES),
        hasInstructorLounge: true,
        hasWomenRestroom: true,
      },
    });

    // 추가교육 일정 (1일)
    const extraSchedule = await prisma.unitSchedule.create({
      data: {
        trainingPeriodId: extraPeriod.id,
        date: new Date(Date.UTC(extraYear, normalizedMonth, extraDay)),
      },
    });

    await prisma.scheduleLocation.create({
      data: {
        unitScheduleId: extraSchedule.id,
        trainingLocationId: extraLocation.id,
        plannedCount: Math.min(randomInt(30, 80), 200),
        actualCount: randomInt(20, 60),
      },
    });
  }

  return unit.id;
}

export async function runSeedUnits() {
  console.log('🏢 부대 1100개 생성 시작 (2025년 1000개 + 2026년 100개)...\n');

  // 2025년 부대 1000개 설정
  const units2025: UnitConfig[] = [];
  for (let i = 0; i < 1000; i++) {
    const month = randomInt(0, 11); // 1월~12월 균등 분포
    units2025.push({
      year: 2025,
      month,
      hasExtraEducation: i < 150, // 15% 추가교육
      excludedType: i < 200 ? 'single' : i < 300 ? 'multiple' : 'none',
      locationCount: i < 300 ? randomInt(2, 3) : 1, // 30% 복수 장소
    });
  }
  units2025.sort(() => Math.random() - 0.5);

  // 2026년 1~2월 부대 100개 설정
  const units2026: UnitConfig[] = [];
  for (let i = 0; i < 100; i++) {
    const month = i < 60 ? 0 : 1; // 60개 1월, 40개 2월
    units2026.push({
      year: 2026,
      month,
      hasExtraEducation: i < 10, // 10% 추가교육
      excludedType: i < 15 ? 'single' : i < 25 ? 'multiple' : 'none',
      locationCount: i < 20 ? randomInt(2, 3) : 1, // 20% 복수 장소
    });
  }
  units2026.sort(() => Math.random() - 0.5);

  let created2025 = 0;
  let created2026 = 0;

  // 2025년 부대 생성
  console.log('📅 2025년 부대 1000개 생성 중...');
  for (let i = 0; i < units2025.length; i++) {
    try {
      await createUnit(i, units2025[i]);
      created2025++;
      if (created2025 % 100 === 0) {
        console.log(`  ✅ 2025년 ${created2025}/1000 완료...`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ 2025년 부대 ${i} 생성 실패:`, message);
    }
  }
  console.log(`  ✅ 2025년 부대 ${created2025}개 생성 완료\n`);

  // 2026년 부대 생성
  console.log('📅 2026년 1~2월 부대 100개 생성 중...');
  for (let i = 0; i < units2026.length; i++) {
    try {
      await createUnit(1000 + i, units2026[i]);
      created2026++;
      if (created2026 % 20 === 0) {
        console.log(`  ✅ 2026년 ${created2026}/100 완료...`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ 2026년 부대 ${i} 생성 실패:`, message);
    }
  }
  console.log(`  ✅ 2026년 부대 ${created2026}개 생성 완료\n`);

  console.log('='.repeat(50));
  console.log('📊 부대 생성 결과');
  console.log('='.repeat(50));
  console.log(`총 부대: ${created2025 + created2026}개`);
  console.log(`  - 2025년: ${created2025}개`);
  console.log(`  - 2026년: ${created2026}개`);

  const stats = await prisma.unit.groupBy({
    by: ['lectureYear'],
    _count: { id: true },
  });
  for (const s of stats) {
    console.log(`  - ${s.lectureYear}년: ${s._count.id}개`);
  }
  console.log('='.repeat(50));
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
