// server/scripts/generateUnitsExcel.ts
// 부대 1000개 엑셀 파일 생성 (엑셀 업로드 기능 테스트용)
// 실행: npx tsx scripts/generateUnitsExcel.ts

/* eslint-disable no-console */

import ExcelJS from 'exceljs';
import path from 'path';

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

function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
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

function generateUnitName(level: string, index: number): string {
  const corpsNum = (index % 8) + 1;
  const divisionNum = (index % 30) + 1;
  const brigadeNum = (index % 10) + 1;
  const battalionNum = (index % 5) + 1;
  const companyNum = (index % 4) + 1;
  const platoonNum = (index % 3) + 1;

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
    default:
      return `테스트부대${index + 1}`;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

async function generateExcel() {
  console.log('📊 부대 1000개 엑셀 파일 생성 시작...\n');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('부대정보');

  // 헤더 (3행부터 시작)
  const headers = [
    '부대명',
    '군구분',
    '광역',
    '지역',
    '부대상세주소',
    '부대주소(상세)',
    '위도',
    '경도',
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
  worksheet.getCell('A1').value = '통합 테스트용 부대 데이터 (1000개)';
  worksheet.getCell('A2').value =
    `생성일: ${formatDate(new Date())} | 기간: 2025년 12월 ~ 2026년 2월`;

  // 헤더 행 (3행)
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(3, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.alignment = { horizontal: 'center' };
  });

  // 분포 설정
  const educationMonths: { year: number; month: number }[] = [];
  for (let i = 0; i < 400; i++) educationMonths.push({ year: 2025, month: 11 }); // 12월
  for (let i = 0; i < 400; i++) educationMonths.push({ year: 2026, month: 0 }); // 1월
  for (let i = 0; i < 200; i++) educationMonths.push({ year: 2026, month: 1 }); // 2월
  educationMonths.sort(() => Math.random() - 0.5);

  const unitLevels: string[] = [];
  for (let i = 0; i < 50; i++) unitLevels.push('corps');
  for (let i = 0; i < 100; i++) unitLevels.push('division');
  for (let i = 0; i < 400; i++) unitLevels.push('battalion');
  for (let i = 0; i < 350; i++) unitLevels.push('company');
  for (let i = 0; i < 100; i++) unitLevels.push('platoon');
  unitLevels.sort(() => Math.random() - 0.5);

  const excludedDateTypes: string[] = [];
  for (let i = 0; i < 200; i++) excludedDateTypes.push('single');
  for (let i = 0; i < 100; i++) excludedDateTypes.push('multiple');
  for (let i = 0; i < 700; i++) excludedDateTypes.push('none');
  excludedDateTypes.sort(() => Math.random() - 0.5);

  let currentRow = 4;
  let unitCount = 0;

  for (let i = 0; i < 1000; i++) {
    const level = unitLevels[i];
    const unitName = generateUnitName(level, i);
    const militaryType = getMilitaryType();
    const regionData = randomChoice(REGIONS);
    const region = randomChoice(regionData.regions);

    const { year, month } = educationMonths[i];
    const dayOfMonth = randomInt(1, 25);
    const startDate = new Date(Date.UTC(year, month, dayOfMonth));
    const endDate = new Date(Date.UTC(year, month, dayOfMonth + 2));

    // 불가일자
    let excludedDates = '';
    const excludedType = excludedDateTypes[i];
    if (excludedType === 'single') {
      excludedDates = formatDate(new Date(Date.UTC(year, month, dayOfMonth + 1)));
    } else if (excludedType === 'multiple') {
      excludedDates = [
        formatDate(new Date(Date.UTC(year, month, dayOfMonth + 1))),
        formatDate(new Date(Date.UTC(year, month, dayOfMonth + 2))),
      ].join(', ');
    }

    const lat = randomFloat(regionData.latRange[0], regionData.latRange[1]).toFixed(6);
    const lng = randomFloat(regionData.lngRange[0], regionData.lngRange[1]).toFixed(6);
    const officerName = `${randomChoice(LAST_NAMES)}${randomChoice(FIRST_NAMES)}`;

    // 교육장소 수
    const locationCount = level === 'battalion' ? randomInt(2, 3) : 1;
    const plannedPerLocation = level === 'battalion' ? 100 : randomInt(40, 150);

    // 첫 번째 장소 (부대 정보 포함)
    const mainRow: (string | number | null)[] = [
      unitName,
      militaryType,
      regionData.wideArea,
      region,
      `${regionData.wideArea} ${region} 군부대로 ${randomInt(1, 999)}`,
      `본관 ${randomInt(1, 5)}층`,
      lat,
      lng,
      formatDate(startDate),
      formatDate(endDate),
      excludedDates,
      formatTime(9, 0),
      formatTime(18, 0),
      formatTime(12, 0),
      formatTime(13, 0),
      officerName,
      `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
      `${officerName.toLowerCase()}${randomInt(1, 99)}@army.mil.kr`,
      randomChoice(PLACES),
      '',
      'O',
      'O',
      Math.random() > 0.3 ? 'O' : 'X',
      Math.random() > 0.4 ? 'O' : 'X',
      'O',
      plannedPerLocation,
      randomInt(Math.floor(plannedPerLocation * 0.7), plannedPerLocation),
      '',
    ];

    headers.forEach((_, colIndex) => {
      worksheet.getCell(currentRow, colIndex + 1).value = mainRow[colIndex];
    });
    currentRow++;

    // 추가 장소 (부대명 비움)
    for (let loc = 1; loc < locationCount; loc++) {
      const additionalRow: (string | number | null)[] = [
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        `추가장소${loc + 1}`,
        '',
        'O',
        'O',
        Math.random() > 0.3 ? 'O' : 'X',
        Math.random() > 0.4 ? 'O' : 'X',
        'O',
        plannedPerLocation,
        randomInt(Math.floor(plannedPerLocation * 0.7), plannedPerLocation),
        '',
      ];

      headers.forEach((_, colIndex) => {
        worksheet.getCell(currentRow, colIndex + 1).value = additionalRow[colIndex];
      });
      currentRow++;
    }

    unitCount++;
    if (unitCount % 100 === 0) {
      console.log(`  📊 ${unitCount}/1000 부대 생성...`);
    }
  }

  // 열 너비 조정
  worksheet.columns.forEach((column) => {
    column.width = 18;
  });

  // 파일 저장
  const outputDir = path.join(__dirname, '..', 'test-data');
  const fs = await import('fs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, 'units-1000.xlsx');
  await workbook.xlsx.writeFile(filePath);

  console.log(`\n✅ 엑셀 파일 생성 완료: ${filePath}`);
  console.log('\n📋 구성:');
  console.log('   - 군단/사단: 150개');
  console.log('   - 대대급 (복수 장소): 400개');
  console.log('   - 중대/소대급: 450개');
  console.log('   - 12월: 400개, 1월: 400개, 2월: 200개');
  console.log('   - 불가일자: 단일 200개, 복수 100개');
}

generateExcel().catch((err) => {
  console.error('❌ 엑셀 생성 실패:', err);
  process.exit(1);
});
