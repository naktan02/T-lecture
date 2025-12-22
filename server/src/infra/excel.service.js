// server/src/infra/excel.service.js
const xlsx = require('xlsx');

class ExcelService {
  // 엑셀 파일 버퍼를 JSON 배열로 변환 (공통 기능)
  bufferToJson(fileBuffer) {
    if (!fileBuffer) {
      throw new Error('파일 데이터가 없습니다.');
    }

    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawRows = xlsx.utils.sheet_to_json(sheet);

    if (rawRows.length === 0) {
      throw new Error('엑셀 파일에 데이터가 없습니다.');
    }

    return rawRows;
  }
}

module.exports = new ExcelService();