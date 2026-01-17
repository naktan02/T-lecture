const ExcelJS = require('exceljs');
const path = require('path');

async function generateTestExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Unit Test Data');

  // Header rows for meta info (optional but supported by excel.service.ts)
  worksheet.addRow(['강의년도', 2026]);
  worksheet.addRow([]); // Empty row

  // Define columns based on COLUMN_MAPPING in excel.service.ts
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
    '간부명',
    '간부 전화번호',
    '기존교육장소',
    '계획인원',
  ];
  worksheet.addRow(headers);

  // Test Data
  const data = [
    // 1. 정상 데이터 (Valid)
    [
      '정상부대_01',
      '육군',
      '경기도',
      '가평군',
      '경기도 가평군 가평읍 읍내리 443-4',
      '101호',
      '2026-03-01',
      '2026-03-05',
      '',
      '홍길동',
      '010-1234-5678',
      '가평 연성',
      30,
    ],

    // 2. 날짜 누락 (Missing Dates) -> Invalid
    [
      '오류부대_날짜누락',
      '해군',
      '경상남도',
      '창원시',
      '경상남도 창원시 진해구 중원로 1',
      '',
      '',
      '',
      '',
      '이순신',
      '010-2222-3333',
      '진해 기지',
      50,
    ],

    // 3. 날짜 형식 오류 (Invalid Date Format) -> Invalid
    [
      '오류부대_날짜형식',
      '공군',
      '충청남도',
      '계룡시',
      '충청남도 계룡시 신도안면 계룡대로 663',
      '',
      'invalid-date',
      '2026-04-10',
      '',
      '강감찬',
      '010-4444-5555',
      '계룡대 체육관',
      40,
    ],

    // 4. 날짜 논리 오류 (Logic Error) -> Invalid
    [
      '오류부대_날짜논리',
      '육군',
      '강원도',
      '춘천시',
      '강원도 춘천시 신북읍 신샘밭로 604',
      '',
      '2026-05-10',
      '2026-05-01',
      '',
      '을지문덕',
      '010-6666-7777',
      '춘천 연성',
      20,
    ],

    // 5. 주소 오류 (Geocoding Error) -> Invalid (or marked with message)
    [
      '오류부대_주소오류',
      '해병대',
      '포항시',
      '남구',
      '화성시 어딘가 이상한 주소 12345',
      '',
      '2026-06-01',
      '2026-06-03',
      '',
      '김유신',
      '010-8888-9999',
      '포항 연성',
      60,
    ],

    // 6. 일정 생성 실패 (No Schedules) -> Invalid
    [
      '오류부대_일정없음',
      '육군',
      '경기도',
      '양평군',
      '경기도 양평군 양평읍 중앙로 63',
      '',
      '2026-07-01',
      '2026-07-01',
      '2026-07-01',
      '선덕여왕',
      '010-1111-2222',
      '양평 연성',
      10,
    ],

    // 7. 주소 누락 -> Invalid
    [
      '오류부대_주소누락',
      '육군',
      '서울',
      '용산구',
      '',
      '',
      '2026-08-01',
      '2026-08-05',
      '',
      '안중근',
      '010-3333-4444',
      '용산 연성',
      100,
    ],
  ];

  data.forEach((row) => worksheet.addRow(row));

  const filePath = path.join(__dirname, 'unit_validation_test.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log(`Test Excel file generated at: ${filePath}`);
}

generateTestExcel().catch(console.error);
