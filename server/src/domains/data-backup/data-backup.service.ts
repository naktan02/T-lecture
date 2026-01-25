// server/src/domains/data-backup/data-backup.service.ts
// 보고서 형식 데이터 백업/삭제 서비스
import ExcelJS from 'exceljs';
import prisma from '../../libs/prisma';
import logger from '../../config/logger';
import { MilitaryType } from '../../generated/prisma/client.js';

interface ExportOptions {
  year: number | null; // null = 전체
}

// 교육기간별 보고 데이터
interface PeriodReportData {
  unitId: number;
  unitName: string;
  unitType: MilitaryType | null;
  wideArea: string | null;
  region: string | null;
  periodId: number;
  periodName: string;
  month: number;
  weekStr: string;
  periodStr: string;
  plannedCount: number;
  actualCount: number;
  instructors: string[];
  totalPlannedDays: number;
  actualDaysCumulative: number;
  officerContact: string;
  firstScheduleDate: Date | null;
}

export class DataBackupService {
  /**
   * 사용 가능한 연도 목록 조회
   */
  async getAvailableYears(): Promise<number[]> {
    const result = await prisma.unit.findMany({
      select: { lectureYear: true },
      distinct: ['lectureYear'],
      orderBy: { lectureYear: 'desc' },
    });
    return result.map((r) => r.lectureYear);
  }

  /**
   * 보고서 형식 엑셀 파일 생성
   * - Sheet 1: 주간보고서 형식
   * - Sheet 2: 월간보고서 사전(교육일정) 형식
   * - Sheet 3: 월간보고서 사후(결과보고) 형식
   */
  async generateExcel(options: ExportOptions): Promise<ExcelJS.Workbook> {
    const { year } = options;

    logger.info(`[DataBackup] Generating report-style Excel for lectureYear ${year ?? 'ALL'}`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'T-LECTURE';
    workbook.created = new Date();

    // 교육기간별 데이터 조회
    const reportData = await this.getReportData(year);

    // 시트 1: 주간보고서 형식
    this.addWeeklyStyleSheet(workbook, reportData);

    // 시트 2: 월간 교육일정 형식
    this.addMonthlyScheduleSheet(workbook, reportData);

    // 시트 3: 월간 결과보고 형식
    this.addMonthlyResultSheet(workbook, reportData);

    logger.info(`[DataBackup] Excel generation completed. Total periods: ${reportData.length}`);
    return workbook;
  }

  /**
   * 교육기간별 보고 데이터 조회
   */
  private async getReportData(year: number | null): Promise<PeriodReportData[]> {
    const whereCondition = year ? { unit: { lectureYear: year } } : {};

    const periods = await prisma.trainingPeriod.findMany({
      where: whereCondition,
      include: {
        unit: true,
        schedules: {
          orderBy: { date: 'asc' },
          include: {
            scheduleLocations: true,
            assignments: {
              where: { state: 'Accepted' },
              include: { User: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: [{ unit: { lectureYear: 'asc' } }, { id: 'asc' }],
    });

    // 교육기간별로 정렬 (첫 번째 스케줄 날짜 기준)
    const dataList: PeriodReportData[] = [];

    for (const period of periods) {
      const unit = period.unit;
      const schedules = period.schedules;

      // 첫 번째 스케줄 날짜
      const firstScheduleDate = schedules[0]?.date ?? null;

      // 날짜 배열
      const dates = schedules
        .map((s) => s.date)
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime());

      // 월 (첫 번째 날짜 기준)
      const month = firstScheduleDate ? firstScheduleDate.getMonth() + 1 : 0;

      // 주차 계산
      const weeks = new Set<number>();
      dates.forEach((d) => {
        const weekNum = this.getWeekNumber(d);
        if (weekNum > 0) weeks.add(weekNum);
      });
      const weekStr = Array.from(weeks)
        .sort((a, b) => a - b)
        .join(', ');

      // 시행기간 문자열
      const periodStr = this.formatPeriod(dates);

      // 계획인원/참여인원 (일별 최대값 기준)
      const dailyPlanned = new Map<string, number>();
      const dailyActual = new Map<string, number>();
      const instructors = new Set<string>();
      let actualDaysCumulative = 0;

      schedules.forEach((s) => {
        const dateStr = s.date?.toISOString().split('T')[0] || 'Unknown';
        if (!dailyPlanned.has(dateStr)) dailyPlanned.set(dateStr, 0);
        if (!dailyActual.has(dateStr)) dailyActual.set(dateStr, 0);

        s.scheduleLocations.forEach((sl) => {
          dailyPlanned.set(dateStr, dailyPlanned.get(dateStr)! + (sl.plannedCount || 0));
          dailyActual.set(dateStr, dailyActual.get(dateStr)! + (sl.actualCount || 0));
        });

        if (s.assignments.length > 0) actualDaysCumulative++;
        s.assignments.forEach((a) => {
          if (a.User?.name) instructors.add(a.User.name);
        });
      });

      const plannedCount =
        dailyPlanned.size > 0 ? Math.max(...Array.from(dailyPlanned.values())) : 0;
      const actualCount = dailyActual.size > 0 ? Math.max(...Array.from(dailyActual.values())) : 0;

      // 담당관 연락처
      const officerContact =
        period.officerName && period.officerPhone
          ? `${period.officerName} / ${period.officerPhone}`
          : period.officerName || period.officerPhone || '';

      dataList.push({
        unitId: unit.id,
        unitName: unit.name,
        unitType: unit.unitType,
        wideArea: unit.wideArea,
        region: unit.region,
        periodId: period.id,
        periodName: period.name,
        month,
        weekStr,
        periodStr,
        plannedCount,
        actualCount,
        instructors: Array.from(instructors),
        totalPlannedDays: schedules.length,
        actualDaysCumulative,
        officerContact,
        firstScheduleDate,
      });
    }

    // 첫 번째 스케줄 날짜 기준 정렬
    dataList.sort((a, b) => {
      if (!a.firstScheduleDate && !b.firstScheduleDate) return 0;
      if (!a.firstScheduleDate) return 1;
      if (!b.firstScheduleDate) return -1;
      return a.firstScheduleDate.getTime() - b.firstScheduleDate.getTime();
    });

    return dataList;
  }

  /**
   * 시트 1: 주간보고서 스타일
   */
  private addWeeklyStyleSheet(workbook: ExcelJS.Workbook, data: PeriodReportData[]) {
    const sheet = workbook.addWorksheet('주간보고 형식');
    sheet.columns = [
      { header: '번호', key: 'no', width: 6 },
      { header: '업체', key: 'company', width: 12 },
      { header: '군구분', key: 'militaryType', width: 8 },
      { header: '부대명', key: 'unitName', width: 25 },
      { header: '광역', key: 'wideArea', width: 10 },
      { header: '지역', key: 'region', width: 10 },
      { header: '월', key: 'month', width: 5 },
      { header: '주차', key: 'week', width: 8 },
      { header: '시행기간', key: 'period', width: 22 },
      { header: '계획인원', key: 'plannedCount', width: 8 },
      { header: '참여인원', key: 'actualCount', width: 8 },
      { header: '강사명', key: 'instructors', width: 25 },
      { header: '강사수', key: 'instructorCount', width: 7 },
      { header: '계획횟수', key: 'totalDays', width: 8 },
      { header: '실시횟수', key: 'actualDays', width: 8 },
    ];

    data.forEach((d, idx) => {
      sheet.addRow({
        no: idx + 1,
        company: '푸른나무재단',
        militaryType: this.getMilitaryTypeLabel(d.unitType),
        unitName: d.unitName,
        wideArea: d.wideArea || '',
        region: d.region || '',
        month: d.month || '',
        week: d.weekStr,
        period: d.periodStr,
        plannedCount: d.plannedCount,
        actualCount: d.actualCount,
        instructors: d.instructors.join(', '),
        instructorCount: d.instructors.length,
        totalDays: d.totalPlannedDays,
        actualDays: d.actualDaysCumulative,
      });
    });

    this.styleHeader(sheet);
  }

  /**
   * 시트 2: 월간 교육일정 (사전) 스타일
   */
  private addMonthlyScheduleSheet(workbook: ExcelJS.Workbook, data: PeriodReportData[]) {
    const sheet = workbook.addWorksheet('월간 교육일정');
    sheet.columns = [
      { header: '번호', key: 'no', width: 6 },
      { header: '군구분', key: 'militaryType', width: 8 },
      { header: '부대명', key: 'unitName', width: 25 },
      { header: '지역(광역)', key: 'wideArea', width: 10 },
      { header: '지역(기초)', key: 'region', width: 10 },
      { header: '시기', key: 'timing', width: 8 },
      { header: '주차', key: 'week', width: 8 },
      { header: '시행기간', key: 'period', width: 22 },
      { header: '계획인원', key: 'plannedCount', width: 8 },
      { header: '담당관 연락처', key: 'officerContact', width: 25 },
    ];

    data.forEach((d, idx) => {
      sheet.addRow({
        no: idx + 1,
        militaryType: this.getMilitaryTypeLabel(d.unitType),
        unitName: d.unitName,
        wideArea: d.wideArea || '',
        region: d.region || '',
        timing: d.month ? `${d.month}월` : '',
        week: d.weekStr,
        period: d.periodStr,
        plannedCount: d.plannedCount,
        officerContact: d.officerContact,
      });
    });

    this.styleHeader(sheet);
  }

  /**
   * 시트 3: 월간 결과보고 (사후) 스타일
   */
  private addMonthlyResultSheet(workbook: ExcelJS.Workbook, data: PeriodReportData[]) {
    const sheet = workbook.addWorksheet('월간 결과보고');
    sheet.columns = [
      { header: '번호', key: 'no', width: 6 },
      { header: '업체명', key: 'company', width: 12 },
      { header: '군별', key: 'militaryType', width: 8 },
      { header: '부대명', key: 'unitName', width: 25 },
      { header: '지역(광역)', key: 'wideArea', width: 10 },
      { header: '지역(기초)', key: 'region', width: 10 },
      { header: '시기', key: 'timing', width: 8 },
      { header: '주차', key: 'week', width: 8 },
      { header: '시행기간', key: 'period', width: 22 },
      { header: '참여인원', key: 'actualCount', width: 8 },
      { header: '강사수', key: 'instructorCount', width: 7 },
      { header: '계획횟수', key: 'totalDays', width: 8 },
      { header: '실시횟수', key: 'actualDays', width: 8 },
      { header: '특이사항', key: 'note', width: 20 },
    ];

    data.forEach((d, idx) => {
      sheet.addRow({
        no: idx + 1,
        company: '푸른나무재단',
        militaryType: this.getMilitaryTypeLabel(d.unitType),
        unitName: d.unitName,
        wideArea: d.wideArea || '',
        region: d.region || '',
        timing: d.month ? `${d.month}월` : '',
        week: d.weekStr,
        period: d.periodStr,
        actualCount: d.actualCount,
        instructorCount: d.instructors.length,
        totalDays: d.totalPlannedDays,
        actualDays: d.actualDaysCumulative,
        note: '',
      });
    });

    this.styleHeader(sheet);
  }

  // =====================================================
  // 헬퍼 메서드
  // =====================================================

  private styleHeader(sheet: ExcelJS.Worksheet) {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.alignment = { horizontal: 'center' };

    // 열 너비 자동 조절
    this.autoResizeColumns(sheet);
  }

  /**
   * 열 너비를 데이터에 맞게 자동 조절 (엑셀 자동 맞춤 스타일)
   */
  private autoResizeColumns(sheet: ExcelJS.Worksheet) {
    sheet.columns.forEach((column) => {
      let maxLength = 0;

      // 헤더 길이 체크
      if (column.header) {
        const headerValue = Array.isArray(column.header)
          ? column.header.join(' ')
          : String(column.header);
        maxLength = Math.max(maxLength, this.getTextWidth(headerValue));
      }

      // 각 행의 데이터 길이 체크
      if (column.eachCell) {
        column.eachCell({ includeEmpty: false }, (cell) => {
          const cellValue = cell.value ? String(cell.value) : '';
          maxLength = Math.max(maxLength, this.getTextWidth(cellValue));
        });
      }

      // 내용 기반 너비 (최소 6, 최대 60)
      column.width = Math.min(Math.max(maxLength + 2, 6), 60);
    });
  }

  /**
   * 텍스트 너비 계산 (한글은 2배)
   */
  private getTextWidth(text: string): number {
    let width = 0;
    for (const char of text) {
      // 한글, 일본어, 중국어 등 넓은 문자
      if (/[\u3131-\uD79D]/.test(char)) {
        width += 2;
      } else {
        width += 1;
      }
    }
    return width;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(date);
    const month = d.getMonth();
    const firstDayOfMonth = new Date(d.getFullYear(), month, 1);
    const dayOfFirst = firstDayOfMonth.getDay();
    const firstMondayDate = 1 + (dayOfFirst === 1 ? 0 : dayOfFirst === 0 ? 1 : 8 - dayOfFirst);
    const dayOfMonth = d.getDate();
    if (dayOfMonth < firstMondayDate) return 0;
    return Math.ceil((dayOfMonth - firstMondayDate + 1) / 7);
  }

  private formatPeriod(dates: Date[]): string {
    if (dates.length === 0) return '';
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const start = dates[0];
    const end = dates[dates.length - 1];
    const fmt = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}(${dayNames[d.getDay()]})`;
    if (dates.length === 1) return fmt(start);
    return `${fmt(start)}~${fmt(end)}`;
  }

  private getMilitaryTypeLabel(type: MilitaryType | null): string {
    const labels: Record<string, string> = {
      Army: '육군',
      Navy: '해군',
      AirForce: '공군',
      Marines: '해병대',
      MND: '국직부대',
    };
    return type ? labels[type] || type : '';
  }

  /**
   * 데이터베이스 용량 조회 (Supabase 500MB 기준)
   */
  async getDatabaseSize(): Promise<{
    usedBytes: number;
    usedMB: number;
    limitMB: number;
    percentage: number;
  }> {
    const result = await prisma.$queryRaw<{ size: bigint }[]>`
      SELECT pg_database_size(current_database()) as size
    `;

    const usedBytes = Number(result[0]?.size || 0);
    const usedMB = Math.round((usedBytes / (1024 * 1024)) * 100) / 100;
    const limitMB = 500;
    const percentage = Math.round((usedMB / limitMB) * 100 * 10) / 10;

    return { usedBytes, usedMB, limitMB, percentage };
  }

  /**
   * 삭제 미리보기: 해당 연도에 삭제될 데이터 개수 반환
   * year가 null이면 전체 데이터 카운트
   */
  async getDeletePreview(year: number | null) {
    const currentYear = new Date().getFullYear();

    // 연도별 필터 조건
    const unitWhere = year ? { lectureYear: year } : {};
    const periodWhere = year ? { unit: { lectureYear: year } } : {};
    const locationWhere = year ? { trainingPeriod: { unit: { lectureYear: year } } } : {};
    const scheduleWhere = year ? { trainingPeriod: { unit: { lectureYear: year } } } : {};
    const scheduleLocationWhere = year
      ? { schedule: { trainingPeriod: { unit: { lectureYear: year } } } }
      : {};
    const assignmentWhere = year
      ? { UnitSchedule: { trainingPeriod: { unit: { lectureYear: year } } } }
      : {};
    const distanceWhere = year ? { unit: { lectureYear: year } } : {};

    // 날짜 기반 필터 (가용일, 메시지)
    let availabilityWhere = {};
    let dispatchWhere = {};
    if (year) {
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);
      availabilityWhere = { availableOn: { gte: startDate, lt: endDate } };
      dispatchWhere = { createdAt: { gte: startDate, lt: endDate } };
    }

    const [
      units,
      trainingPeriods,
      trainingLocations,
      schedules,
      scheduleLocations,
      assignments,
      distances,
      availabilities,
      dispatches,
    ] = await Promise.all([
      prisma.unit.count({ where: unitWhere }),
      prisma.trainingPeriod.count({ where: periodWhere }),
      prisma.trainingLocation.count({ where: locationWhere }),
      prisma.unitSchedule.count({ where: scheduleWhere }),
      prisma.scheduleLocation.count({ where: scheduleLocationWhere }),
      prisma.instructorUnitAssignment.count({ where: assignmentWhere }),
      prisma.instructorUnitDistance.count({ where: distanceWhere }),
      prisma.instructorAvailability.count({ where: availabilityWhere }),
      prisma.dispatch.count({ where: dispatchWhere }),
    ]);

    return {
      year: year ?? 'all',
      currentYear,
      units,
      trainingPeriods,
      trainingLocations,
      schedules,
      scheduleLocations,
      assignments,
      distances,
      availabilities,
      dispatches,
    };
  }

  /**
   * 해당 연도 데이터 삭제
   * 기준: Unit.lectureYear === year (year < currentYear만 허용)
   */
  async deleteDataByYear(year: number) {
    const currentYear = new Date().getFullYear();
    if (year >= currentYear) {
      throw new Error(
        `Cannot delete current or future year data. Year: ${year}, Current: ${currentYear}`,
      );
    }

    logger.info(`[DataBackup] Starting deletion for lectureYear ${year}`);

    try {
      const result = await prisma.$transaction(async (tx) => {
        const startDateAvail = new Date(`${year}-01-01T00:00:00.000Z`);
        const endDateAvail = new Date(`${year + 1}-01-01T00:00:00.000Z`);
        const startDateDispatch = new Date(`${year}-01-01T00:00:00.000Z`);
        const endDateDispatch = new Date(`${year + 1}-01-01T00:00:00.000Z`);

        // 1. 강사 가용일 삭제 (날짜 기준)
        const availabilities = await tx.instructorAvailability.deleteMany({
          where: { availableOn: { gte: startDateAvail, lt: endDateAvail } },
        });

        // 2. 메시지 및 메시지-배정 삭제 (생성일 기준)
        const dispatches = await tx.dispatch.deleteMany({
          where: { createdAt: { gte: startDateDispatch, lt: endDateDispatch } },
        });

        // 3. 강사-부대 거리 삭제
        const distances = await tx.instructorUnitDistance.deleteMany({
          where: { unit: { lectureYear: year } },
        });

        // 4. Unit 삭제 (Cascade로 나머지 자동 삭제)
        const units = await tx.unit.deleteMany({
          where: { lectureYear: year },
        });

        return {
          deletedUnits: units.count,
          deletedDistances: distances.count,
          deletedAvailabilities: availabilities.count,
          deletedDispatches: dispatches.count,
        };
      });

      logger.info(
        `[DataBackup] Deletion completed for lectureYear ${year}: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      logger.error(`[DataBackup] Deletion failed for lectureYear ${year}: ${error}`);
      throw error;
    }
  }
}

export default new DataBackupService();
