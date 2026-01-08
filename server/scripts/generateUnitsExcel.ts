// server/scripts/generateUnitsExcel.ts
// 부대 엑셀 파일 생성 (엑셀 업로드 기능 테스트용)
// - 2025년 1000개 + 2026년 1~2월 100개 = 총 1100개
// - seedUnits.ts와 동일한 로직
// 실행: npx tsx scripts/generateUnitsExcel.ts

/* eslint-disable no-console */

import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

// 군구분 비율: 육군 60%, 해군/공군/해병/국직 각 10%
const MILITARY_TYPES = [
  { type: 'Army', weight: 60 },
  { type: 'Navy', weight: 10 },
  { type: 'AirForce', weight: 10 },
  { type: 'Marines', weight: 10 },
  { type: 'MND', weight: 10 },
];

// 광역/지역 데이터
const REGIONS = [
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
    regions: ['춘천시', '원주시', '강릉시', '속초시', '철원군', '화천군', '양구군', '인제군'],
    latRange: [37.3, 38.3],
    lngRange: [127.5, 129.0],
  },
  {
    wideArea: '충청남도',
    regions: ['천안시', '공주시', '보령시', '아산시', '논산시', '계룡시'],
    latRange: [36.3, 36.95],
    lngRange: [126.5, 127.3],
  },
  {
    wideArea: '충청북도',
    regions: ['청주시', '충주시', '제천시', '진천군', '음성군'],
    latRange: [36.45, 37.15],
    lngRange: [127.2, 128.0],
  },
  {
    wideArea: '전라북도',
    regions: ['전주시', '군산시', '익산시', '정읍시', '남원시'],
    latRange: [35.4, 36.1],
    lngRange: [126.7, 127.5],
  },
  {
    wideArea: '전라남도',
    regions: ['목포시', '여수시', '순천시', '나주시', '광양시'],
    latRange: [34.5, 35.3],
    lngRange: [126.3, 127.8],
  },
  {
    wideArea: '경상북도',
    regions: ['포항시', '경주시', '김천시', '안동시', '구미시', '영주시'],
    latRange: [35.8, 36.9],
    lngRange: [128.3, 129.5],
  },
  {
    wideArea: '경상남도',
    regions: ['창원시', '진주시', '통영시', '김해시', '거제시', '양산시'],
    latRange: [34.9, 35.6],
    lngRange: [128.0, 129.1],
  },
  {
    wideArea: '대전광역시',
    regions: ['동구', '서구', '유성구', '대덕구'],
    latRange: [36.25, 36.45],
    lngRange: [127.3, 127.5],
  },
  {
    wideArea: '대구광역시',
    regions: ['동구', '서구', '남구', '북구', '수성구'],
    latRange: [35.8, 35.95],
    lngRange: [128.5, 128.75],
  },
  {
    wideArea: '부산광역시',
    regions: ['영도구', '해운대구', '남구', '동래구', '사하구'],
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

function getMilitaryType(): string {
  const rand = randomInt(1, 100);
  let cumulative = 0;
  for (const { type, weight } of MILITARY_TYPES) {
    cumulative += weight;
    if (rand <= cumulative) return type;
  }
  return 'Army';
}

// 고유 부대명 생성
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
  name = `부대${year}-${index}-${Date.now() % 10000}`;
  usedNames.add(name);
  return name;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

interface UnitConfig {
  year: number;
  month: number;
  hasExtraEducation: boolean;
  excludedType: 'none' | 'single' | 'multiple';
  locationCount: number;
}

async function generateExcel() {
  console.log('📊 부대 엑셀 파일 생성 시작 (2025년 1000개 + 2026년 100개)...\n');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('부대정보');

  // 헤더 (3행부터 시작) - 위도/경도는 주소 기반 API로 계산되므로 제외
  const headers = [
    '부대명',
    '군구분',
    '광역',
    '지역',
    '부대주소',
    '부대주소(상세)',
    '교육시작일자',
    '교육종료일자',
    '교육불가일자',
    '근무시작시간',
    '근무종료시간',
    '점심시작시간',
    '점심종료시간',
    '간부명',
    '간부 전화번호',
    '간부 이메일 주소',
    '기존교육장소',
    '변경교육장소',
    '강사휴게실 여부',
    '여자화장실 여부',
    '수탁급식여부',
    '회관숙박여부',
    '사전사후 휴대폰 불출 여부',
    '계획인원',
    '참여인원',
    '특이사항',
  ];

  // 1-2행은 메타정보
  worksheet.getCell('A1').value = '테스트용 부대 데이터 (2025년 1000개 + 2026년 100개)';
  worksheet.getCell('A2').value = '강의년도'; // 라벨
  worksheet.getCell('B2').value = 2026; // 값 (사용자가 수정)
  worksheet.getCell('C2').value = `생성일: ${formatDate(new Date())}`;
  worksheet.getCell('D2').value = `기준일: 2026-01-08`;

  // 헤더 행 (3행)
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(3, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.alignment = { horizontal: 'center' };
  });

  // 2025년 1000개 설정
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

  // 2026년 1~2월 100개 설정
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

  const allUnits = [...units2025, ...units2026];
  let currentRow = 4;
  let unitCount = 0;

  for (let i = 0; i < allUnits.length; i++) {
    const config = allUnits[i];
    const { year, month, excludedType, locationCount } = config;

    const unitName = generateUniqueUnitName(year, i);
    const militaryType = getMilitaryType();
    const regionData = randomChoice(REGIONS);
    const region = randomChoice(regionData.regions);

    const dayOfMonth = randomInt(1, 20);

    // 불가일자 생성
    let excludedDates = '';
    let extraDays = 0;

    if (excludedType === 'single') {
      extraDays = 1;
      excludedDates = formatDate(new Date(Date.UTC(year, month, dayOfMonth + 1)));
    } else if (excludedType === 'multiple') {
      extraDays = 2;
      excludedDates = [
        formatDate(new Date(Date.UTC(year, month, dayOfMonth + 1))),
        formatDate(new Date(Date.UTC(year, month, dayOfMonth + 3))),
      ].join(', ');
    }

    const startDate = new Date(Date.UTC(year, month, dayOfMonth));
    const endDate = new Date(Date.UTC(year, month, dayOfMonth + 2 + extraDays));
    const officerName = `${randomChoice(LAST_NAMES)}${randomChoice(FIRST_NAMES)}`;
    const plannedCount = Math.min(randomInt(40, 150), 200);

    // 첫 번째 장소 (부대 정보 포함) - 위도/경도 제외
    const mainRow: (string | number | null)[] = [
      unitName,
      militaryType,
      regionData.wideArea,
      region,
      `${regionData.wideArea} ${region} 군부대로 ${randomInt(1, 999)}`,
      `본관 ${randomInt(1, 5)}층`,
      formatDate(startDate),
      formatDate(endDate),
      excludedDates,
      formatTime(9, 0),
      formatTime(18, 0),
      formatTime(12, 0),
      formatTime(13, 0),
      officerName,
      `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
      `officer${i}@army.mil.kr`,
      randomChoice(PLACES),
      '',
      'O',
      'O',
      Math.random() > 0.3 ? 'O' : 'X',
      Math.random() > 0.4 ? 'O' : 'X',
      'O',
      plannedCount,
      Math.floor(plannedCount * (0.8 + Math.random() * 0.2)),
      '',
    ];

    headers.forEach((_, colIndex) => {
      worksheet.getCell(currentRow, colIndex + 1).value = mainRow[colIndex];
    });
    currentRow++;

    // 추가 장소 (부대명 비움) - 위도/경도 제외로 열 수 감소
    for (let loc = 1; loc < locationCount; loc++) {
      const additionalRow: (string | number | null)[] = [
        '',
        '',
        '',
        '',
        '',
        '', // 부대명~부대주소(상세)
        '',
        '',
        '',
        '',
        '',
        '',
        '', // 교육일자~점심종료
        '',
        '',
        '', // 간부명~이메일
        `추가장소${loc + 1}`,
        '',
        'O',
        'O',
        Math.random() > 0.3 ? 'O' : 'X',
        Math.random() > 0.4 ? 'O' : 'X',
        'O',
        plannedCount,
        Math.floor(plannedCount * (0.8 + Math.random() * 0.2)),
        '',
      ];

      headers.forEach((_, colIndex) => {
        worksheet.getCell(currentRow, colIndex + 1).value = additionalRow[colIndex];
      });
      currentRow++;
    }

    unitCount++;
    if (unitCount % 100 === 0) {
      console.log(`  📊 ${unitCount}/1100 부대 생성...`);
    }
  }

  // 열 너비 조정
  worksheet.columns.forEach((column) => {
    column.width = 18;
  });

  // 파일 저장
  const outputDir = path.join(__dirname, '..', 'test-data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, 'units-1100.xlsx');
  await workbook.xlsx.writeFile(filePath);

  console.log(`\n✅ 엑셀 파일 생성 완료: ${filePath}`);
  console.log('\n📋 구성:');
  console.log('   - 2025년: 1000개 (전체 월 균등 분포)');
  console.log('   - 2026년 1월: 60개');
  console.log('   - 2026년 2월: 40개');
  console.log('   - 불가일자: 단일 ~20%, 복수 ~10%');
  console.log('   - 복수 장소: ~25%');
}

generateExcel().catch((err) => {
  console.error('❌ 엑셀 생성 실패:', err);
  process.exit(1);
});
