/**
 * test-units-100.xlsx에 다중 교육장소 테스트 케이스 추가
 *
 * 구조: 같은 부대의 추가 교육장소는 부대명을 비우고 다음 행에 작성
 * Row N: 부대A, 교육장소1
 * Row N+1: (빈 부대명), 교육장소2  ← 부대A의 두 번째 교육장소
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
  let unitNameCol = -1,
    placeCol = -1;

  headerRow.eachCell((cell, colNumber) => {
    const text = cell.text?.trim() || '';
    if (text === '부대명') unitNameCol = colNumber;
    if (text === '기존교육장소') placeCol = colNumber;
  });

  console.log(`컬럼 인덱스: 부대명=${unitNameCol}, 기존교육장소=${placeCol}`);

  // 마지막 데이터 행 찾기
  const lastRow = 103; // 기존 100개 부대

  // 다중 교육장소 테스트 케이스 추가 (Row 104~110)
  // 기존 부대에 추가 교육장소 추가
  const multiLocationTests = [
    // Row 104: 새 부대 (교육장소 2개 테스트)
    { row: 104, unitName: '다중교육장소테스트부대1', place: '메인강당', isFirst: true },
    { row: 105, unitName: '', place: '보조강당', isFirst: false },

    // Row 106-108: 교육장소 3개 테스트
    { row: 106, unitName: '다중교육장소테스트부대2', place: '대회의실', isFirst: true },
    { row: 107, unitName: '', place: '소회의실A', isFirst: false },
    { row: 108, unitName: '', place: '소회의실B', isFirst: false },

    // Row 109-113: 교육장소 5개 테스트
    { row: 109, unitName: '다중교육장소테스트부대3', place: '강당1', isFirst: true },
    { row: 110, unitName: '', place: '강당2', isFirst: false },
    { row: 111, unitName: '', place: '체육관', isFirst: false },
    { row: 112, unitName: '', place: '야외훈련장', isFirst: false },
    { row: 113, unitName: '', place: '세미나실', isFirst: false },
  ];

  for (const tc of multiLocationTests) {
    const row = worksheet.getRow(tc.row);

    row.getCell(unitNameCol).value = tc.unitName;
    row.getCell(placeCol).value = tc.place;

    if (tc.isFirst) {
      // 첫 번째 행에만 부대 정보 추가
      row.getCell(4).value = '서울'; // 지역
      row.getCell(5).value = '2025-02-01'; // 교육종료일자
      row.getCell(6).value = '육군'; // 군구분
      row.getCell(7).value = '담당관테스트'; // 간부명
      row.getCell(8).value = '서울'; // 광역
      row.getCell(9).value = '2025-02-01'; // 교육시작일자
      row.getCell(10).value = '서울특별시 강남구 테스트로 123'; // 부대상세주소
      row.getCell(14).value = '09:00'; // 근무시작시간
      row.getCell(15).value = '18:00'; // 근무종료시간
    }

    // 교육장소 상세정보 (모든 행)
    row.getCell(21).value = 'O'; // 강사휴게실
    row.getCell(22).value = 'O'; // 여자화장실
    row.getCell(26).value = 100; // 계획인원
    row.getCell(27).value = 90; // 참여인원

    row.commit();
    console.log(`  Row ${tc.row}: ${tc.unitName || '(추가장소)'} - ${tc.place}`);
  }

  await workbook.xlsx.writeFile(EXCEL_PATH);
  console.log(`\n✅ 다중 교육장소 테스트 케이스 추가 완료`);
  console.log(`   - 2개 장소 부대: 1개`);
  console.log(`   - 3개 장소 부대: 1개`);
  console.log(`   - 5개 장소 부대: 1개`);
}

main().catch(console.error);
