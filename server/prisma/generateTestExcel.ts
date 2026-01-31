// server/prisma/generateTestExcel.ts
// 주말/공휴일 제외 로직 테스트용 엑셀 파일 생성
// 실행: npx tsx prisma/generateTestExcel.ts

import ExcelJS from 'exceljs';
import path from 'path';

/**
 * 테스트 시나리오 (10개 부대)
 *
 * 2026년 한국 공휴일:
 * - 1월 1일: 신정
 * - 2월 16-18일: 설날 연휴
 * - 3월 1일: 삼일절 (일요일)
 * - 5월 5일: 어린이날 (부처님오신날과 겹침)
 * - 5월 6일: 대체공휴일
 * - 5월 24일: 부처님오신날
 * - 6월 6일: 현충일 (토요일)
 * - 8월 15일: 광복절 (토요일)
 * - 9월 24-26일: 추석 연휴
 * - 10월 3일: 개천절 (토요일)
 * - 10월 5-8일: 추석 연휴 (2025와 혼동 - 정정: 2026년은 9월)
 * - 10월 9일: 한글날 (금요일)
 * - 12월 25일: 성탄절 (금요일)
 */

const testUnits = [
  {
    name: '육군1사단(테스트)',
    type: 'Army',
    wideArea: '서울특별시',
    region: '강남구',
    address: '서울특별시 강남구 테헤란로 152',
    detailAddress: '본관 1층',
    // 시나리오 1: 정상 기간 (주말/공휴일 없음)
    startDate: '2026-01-05', // 월요일
    endDate: '2026-01-09',   // 금요일
    excludedDates: '',
    description: '정상 - 주말/공휴일 없음 (5일 모두 생성되어야 함)',
    expectedSchedules: 5,
  },
  {
    name: '해군2함대(테스트)',
    type: 'Navy',
    wideArea: '인천광역시',
    region: '연수구',
    address: '인천광역시 연수구 컨벤시아대로 165',
    detailAddress: '본관 2층',
    // 시나리오 2: 신정(1/1) + 주말(1/3-4) 포함
    startDate: '2026-01-01', // 목요일 (신정)
    endDate: '2026-01-06',   // 화요일
    excludedDates: '',
    description: '신정(1/1) + 주말(1/3-4) 포함 → 1/2, 1/5, 1/6만 생성 (3일)',
    expectedSchedules: 3,
  },
  {
    name: '공군3비행단(테스트)',
    type: 'AirForce',
    wideArea: '경기도',
    region: '수원시 영통구',
    address: '경기도 수원시 영통구 광교로 156',
    detailAddress: '본관 3층',
    // 시나리오 3: 설날 연휴(2/16-18) 포함 (보정 후: 2/16, 2/17, 2/18이 공휴일)
    startDate: '2026-02-13', // 금요일
    endDate: '2026-02-20',   // 금요일
    excludedDates: '',
    description: '설날(2/16-18)+주말(2/14-15) → 2/13, 2/19, 2/20 생성 (3일)',
    expectedSchedules: 3,
  },
  {
    name: '해병4사단(테스트)',
    type: 'Marines',
    wideArea: '부산광역시',
    region: '해운대구',
    address: '부산광역시 해운대구 센텀중앙로 79',
    detailAddress: '본관 1층',
    // 시나리오 4: 주말(1/10-11)만 포함
    startDate: '2026-01-09', // 금요일
    endDate: '2026-01-14',   // 수요일
    excludedDates: '',
    description: '주말(1/10-11) 포함 → 1/9, 1/12, 1/13, 1/14만 생성 (4일)',
    expectedSchedules: 4,
  },
  {
    name: '육군5군단(테스트)',
    type: 'Army',
    wideArea: '강원특별자치도',
    region: '원주시',
    address: '강원특별자치도 원주시 서원대로 158',
    detailAddress: '교육관 1층',
    // 시나리오 5: 어린이날(5/5)만 공휴일 (5/6은 대체공휴일 아님)
    startDate: '2026-05-04', // 월요일
    endDate: '2026-05-08',   // 금요일
    excludedDates: '',
    description: '어린이날(5/5)만 공휴일 → 5/4, 5/6, 5/7, 5/8 생성 (4일)',
    expectedSchedules: 4,
  },
  {
    name: '공군6전투비행단(테스트)',
    type: 'AirForce',
    wideArea: '충청남도',
    region: '천안시 동남구',
    address: '충청남도 천안시 동남구 대흥로 215',
    detailAddress: '회의실',
    // 시나리오 6: 추석 연휴(9/24-26) 포함 + 주말(9/26-27)
    startDate: '2026-09-23', // 수요일
    endDate: '2026-09-30',   // 수요일
    excludedDates: '',
    description: '추석(9/24-26)+주말(9/26-27) 포함 → 9/23, 9/28, 9/29, 9/30만 생성 (4일)',
    expectedSchedules: 4,
  },
  {
    name: '해군7전대(테스트)',
    type: 'Navy',
    wideArea: '전라남도',
    region: '여수시',
    address: '전라남도 여수시 시청로 1',
    detailAddress: '대강당',
    // 시나리오 7: 삼일절(3/1, 일요일) + 대체공휴일(3/2) 포함
    startDate: '2026-02-27', // 금요일
    endDate: '2026-03-04',   // 수요일
    excludedDates: '',
    description: '삼일절(3/1)+대체(3/2)+주말 → 2/27, 3/3, 3/4 생성 (3일)',
    expectedSchedules: 3,
  },
  {
    name: '육군8사단(테스트)',
    type: 'Army',
    wideArea: '경상북도',
    region: '포항시 남구',
    address: '경상북도 포항시 남구 시청로 1',
    detailAddress: '체육관',
    // 시나리오 8: 광복절(8/15, 토요일) + 대체공휴일(8/17) 포함
    startDate: '2026-08-13', // 목요일
    endDate: '2026-08-18',   // 화요일
    excludedDates: '',
    description: '광복절(8/15)+대체(8/17)+주말 → 8/13, 8/14, 8/18 생성 (3일)',
    expectedSchedules: 3,
  },
  {
    name: '국직9부대(테스트)',
    type: 'MND',
    wideArea: '대전광역시',
    region: '유성구',
    address: '대전광역시 유성구 대학로 99',
    detailAddress: '세미나실',
    // 시나리오 9: 성탄절(12/25, 금요일) + 주말(12/26-27) 포함
    startDate: '2026-12-23', // 수요일
    endDate: '2026-12-29',   // 화요일
    excludedDates: '',
    description: '성탄절(12/25)+주말(12/26-27) 포함 → 12/23, 12/24, 12/28, 12/29만 생성 (4일)',
    expectedSchedules: 4,
  },
  {
    name: '육군10사단(테스트)',
    type: 'Army',
    wideArea: '경기도',
    region: '파주시',
    address: '경기도 파주시 문발로 242',
    detailAddress: '훈련장',
    // 시나리오 10: 개천절(10/3, 토) + 대체(10/5) + 한글날(10/9) + 주말 포함
    startDate: '2026-10-02', // 금요일
    endDate: '2026-10-12',   // 월요일
    excludedDates: '',
    description: '개천절+대체(10/5)+한글날(10/9)+주말 → 10/2, 10/6, 10/7, 10/8, 10/12 생성 (5일)',
    expectedSchedules: 5,
  },
];

async function generateTestExcel() {
  console.log('📄 테스트용 엑셀 파일 생성 중...\n');
  console.log('='.repeat(70));
  console.log('📋 테스트 시나리오');
  console.log('='.repeat(70));

  for (let i = 0; i < testUnits.length; i++) {
    const unit = testUnits[i];
    console.log(`\n${i + 1}. ${unit.name}`);
    console.log(`   교육기간: ${unit.startDate} ~ ${unit.endDate}`);
    console.log(`   시나리오: ${unit.description}`);
    console.log(`   예상 일정 수: ${unit.expectedSchedules}일`);
  }
  console.log('\n' + '='.repeat(70));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'T-Lecture Test';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('부대 업로드 테스트');

  // 메타데이터 행 (1행)
  sheet.getCell('A1').value = '강의년도';
  sheet.getCell('B1').value = 2026;

  // 헤더 정의 (6행)
  const headers = [
    '부대명', '군구분', '광역', '지역', '부대주소', '부대상세주소',
    '교육시작일자', '교육종료일자', '교육불가일자',
    '근무시작시간', '근무종료시간', '점심시작시간', '점심종료시간',
    '간부명', '간부 전화번호', '간부 이메일 주소',
    '수탁급식여부', '회관숙박여부', '사전사후 휴대폰 불출 여부',
    '기존교육장소', '변경교육장소', '강사휴게실 여부', '여자화장실 여부',
    '계획인원', '참여인원', '특이사항'
  ];

  const headerRow = sheet.getRow(6);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
  });

  // 데이터 행 (7행부터)
  let rowNum = 7;
  for (let i = 0; i < testUnits.length; i++) {
    const unit = testUnits[i];
    const row = sheet.getRow(rowNum);

    row.getCell(1).value = unit.name;
    row.getCell(2).value = unit.type;
    row.getCell(3).value = unit.wideArea;
    row.getCell(4).value = unit.region;
    row.getCell(5).value = unit.address;
    row.getCell(6).value = unit.detailAddress;
    row.getCell(7).value = unit.startDate;
    row.getCell(8).value = unit.endDate;
    row.getCell(9).value = unit.excludedDates;
    row.getCell(10).value = '09:00';
    row.getCell(11).value = '18:00';
    row.getCell(12).value = '12:00';
    row.getCell(13).value = '13:00';
    row.getCell(14).value = `테스트담당자${i + 1}`;
    row.getCell(15).value = `010-1234-${String(i + 1).padStart(4, '0')}`;
    row.getCell(16).value = `test${i + 1}@army.mil.kr`;
    row.getCell(17).value = 'O';
    row.getCell(18).value = 'O';
    row.getCell(19).value = 'O';
    row.getCell(20).value = '대강당';
    row.getCell(21).value = '';
    row.getCell(22).value = 'O';
    row.getCell(23).value = 'O';
    row.getCell(24).value = 100;
    row.getCell(25).value = 95;
    row.getCell(26).value = unit.description;

    rowNum++;
  }

  // 열 너비 조정
  sheet.columns.forEach((column, i) => {
    if (i === 0) column.width = 25; // 부대명
    else if (i === 4) column.width = 35; // 부대주소
    else if (i === 25) column.width = 60; // 특이사항 (테스트 설명)
    else column.width = 15;
  });

  // 파일 저장
  const filePath = path.join(__dirname, '../../test_units_holiday.xlsx');
  await workbook.xlsx.writeFile(filePath);

  console.log(`\n✅ 테스트 엑셀 파일 생성 완료: ${filePath}`);
  console.log('\n📌 사용 방법:');
  console.log('   1. 부대 관리 페이지에서 이 파일을 업로드');
  console.log('   2. 각 부대의 생성된 일정 수 확인');
  console.log('   3. 예상 일정 수와 비교하여 주말/공휴일 제외 로직 검증');
  console.log('\n📊 검증 포인트:');
  testUnits.forEach((unit, i) => {
    console.log(`   ${i + 1}. ${unit.name}: ${unit.expectedSchedules}일 예상`);
  });
}

// 직접 실행
generateTestExcel()
  .then(() => {
    console.log('\n✅ 완료');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ 실패:', e);
    process.exit(1);
  });
