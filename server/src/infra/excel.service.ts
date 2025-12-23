// server/src/infra/excel.service.ts
import xlsx from 'xlsx';
import { AppError } from '../common/errors/AppError';

class ExcelService {
  // 엑셀 파일 버퍼를 JSON 배열로 변환 (공통 기능)
  bufferToJson(fileBuffer: Buffer): Record<string, unknown>[] {
    if (!fileBuffer) {
      throw new AppError('파일 데이터가 없습니다.', 400, 'INVALID_FILE_DATA');
    }

    // ✅ cellDates: true for proper date parsing (from JS version)
    const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // defval: '' for empty cell handling (from JS version)
    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];

    if (rawRows.length === 0) {
      throw new AppError('엑셀 파일에 데이터가 없습니다.', 400, 'EMPTY_EXCEL_FILE');
    }

    return rawRows;
  }
}

const excelService = new ExcelService();
export default excelService;

// CommonJS 호환 (테스트 모킹용)
module.exports = excelService;
