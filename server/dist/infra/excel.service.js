"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/infra/excel.service.ts
const xlsx_1 = __importDefault(require("xlsx"));
const AppError_1 = require("../common/errors/AppError");
class ExcelService {
    // 엑셀 파일 버퍼를 JSON 배열로 변환 (공통 기능)
    bufferToJson(fileBuffer) {
        if (!fileBuffer) {
            throw new AppError_1.AppError('파일 데이터가 없습니다.', 400, 'INVALID_FILE_DATA');
        }
        const workbook = xlsx_1.default.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = xlsx_1.default.utils.sheet_to_json(sheet);
        if (rawRows.length === 0) {
            throw new AppError_1.AppError('엑셀 파일에 데이터가 없습니다.', 400, 'EMPTY_EXCEL_FILE');
        }
        return rawRows;
    }
}
exports.default = new ExcelService();
