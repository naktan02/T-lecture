/**
 * 다중 교육불가일자 테스트 케이스 추가
 * 목표: 교육기간 - 교육불가일자 = 3일 (정책 준수)
 */
import ExcelJS from 'exceljs';
import path from 'path';

const EXCEL_PATH = path.join(__dirname, '../test-data/test-units-100.xlsx');

async function main() {
  console.log('📂 엑셀 파일 로딩...');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);
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

  // 다중 제외일자 + 3일 정책 테스트 케이스
  const testCases = [
    // 기존 유지 (Row 4-10)

    // 다중 제외 + 3일 정책 테스트 (Row 11-15)
    // 5일 범위 - 2일 제외 = 3일
    { row: 11, start: '2025-02-01', end: '2025-02-05', excludedDate: '2025-02-02, 2025-02-04' },
    // 5일 범위 - 2일 연속 제외 = 3일
    { row: 12, start: '2025-02-01', end: '2025-02-05', excludedDate: '2025-02-02, 2025-02-03' },
    // 6일 범위 - 3일 제외 = 3일
    {
      row: 13,
      start: '2025-02-01',
      end: '2025-02-06',
      excludedDate: '2025-02-02, 2025-02-04, 2025-02-05',
    },
    // 7일 범위 - 4일 제외 = 3일 (연속 제외)
    {
      row: 14,
      start: '2025-02-01',
      end: '2025-02-07',
      excludedDate: '2025-02-02, 2025-02-03, 2025-02-04, 2025-02-05',
    },
    // 6일 범위 - 3일 비연속 제외 = 3일
    {
      row: 15,
      start: '2025-02-01',
      end: '2025-02-06',
      excludedDate: '2025-02-01, 2025-02-03, 2025-02-05',
    },
  ];

  let modifiedCount = 0;

  for (const tc of testCases) {
    const row = worksheet.getRow(tc.row);

    if (tc.start && eduStartCol > 0) {
      row.getCell(eduStartCol).value = tc.start;
    }
    if (tc.end && eduEndCol > 0) {
      row.getCell(eduEndCol).value = tc.end;
    }
    row.getCell(excludedCol).value = tc.excludedDate;
    row.commit();

    modifiedCount++;
    console.log(`  Row ${tc.row}: ${tc.start}~${tc.end} 제외=[${tc.excludedDate}]`);
  }

  await workbook.xlsx.writeFile(EXCEL_PATH);
  console.log(`\n✅ 엑셀 파일 업데이트 완료: ${modifiedCount}건 수정`);
}

main().catch(console.error);
