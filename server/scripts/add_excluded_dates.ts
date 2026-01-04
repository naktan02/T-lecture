/**
 * 엑셀 테스트 데이터에 교육불가일자 추가 스크립트
 * - 일부 부대에 교육불가일자 추가
 * - 3일 정책 테스트 케이스 포함 (4일 범위 + 1일 제외 = 3일 유효)
 */
import ExcelJS from 'exceljs';
import path from 'path';

const INPUT_PATH = path.join(__dirname, '../test-data/test-units-100.xlsx');
const OUTPUT_PATH = path.join(__dirname, '../test-data/test-units-100.xlsx');

async function main() {
  console.log('📂 엑셀 파일 로딩...');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(INPUT_PATH);
  const worksheet = workbook.getWorksheet(1);

  if (!worksheet) {
    console.error('❌ 시트를 찾을 수 없습니다.');
    return;
  }

  // 헤더 컬럼 인덱스 찾기
  const headerRow = worksheet.getRow(3);
  let eduStartCol = -1,
    eduEndCol = -1,
    excludedCol = -1;

  headerRow.eachCell((cell, colNumber) => {
    const text = cell.text?.trim() || '';
    if (text === '교육시작일자') eduStartCol = colNumber;
    if (text === '교육종료일자') eduEndCol = colNumber;
    if (text === '교육불가일자') excludedCol = colNumber;
  });

  console.log(`컬럼 인덱스: 시작=${eduStartCol}, 종료=${eduEndCol}, 불가=${excludedCol}`);

  if (excludedCol === -1) {
    console.error('❌ 교육불가일자 컬럼을 찾을 수 없습니다.');
    return;
  }

  // 데이터 수정
  let modifiedCount = 0;

  // 10개 부대에 교육불가일자 추가
  const testCases = [
    // 일반 케이스: 교육기간 내 1일 제외
    { row: 4, excludedDate: '2025-02-02' },
    { row: 5, excludedDate: '2025-02-02' },
    { row: 6, excludedDate: '2025-02-02' },
    { row: 7, excludedDate: '2025-02-02' },
    { row: 8, excludedDate: '2025-02-02' },

    // 3일 정책 테스트: 4일 범위(01~04) + 1일 제외(02) = 3일 유효
    // 이 케이스들은 교육기간을 4일로 설정 필요
    { row: 9, start: '2025-02-01', end: '2025-02-04', excludedDate: '2025-02-02' },
    { row: 10, start: '2025-02-01', end: '2025-02-04', excludedDate: '2025-02-02' },

    // 여러 날짜 제외 테스트
    { row: 11, start: '2025-02-01', end: '2025-02-05', excludedDate: '2025-02-02, 2025-02-04' },

    // 연속 제외 테스트
    { row: 12, start: '2025-02-01', end: '2025-02-06', excludedDate: '2025-02-03, 2025-02-04' },

    // 빈 제외 (기준 케이스)
    { row: 13, start: '2025-02-01', end: '2025-02-03', excludedDate: '' },
  ];

  for (const tc of testCases) {
    const row = worksheet.getRow(tc.row);

    // 교육기간 수정 (필요한 경우)
    if (tc.start && eduStartCol > 0) {
      row.getCell(eduStartCol).value = tc.start;
    }
    if (tc.end && eduEndCol > 0) {
      row.getCell(eduEndCol).value = tc.end;
    }

    // 교육불가일자 추가
    row.getCell(excludedCol).value = tc.excludedDate;
    row.commit();

    if (tc.excludedDate) {
      modifiedCount++;
      console.log(`  Row ${tc.row}: 교육불가일자 = "${tc.excludedDate}"`);
    }
  }

  // 저장
  await workbook.xlsx.writeFile(OUTPUT_PATH);
  console.log(`\n✅ 엑셀 파일 업데이트 완료: ${modifiedCount}건 수정`);
  console.log(`   ${OUTPUT_PATH}`);
}

main().catch(console.error);
