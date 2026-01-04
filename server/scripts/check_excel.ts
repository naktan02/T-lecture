import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const EXCEL_PATH = path.join(__dirname, '../test-data/test-units-100.xlsx');
const OUTPUT_PATH = path.join(__dirname, '../test-data/excel_worktime_check.txt');

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);
  const worksheet = workbook.getWorksheet(1);

  if (!worksheet) return;

  let output = '=== 근무시간 및 교육불가일자 체크 ===\n\n';

  // 헤더 찾기
  const headerRow = worksheet.getRow(3);
  const headers: Record<number, string> = {};
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = cell.text?.trim() || '';
  });

  // 컬럼 인덱스 찾기
  let workStartCol = -1,
    workEndCol = -1,
    excludedCol = -1;
  for (const [col, header] of Object.entries(headers)) {
    if (header === '근무시작시간') workStartCol = parseInt(col);
    if (header === '근무종료시간') workEndCol = parseInt(col);
    if (header === '교육불가일자') excludedCol = parseInt(col);
  }

  output += `근무시작시간 컬럼: ${workStartCol}\n`;
  output += `근무종료시간 컬럼: ${workEndCol}\n`;
  output += `교육불가일자 컬럼: ${excludedCol}\n\n`;

  // 데이터 샘플 확인
  let hasWorkTime = 0;
  let noWorkTime = 0;
  let hasExcluded = 0;

  for (let rowNum = 4; rowNum <= 103; rowNum++) {
    const row = worksheet.getRow(rowNum);

    const workStart = workStartCol > 0 ? row.getCell(workStartCol).text : '';
    const workEnd = workEndCol > 0 ? row.getCell(workEndCol).text : '';
    const excluded = excludedCol > 0 ? row.getCell(excludedCol).text : '';

    if (workStart && workEnd) {
      hasWorkTime++;
    } else {
      noWorkTime++;
      if (noWorkTime <= 5) {
        output += `Row ${rowNum}: 근무시간 없음 (start="${workStart}", end="${workEnd}")\n`;
      }
    }

    if (excluded) {
      hasExcluded++;
      output += `Row ${rowNum}: 교육불가일자="${excluded}"\n`;
    }
  }

  output += `\n=== 요약 ===\n`;
  output += `근무시간 있음: ${hasWorkTime}개\n`;
  output += `근무시간 없음: ${noWorkTime}개\n`;
  output += `교육불가일자 있음: ${hasExcluded}개\n`;

  fs.writeFileSync(OUTPUT_PATH, output);
  console.log('분석 완료:', OUTPUT_PATH);
}

main().catch(console.error);
