// 통합 테스트용 엑셀 파일 생성 스크립트
// - 100개 부대 (모든 필수 필드 채움)
// - 복수 교육장소 테스트 포함 (10개 부대)
// - 2026년 1월에 분포된 일정
// 실행: npx tsx scripts/generate-integrated-test-excel.ts

import ExcelJS from 'exceljs';
import path from 'path';

// 실제와 유사한 데이터 생성용 배열
const UNIT_PREFIXES = [
  '제1',
  '제2',
  '제3',
  '제5',
  '제6',
  '제7',
  '제8',
  '제9',
  '제11',
  '제12',
  '제15',
  '제17',
  '제20',
  '제21',
  '제25',
  '제27',
  '제30',
  '제31',
  '제35',
  '제37',
  '제39',
  '제50',
  '제51',
  '제52',
];
const UNIT_TYPES_ARMY = [
  '보병사단',
  '기갑여단',
  '기계화보병사단',
  '포병여단',
  '공병여단',
  '통신여단',
  '군수지원사령부',
];
const UNIT_TYPES_NAVY = ['함대사령부', '해군작전사령부', '잠수함사령부', '해군교육사령부'];
const UNIT_TYPES_AIRFORCE = ['전투비행단', '공군작전사령부', '방공관제사령부', '공군교육사령부'];
const UNIT_TYPES_MARINES = ['해병사단', '해병여단', '해병대사령부', '해병교육훈련단'];
const UNIT_TYPES_MND = ['국방부직할부대', '합동군사대학', '국군의무사령부', '국군체육부대'];

const WIDE_AREAS = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '경기도',
  '강원도',
  '충청남도',
  '충청북도',
  '전라남도',
  '전라북도',
  '경상남도',
  '경상북도',
  '제주특별자치도',
];

const REGIONS: Record<string, string[]> = {
  서울특별시: ['용산구', '종로구', '강남구', '서초구', '송파구'],
  부산광역시: ['영도구', '해운대구', '남구', '동래구', '사하구'],
  대구광역시: ['동구', '서구', '남구', '북구', '수성구'],
  인천광역시: ['남동구', '연수구', '부평구', '계양구'],
  광주광역시: ['동구', '서구', '남구', '북구', '광산구'],
  대전광역시: ['동구', '서구', '유성구', '대덕구'],
  경기도: [
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
  강원도: ['춘천시', '원주시', '강릉시', '속초시', '철원군', '화천군', '양구군', '인제군'],
  충청남도: ['천안시', '공주시', '보령시', '아산시', '논산시', '계룡시'],
  충청북도: ['청주시', '충주시', '제천시', '진천군', '음성군'],
  전라남도: ['목포시', '여수시', '순천시', '나주시', '광양시'],
  전라북도: ['전주시', '군산시', '익산시', '정읍시'],
  경상남도: ['창원시', '진주시', '통영시', '김해시', '거제시'],
  경상북도: ['포항시', '경주시', '김천시', '안동시', '구미시'],
  제주특별자치도: ['제주시', '서귀포시'],
};

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
  '안',
  '송',
];
const FIRST_NAMES = [
  '민준',
  '서준',
  '예준',
  '도윤',
  '시우',
  '주원',
  '하준',
  '지호',
  '준우',
  '도현',
  '건우',
  '우진',
  '현우',
  '지민',
  '성민',
  '정민',
  '재원',
  '영호',
];

const PLACES = [
  '대강당',
  '연병장',
  '체육관',
  '교육관',
  '회의실A',
  '회의실B',
  '다목적실',
  '세미나실',
  '훈련장',
  '교육센터',
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPhone(): string {
  return `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
}

function randomEmail(name: string): string {
  const domains = ['army.mil.kr', 'navy.mil.kr', 'mnd.go.kr'];
  const firstName = name.substring(1);
  return `${firstName.toLowerCase()}${randomInt(1, 99)}@${randomChoice(domains)}`;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 2026년 1월 내에서 교육 일정 생성 (2박3일)
function generateEducationDates(dayOfMonth: number): { start: string; end: string } {
  const start = new Date(Date.UTC(2026, 0, dayOfMonth)); // 2026-01-XX
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 2); // +2일 = 3일차

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

function generateUnit(index: number): Record<string, unknown> {
  // 군 타입 비율: 육군 50%, 해군 15%, 공군 15%, 해병대 10%, 국직부대 10%
  const rand = Math.random();
  let unitType: string;
  let unitName: string;

  if (rand < 0.5) {
    unitType = 'Army';
    unitName = `${randomChoice(UNIT_PREFIXES)}${randomChoice(UNIT_TYPES_ARMY)}`;
  } else if (rand < 0.65) {
    unitType = 'Navy';
    unitName = `${randomChoice(UNIT_PREFIXES)}${randomChoice(UNIT_TYPES_NAVY)}`;
  } else if (rand < 0.8) {
    unitType = 'AirForce';
    unitName = `${randomChoice(UNIT_PREFIXES)}${randomChoice(UNIT_TYPES_AIRFORCE)}`;
  } else if (rand < 0.9) {
    unitType = 'Marines';
    unitName = `${randomChoice(UNIT_PREFIXES)}${randomChoice(UNIT_TYPES_MARINES)}`;
  } else {
    unitType = 'MND';
    unitName = randomChoice(UNIT_TYPES_MND);
  }

  const wideArea = randomChoice(WIDE_AREAS);
  const region = randomChoice(REGIONS[wideArea] || ['중앙']);
  const officerName = `${randomChoice(LAST_NAMES)}${randomChoice(FIRST_NAMES)}`;

  // 2026년 1월 1일~28일 사이에 분포 (각 부대마다 다른 날짜)
  const dayOfMonth = (index % 26) + 1; // 1~26일
  const { start, end } = generateEducationDates(dayOfMonth);

  // 좌표 (한반도 범위)
  const lat = 33.5 + Math.random() * 4; // 33.5~37.5
  const lng = 126.0 + Math.random() * 4; // 126~130

  return {
    부대명: unitName,
    군구분: unitType,
    광역: wideArea,
    지역: region,
    부대상세주소: `${wideArea} ${region} 군사로 ${randomInt(1, 999)}번길`,
    위도: Number(lat.toFixed(6)),
    경도: Number(lng.toFixed(6)),
    교육시작일자: start,
    교육종료일자: end,
    교육불가일자: '',
    근무시작시간: '09:00',
    근무종료시간: '18:00',
    점심시작시간: '12:00',
    점심종료시간: '13:00',
    간부명: officerName,
    '간부 전화번호': randomPhone(),
    '간부 이메일 주소': randomEmail(officerName),
    기존교육장소: randomChoice(PLACES),
    변경교육장소: '',
    '강사휴게실 여부': 'O',
    '여자화장실 여부': 'O',
    수탁급식여부: Math.random() > 0.3 ? 'O' : 'X',
    회관숙박여부: Math.random() > 0.4 ? 'O' : 'X',
    '사전사후 휴대폰 불출 여부': 'O',
    계획인원: randomInt(30, 150),
    참여인원: randomInt(20, 100),
    투입강사수: randomInt(2, 6),
    특이사항: '',
  };
}

// 복수 교육장소용 추가 행 생성 (부대명 비움)
function generateAdditionalLocation(place: string): Record<string, unknown> {
  return {
    부대명: '', // 비움 = 이전 부대의 추가 장소
    군구분: '',
    광역: '',
    지역: '',
    부대상세주소: '',
    위도: '',
    경도: '',
    교육시작일자: '',
    교육종료일자: '',
    교육불가일자: '',
    근무시작시간: '',
    근무종료시간: '',
    점심시작시간: '',
    점심종료시간: '',
    간부명: '',
    '간부 전화번호': '',
    '간부 이메일 주소': '',
    기존교육장소: place,
    변경교육장소: '',
    '강사휴게실 여부': 'O',
    '여자화장실 여부': 'O',
    수탁급식여부: 'O',
    회관숙박여부: '',
    '사전사후 휴대폰 불출 여부': '',
    계획인원: randomInt(30, 100),
    참여인원: randomInt(20, 80),
    투입강사수: '',
    특이사항: '',
  };
}

async function generateTestExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('부대정보');

  // 1-2행은 비워두기
  worksheet.getCell('A1').value = '통합 테스트용 부대 데이터';
  worksheet.getCell('A2').value = `생성일: ${formatDate(new Date())} | 일정: 2026년 1월`;

  // 헤더
  const allHeaders = [
    '부대명',
    '군구분',
    '광역',
    '지역',
    '부대상세주소',
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
    '투입강사수',
    '특이사항',
  ];

  const startCol = 1; // A열
  const startRow = 3;

  // 헤더 스타일링
  allHeaders.forEach((header, index) => {
    const cell = worksheet.getCell(startRow, startCol + index);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.alignment = { horizontal: 'center' };
  });

  // 데이터 생성
  let currentRow = startRow + 1;

  // 90개 일반 부대 (단일 교육장소)
  for (let i = 0; i < 90; i++) {
    const unitData = generateUnit(i);
    allHeaders.forEach((header, colIndex) => {
      worksheet.getCell(currentRow, startCol + colIndex).value = unitData[header] as
        | string
        | number
        | boolean;
    });
    currentRow++;
  }

  // 10개 복수 교육장소 부대
  const multiLocationConfigs = [
    { locations: 2 },
    { locations: 2 },
    { locations: 2 },
    { locations: 2 },
    { locations: 3 },
    { locations: 3 },
    { locations: 3 },
    { locations: 4 },
    { locations: 4 },
    { locations: 5 },
  ];

  for (let i = 0; i < 10; i++) {
    // 첫 번째 행 = 메인 부대 정보
    const unitData = generateUnit(90 + i);
    unitData.부대명 = `복수장소테스트부대${i + 1}`;
    allHeaders.forEach((header, colIndex) => {
      worksheet.getCell(currentRow, startCol + colIndex).value = unitData[header] as
        | string
        | number
        | boolean;
    });
    currentRow++;

    // 추가 교육장소 행들
    const numExtraLocations = multiLocationConfigs[i].locations - 1;
    for (let j = 0; j < numExtraLocations; j++) {
      const extraPlace = `추가장소${j + 2}`;
      const additionalData = generateAdditionalLocation(extraPlace);
      allHeaders.forEach((header, colIndex) => {
        worksheet.getCell(currentRow, startCol + colIndex).value = additionalData[header] as
          | string
          | number
          | boolean;
      });
      currentRow++;
    }
  }

  // 열 너비 조정
  worksheet.columns.forEach((column) => {
    column.width = 16;
  });

  // 파일 저장
  const filePath = path.join(__dirname, '..', 'test-data', 'integrated-test-units.xlsx');
  await workbook.xlsx.writeFile(filePath);

  // eslint-disable-next-line no-console
  console.log(`✅ 통합 테스트 엑셀 파일 생성 완료: ${filePath}`);
  // eslint-disable-next-line no-console
  console.log('\n📋 구성:');
  // eslint-disable-next-line no-console
  console.log('   - 일반 부대: 90개 (단일 교육장소)');
  // eslint-disable-next-line no-console
  console.log('   - 복수 장소 부대: 10개');
  // eslint-disable-next-line no-console
  console.log('   - 교육 일정: 2026년 1월 분포');
  // eslint-disable-next-line no-console
  console.log('   - 모든 필수 필드 채움');
}

generateTestExcel().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
});
