// server/src/infra/excel.service.ts
import ExcelJS from 'exceljs';
import { AppError } from '../common/errors/AppError';

// DB 필드명 (한글) → 내부 필드명 매핑
// NOTE: 위도/경도는 주소 기반 API로 자동 계산되므로 엑셀에서 읽지 않음
const COLUMN_MAPPING: Record<string, string> = {
  // Unit 기본 정보
  부대명: 'name',
  군구분: 'unitType',
  광역: 'wideArea',
  지역: 'region',
  부대주소: 'addressDetail',
  '부대주소(상세)': 'detailAddress',
  부대상세주소: 'detailAddress',

  // 교육 일정
  교육시작일자: 'educationStart',
  교육종료일자: 'educationEnd',
  교육불가일자: 'excludedDates', // 콤마로 구분된 날짜 문자열

  // 근무 시간
  근무시작시간: 'workStartTime',
  근무종료시간: 'workEndTime',
  점심시작시간: 'lunchStartTime',
  점심종료시간: 'lunchEndTime',

  // 담당자 정보
  간부명: 'officerName',
  '간부 전화번호': 'officerPhone',
  '간부 이메일 주소': 'officerEmail',

  // 교육장소 정보
  기존교육장소: 'originalPlace',
  변경교육장소: 'changedPlace',
  '강사휴게실 여부': 'hasInstructorLounge',
  '여자화장실 여부': 'hasWomenRestroom',
  수탁급식여부: 'hasCateredMeals',
  회관숙박여부: 'hasHallLodging',
  '사전사후 휴대폰 불출 여부': 'allowsPhoneBeforeAfter',
  계획인원: 'plannedCount',
  참여인원: 'actualCount',
  특이사항: 'note',
};

class ExcelService {
  /**
   * 엑셀 파일 버퍼를 JSON 배열로 변환 (스마트 파싱)
   * - 헤더 행 자동 감지
   * - 컬럼 순서 무관
   * - 데이터 타입 자동 변환
   */
  async bufferToJson(fileBuffer: Buffer | ArrayBuffer): Promise<Record<string, unknown>[]> {
    const result = await this.bufferToJsonWithMeta(fileBuffer);
    return result.rows;
  }

  /**
   * 엑셀 파일 버퍼를 JSON 배열로 변환 (메타데이터 포함)
   * - 헤더 행 이전의 메타데이터 행에서 강의년도(lectureYear) 추출
   * - 메타데이터: "강의년도: 2026" 또는 "2026년" 형태 인식
   */
  async bufferToJsonWithMeta(fileBuffer: Buffer | ArrayBuffer): Promise<{
    rows: Record<string, unknown>[];
    meta: { lectureYear?: number };
  }> {
    if (!fileBuffer) {
      throw new AppError('파일 데이터가 없습니다.', 400, 'INVALID_FILE_DATA');
    }

    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(fileBuffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new AppError('엑셀 파일에 시트가 없습니다.', 400, 'NO_WORKSHEET');
    }

    // 1. 헤더 행 자동 감지
    const { headerRowNum, columnMap } = this._findHeaderRow(worksheet);
    if (headerRowNum === -1) {
      throw new AppError(
        '헤더 행을 찾을 수 없습니다. 알려진 컬럼명(부대명, 군구분 등)이 포함된 행이 필요합니다.',
        400,
        'HEADER_NOT_FOUND',
      );
    }

    // 2. 헤더 이전 행에서 강의년도 추출
    // 형식: A열에 '강의년도' 라벨, B열에 '2026' 값 (또는 같은 행 인접 셀)
    let lectureYear: number | undefined;
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber >= headerRowNum) return; // 헤더 이후는 무시
      if (lectureYear !== undefined) return; // 이미 찾았으면 스킵

      // 방법 1: '강의년도' 라벨을 찾고 옆 셀에서 년도 읽기
      let lectureYearLabelCol: number | null = null;
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const cellValue = String(cell.value || '').trim();
        if (cellValue === '강의년도' || cellValue === '강의연도') {
          lectureYearLabelCol = colNumber;
        }
      });

      if (lectureYearLabelCol !== null) {
        // 옆 셀(B열)에서 년도 읽기
        const yearCell = row.getCell(lectureYearLabelCol + 1);
        const yearValue = String(yearCell.value || '').trim();
        const yearMatch = yearValue.match(/^(\d{4})년?$/);
        if (yearMatch) {
          lectureYear = parseInt(yearMatch[1], 10);
        } else if (/^\d{4}$/.test(yearValue)) {
          lectureYear = parseInt(yearValue, 10);
        }
        return;
      }

      // 방법 2: 기존 형식 지원 ('강의년도: 2026' 또는 '2026년')
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (lectureYear !== undefined) return;
        const cellValue = String(cell.value || '').trim();

        const match1 = cellValue.match(/강의년도\s*[:：]?\s*(\d{4})/);
        if (match1) {
          lectureYear = parseInt(match1[1], 10);
          return;
        }

        const match2 = cellValue.match(/^(\d{4})년?$/);
        if (match2) {
          lectureYear = parseInt(match2[1], 10);
          return;
        }
      });
    });

    // 3. 데이터 행 파싱
    const rows: Record<string, unknown>[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRowNum) return; // 헤더 이전/헤더 행 스킵

      const rowData: Record<string, unknown> = {};
      let hasData = false;

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const fieldName = columnMap.get(colNumber);
        if (fieldName) {
          const value = this._convertCellValue(cell, fieldName);
          if (value !== null && value !== undefined && value !== '') {
            rowData[fieldName] = value;
            hasData = true;
          }
        }
      });

      if (hasData) {
        rows.push(rowData);
      }
    });

    if (rows.length === 0) {
      throw new AppError('엑셀 파일에 데이터가 없습니다.', 400, 'EMPTY_EXCEL_FILE');
    }

    return {
      rows,
      meta: { lectureYear },
    };
  }

  /**
   * 헤더 행 찾기 - 알려진 컬럼명이 가장 많이 일치하는 행을 헤더로 인식
   */
  private _findHeaderRow(worksheet: ExcelJS.Worksheet): {
    headerRowNum: number;
    columnMap: Map<number, string>;
  } {
    let bestRowNum = -1;
    let bestMatchCount = 0;
    let bestColumnMap = new Map<number, string>();

    const knownColumns = new Set(Object.keys(COLUMN_MAPPING));

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // 처음 20행 내에서 찾기
      if (rowNumber > 20) return;

      const columnMap = new Map<number, string>();
      let matchCount = 0;

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const cellValue = String(cell.value || '').trim();

        if (knownColumns.has(cellValue)) {
          const internalFieldName = COLUMN_MAPPING[cellValue];
          columnMap.set(colNumber, internalFieldName);
          matchCount++;
        }
      });

      // 최소 2개 이상 컬럼이 일치해야 헤더로 인정
      if (matchCount > bestMatchCount && matchCount >= 2) {
        bestMatchCount = matchCount;
        bestRowNum = rowNumber;
        bestColumnMap = columnMap;
      }
    });

    return { headerRowNum: bestRowNum, columnMap: bestColumnMap };
  }

  /**
   * 셀 값을 필드 타입에 맞게 변환
   */
  private _convertCellValue(cell: ExcelJS.Cell, fieldName: string): unknown {
    const value = cell.value;

    if (value === null || value === undefined) {
      return null;
    }

    // 날짜 필드
    const dateFields = [
      'educationStart',
      'educationEnd',
      'workStartTime',
      'workEndTime',
      'lunchStartTime',
      'lunchEndTime',
    ];
    if (dateFields.includes(fieldName)) {
      return this._parseDateTime(value);
    }

    // 불리언 필드
    const booleanFields = [
      'hasInstructorLounge',
      'hasWomenRestroom',
      'hasCateredMeals',
      'hasHallLodging',
      'allowsPhoneBeforeAfter',
    ];
    if (booleanFields.includes(fieldName)) {
      return this._parseBoolean(value);
    }

    // 숫자 필드
    const numberFields = ['lat', 'lng', 'plannedCount', 'actualCount'];
    if (numberFields.includes(fieldName)) {
      return this._parseNumber(value);
    }

    // 교육불가일자 (콤마로 구분된 날짜들)
    if (fieldName === 'excludedDates') {
      return this._parseExcludedDates(value);
    }

    // 문자열
    return String(value).trim();
  }

  /**
   * 날짜/시간 파싱
   */
  private _parseDateTime(value: unknown): Date | null {
    if (!value) return null;

    // Date 객체인 경우
    if (value instanceof Date) {
      return value;
    }

    // ExcelJS의 날짜 객체인 경우
    if (typeof value === 'object' && value !== null && 'result' in value) {
      const dateObj = (value as { result?: Date }).result;
      if (dateObj instanceof Date) return dateObj;
    }

    // 숫자(Excel 시리얼)인 경우
    if (typeof value === 'number') {
      // Excel 시리얼 날짜를 JavaScript Date로 변환
      const excelEpoch = new Date(1899, 11, 30);
      const days = Math.floor(value);
      const fraction = value - days;
      const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);

      // 시간 부분 처리
      if (fraction > 0) {
        const totalSeconds = Math.round(fraction * 24 * 60 * 60);
        date.setSeconds(totalSeconds);
      }
      return date;
    }

    // 문자열인 경우
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;

      // HH:MM 형식 (시간만)
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
        const today = new Date();
        const parts = trimmed.split(':');
        today.setHours(
          parseInt(parts[0], 10),
          parseInt(parts[1], 10),
          parseInt(parts[2] || '0', 10),
        );
        return today;
      }

      // 일반 날짜 문자열
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }

  /**
   * 불리언 파싱
   */
  private _parseBoolean(value: unknown): boolean | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value;

    const strValue = String(value).trim().toLowerCase();

    const trueValues = ['true', 'o', 'yes', '예', 'y', '1', 'v', '○'];
    const falseValues = ['false', 'x', 'no', '아니오', 'n', '0', ''];

    if (trueValues.includes(strValue)) return true;
    if (falseValues.includes(strValue)) return false;

    return null;
  }

  /**
   * 숫자 파싱
   */
  private _parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;

    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  /**
   * 교육불가일자 파싱 (콤마로 구분된 날짜 문자열 → 배열)
   */
  private _parseExcludedDates(value: unknown): string[] {
    if (!value) return [];

    const strValue = String(value);
    return strValue
      .split(/[,;]/)
      .map((d) => d.trim())
      .filter((d) => d.length > 0)
      .map((d) => {
        // 날짜 형식 정규화 (YYYY-MM-DD)
        const parsed = this._parseDateTime(d);
        if (parsed) {
          return parsed.toISOString().split('T')[0];
        }
        return d;
      });
  }
}

const excelService = new ExcelService();
export default excelService;

// CommonJS 호환 (테스트 모킹용)
module.exports = excelService;
