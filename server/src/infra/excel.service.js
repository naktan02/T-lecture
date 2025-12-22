// server/src/infra/excel.service.js
const xlsx = require('xlsx');

class ExcelService {
  bufferToJson(fileBuffer) {
    if (!fileBuffer) {
      throw new Error('파일 데이터가 없습니다.');
    }

    // ✅ [중요] cellDates: true 추가
    const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // defval: '' 로 빈 셀 처리
    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (rawRows.length === 0) {
      throw new Error('엑셀 파일에 데이터가 없습니다.');
    }

    return rawRows;
  }
}

module.exports = new ExcelService();