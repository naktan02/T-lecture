// 최종 통합 테스트용 엑셀 생성 스크립트
// - 100개 부대 (모든 스키마 필드 반영)
// - 복수 교육장소 테스트 (10개 부대)
// - 불가일자 테스트 (단일/복수)
// - 2026년 1월 일정
// 실행: npx tsx scripts/generate-final-test-excel.ts

import ExcelJS from 'exceljs';
import path from 'path';

// 데이터 생성용 배열
const UNIT_NAMES = [
  '보병사단',
  '기갑여단',
  '포병여단',
  '공병여단',
  '통신여단',
  '군수지원사령부',
  '함대사령부',
  '전투비행단',
  '해병사단',
  '국방부직할부대',
];
const WIDE_AREAS = [
  '서울특별시',
  '경기도',
  '인천광역시',
  '충청남도',
  '충청북도',
  '강원도',
  '전라남도',
  '전라북도',
  '경상남도',
  '경상북도',
  '부산광역시',
  '대구광역시',
  '광주광역시',
  '대전광역시',
  '제주특별자치도',
];
const REGIONS: Record<string, string[]> = {
  서울특별시: ['용산구', '종로구', '강남구', '서초구'],
  경기도: ['수원시', '성남시', '고양시', '용인시', '파주시', '의정부시', '평택시'],
  인천광역시: ['남동구', '연수구', '부평구'],
  충청남도: ['천안시', '공주시', '논산시', '계룡시'],
  충청북도: ['청주시', '충주시', '제천시'],
  강원도: ['춘천시', '원주시', '강릉시', '철원군', '화천군'],
  전라남도: ['목포시', '여수시', '순천시'],
  전라북도: ['전주시', '군산시', '익산시'],
  경상남도: ['창원시', '진주시', '김해시'],
  경상북도: ['포항시', '경주시', '구미시'],
  부산광역시: ['영도구', '해운대구', '남구'],
  대구광역시: ['동구', '서구', '수성구'],
  광주광역시: ['동구', '서구', '광산구'],
  대전광역시: ['유성구', '대덕구', '서구'],
  제주특별자치도: ['제주시', '서귀포시'],
};
const LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
const FIRST_NAMES = [
  '민준',
  '서준',
  '예준',
  '도윤',
  '지호',
  '준우',
  '현우',
  '지민',
  '성민',
  '재원',
];
const PLACES = ['대강당', '체육관', '교육관', '회의실A', '다목적실', '세미나실', '훈련장'];
const MILITARY_TYPES = ['육군', '해군', '공군', '해병대', '국직부대'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomPhone(): string {
  return `010-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
}
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 2026년 1월 날짜 생성
function getEducationDates(dayOfMonth: number): { start: string; end: string } {
  const start = new Date(Date.UTC(2026, 0, dayOfMonth));
  const end = new Date(Date.UTC(2026, 0, dayOfMonth + 2));
  return { start: formatDate(start), end: formatDate(end) };
}

// 불가일자 생성 (교육 기간 내 하루 또는 복수일)
function getExcludedDates(dayOfMonth: number, type: 'none' | 'single' | 'multiple'): string {
  if (type === 'none') return '';
  const day1 = new Date(Date.UTC(2026, 0, dayOfMonth + 1)); // 교육 둘째날
  if (type === 'single') return formatDate(day1);
  const day2 = new Date(Date.UTC(2026, 0, dayOfMonth + 2)); // 교육 셋째날
  return `${formatDate(day1)}, ${formatDate(day2)}`; // 복수 불가일자
}

interface UnitRow {
  부대명: string;
  군구분: string;
  광역: string;
  지역: string;
  부대주소: string;
  부대상세주소: string;
  위도: number | string;
  경도: number | string;
  교육시작일자: string;
  교육종료일자: string;
  교육불가일자: string;
  근무시작시간: string;
  근무종료시간: string;
  점심시작시간: string;
  점심종료시간: string;
  간부명: string;
  '간부 전화번호': string;
  '간부 이메일 주소': string;
  기존교육장소: string;
  변경교육장소: string;
  '강사휴게실 여부': string;
  '여자화장실 여부': string;
  수탁급식여부: string;
  회관숙박여부: string;
  '사전사후 휴대폰 불출 여부': string;
  계획인원: number | string;
  참여인원: number | string;
  특이사항: string;
}

function generateUnit(
  index: number,
  excludedType: 'none' | 'single' | 'multiple' = 'none',
): UnitRow {
  const wideArea = randomChoice(WIDE_AREAS);
  const region = randomChoice(REGIONS[wideArea] || ['중앙']);
  const officerName = `${randomChoice(LAST_NAMES)}${randomChoice(FIRST_NAMES)}`;
  const dayOfMonth = (index % 26) + 1;
  const { start, end } = getEducationDates(dayOfMonth);
  const lat = 34.5 + Math.random() * 3;
  const lng = 126.0 + Math.random() * 3;

  return {
    부대명: `제${index + 1}${randomChoice(UNIT_NAMES)}`,
    군구분: randomChoice(MILITARY_TYPES),
    광역: wideArea,
    지역: region,
    부대주소: `${wideArea} ${region} 군사로 ${randomInt(1, 500)}`,
    부대상세주소: `본관 ${randomInt(1, 5)}층`,
    위도: Number(lat.toFixed(6)),
    경도: Number(lng.toFixed(6)),
    교육시작일자: start,
    교육종료일자: end,
    교육불가일자: getExcludedDates(dayOfMonth, excludedType),
    근무시작시간: '09:00',
    근무종료시간: '18:00',
    점심시작시간: '12:00',
    점심종료시간: '13:00',
    간부명: officerName,
    '간부 전화번호': randomPhone(),
    '간부 이메일 주소': `${officerName.substring(1)}${randomInt(1, 99)}@army.mil.kr`,
    기존교육장소: randomChoice(PLACES),
    변경교육장소: '',
    '강사휴게실 여부': 'O',
    '여자화장실 여부': 'O',
    수탁급식여부: Math.random() > 0.3 ? 'O' : 'X',
    회관숙박여부: Math.random() > 0.4 ? 'O' : 'X',
    '사전사후 휴대폰 불출 여부': 'O',
    계획인원: randomInt(30, 150),
    참여인원: randomInt(20, 100),
    특이사항: '',
  };
}

// 복수 교육장소용 추가 행 (부대명 비움)
function generateAdditionalLocation(place: string): UnitRow {
  return {
    부대명: '',
    군구분: '',
    광역: '',
    지역: '',
    부대주소: '',
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
    계획인원: randomInt(20, 80),
    참여인원: randomInt(15, 60),
    특이사항: '',
  };
}

async function generateExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('부대정보');

  worksheet.getCell('A1').value = '최종 통합 테스트 부대 데이터';
  worksheet.getCell('A2').value = `생성일: ${formatDate(new Date())} | 일정: 2026년 1월`;

  const headers = [
    '부대명',
    '군구분',
    '광역',
    '지역',
    '부대주소',
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
    '특이사항',
  ];

  const startRow = 3;
  headers.forEach((h, i) => {
    const cell = worksheet.getCell(startRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  });

  let row = startRow + 1;

  // 70개 일반 부대 (불가일자 없음)
  for (let i = 0; i < 70; i++) {
    const data = generateUnit(i, 'none');
    headers.forEach((h, col) => {
      worksheet.getCell(row, col + 1).value = data[h as keyof UnitRow] as string | number;
    });
    row++;
  }

  // 10개 단일 불가일자 부대
  for (let i = 70; i < 80; i++) {
    const data = generateUnit(i, 'single');
    data.부대명 = `불가일자테스트부대${i - 69}`;
    headers.forEach((h, col) => {
      worksheet.getCell(row, col + 1).value = data[h as keyof UnitRow] as string | number;
    });
    row++;
  }

  // 10개 복수 불가일자 부대
  for (let i = 80; i < 90; i++) {
    const data = generateUnit(i, 'multiple');
    data.부대명 = `복수불가일자테스트부대${i - 79}`;
    headers.forEach((h, col) => {
      worksheet.getCell(row, col + 1).value = data[h as keyof UnitRow] as string | number;
    });
    row++;
  }

  // 10개 복수 교육장소 부대
  const multiConfigs = [2, 2, 2, 2, 3, 3, 3, 4, 4, 5];
  for (let i = 0; i < 10; i++) {
    const data = generateUnit(90 + i, 'none');
    data.부대명 = `복수장소테스트부대${i + 1}`;
    headers.forEach((h, col) => {
      worksheet.getCell(row, col + 1).value = data[h as keyof UnitRow] as string | number;
    });
    row++;

    for (let j = 1; j < multiConfigs[i]; j++) {
      const extra = generateAdditionalLocation(`추가장소${j + 1}`);
      headers.forEach((h, col) => {
        worksheet.getCell(row, col + 1).value = extra[h as keyof UnitRow] as string | number;
      });
      row++;
    }
  }

  worksheet.columns.forEach((col) => {
    col.width = 16;
  });

  const filePath = path.join(__dirname, '..', 'test-data', 'final-test-units.xlsx');
  await workbook.xlsx.writeFile(filePath);

  console.log(`✅ 최종 테스트 엑셀 생성: ${filePath}`);
  console.log('   - 일반 부대: 70개');
  console.log('   - 단일 불가일자: 10개');
  console.log('   - 복수 불가일자: 10개');
  console.log('   - 복수 교육장소: 10개');
}

generateExcel().catch(console.error);
