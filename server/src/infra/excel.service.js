const xlsx = require('xlsx');

class ExcelService {
  // 엑셀 파일 버퍼를 JSON 배열로 변환 (공통 기능)
  bufferToJson(fileBuffer) {
    if (!fileBuffer) {
      throw new Error('파일 데이터가 없습니다.');
    }

    // ✅ [수정] cellDates: true 옵션 추가 (날짜 형식을 올바르게 읽기 위함)
    const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // defval: '' 옵션을 주어 빈 셀도 처리되도록 함
    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (rawRows.length === 0) {
      throw new Error('엑셀 파일에 데이터가 없습니다.');
    }

    return rawRows;
  }
}

module.exports = new ExcelService();