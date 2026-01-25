// server/src/domains/report/report.service.ts
import { Workbook, Worksheet } from 'exceljs';
import path from 'path';
import prisma from '../../libs/prisma';
import { MilitaryType } from '../../generated/prisma/client.js';

export interface WeeklyReportParams {
  year: number;
  month: number;
  week: number;
}

export interface MonthlyReportParams {
  year: number;
  month: number;
}

export class ReportService {
  private readonly templateDir = path.join(__dirname, '../../infra/report');

  /**
   * 사용 가능한 연도 목록 조회 (Unit.lectureYear 기준)
   */
  async getAvailableYears(): Promise<number[]> {
    const result = await prisma.unit.findMany({
      select: { lectureYear: true },
      distinct: ['lectureYear'],
      orderBy: { lectureYear: 'desc' },
    });
    return result.map((r) => r.lectureYear);
  }

  // =====================================================
  // 주간 보고서 생성
  // =====================================================
  async generateWeeklyReport(params: WeeklyReportParams): Promise<Buffer> {
    const { year, month, week } = params;
    const { startDate, endDate } = this.getWeekRange(year, month, week);

    const workbook = new Workbook();
    const templatePath = path.join(this.templateDir, 'report_week.xlsx');
    await workbook.xlsx.readFile(templatePath);

    const sheet = workbook.worksheets[0];
    const shortYear = year.toString().slice(-2);
    const titleCell = sheet.getRow(1).getCell(2);
    titleCell.value = `[1그룹 푸른나무재단] ${month}월 ${week}주차 '${shortYear}년 병 집중인성교육 주간 결과보고`;

    const unitGroups = await this.getWeeklyReportData(startDate, endDate);

    if (unitGroups.length > 0) {
      // 합계 행 수식 버그 방지 (클리어)
      const initialSummaryRow = sheet.getRow(6);
      initialSummaryRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.value = null;
        if ((cell as any).formula) (cell as any).formula = undefined;
        if ((cell as any)._sharedFormula) (cell as any)._sharedFormula = undefined;
      });

      if (unitGroups.length > 1) {
        for (let i = 1; i < unitGroups.length; i++) {
          sheet.duplicateRow(5, 1, true);
        }
      }

      const placeTotals = { p22: 0, p23: 0, p24: 0, p25: 0, p26: 0 };

      unitGroups.forEach((g, idx) => {
        const row = sheet.getRow(5 + idx);
        row.getCell(2).value = idx + 1;
        row.getCell(4).value = '푸른나무재단';
        row.getCell(5).value = this.getMilitaryTypeLabel(g.unitType);
        row.getCell(6).value = g.unitName;
        row.getCell(7).value = g.wideArea;
        row.getCell(8).value = g.region;
        row.getCell(9).value = month;
        row.getCell(10).value = week;
        row.getCell(11).value = g.periodStr;

        row.getCell(12).value = g.plannedCount;
        row.getCell(13).value = g.actualCount;

        row.getCell(14).value = g.instructors.join(', ');
        row.getCell(15).value = g.instructors.length;

        row.getCell(16).value = g.totalPlannedDays;
        row.getCell(17).value = 1;
        row.getCell(18).value = g.totalPlannedDays;

        row.getCell(19).value = g.actualDaysCumulative;
        row.getCell(20).value = 1;
        row.getCell(21).value = g.actualDaysCumulative;

        // 교육장소 체크 (22~26열)
        const placeCols = { 생활관: 22, 종교시설: 23, 식당: 24, 강의실: 25, 기타: 26 };
        let placeChecked = false;
        g.places.forEach((p) => {
          for (const [key, col] of Object.entries(placeCols)) {
            if (
              p.includes(key) ||
              (key === '강의실' && (p.includes('강당') || p.includes('교육장')))
            ) {
              row.getCell(col).value = 1;
              if (col === 22) placeTotals.p22++;
              else if (col === 23) placeTotals.p23++;
              else if (col === 24) placeTotals.p24++;
              else if (col === 25) placeTotals.p25++;
              placeChecked = true;
            }
          }
        });
        if (!placeChecked) {
          row.getCell(26).value = 1;
          placeTotals.p26++;
        }
        row.commit();
      });

      // 합계 행
      const summaryRowNumber = 5 + unitGroups.length;
      const summaryRow = sheet.getRow(summaryRowNumber);
      summaryRow.getCell(2).value = '계';
      summaryRow.getCell(4).value = '계';
      summaryRow.getCell(6).value = '계';

      const totals = unitGroups.reduce(
        (acc, g) => {
          acc.pCount += g.plannedCount;
          acc.aCount += g.actualCount;
          acc.iLen += g.instructors.length;
          acc.tpDays += g.totalPlannedDays;
          acc.adCum += g.actualDaysCumulative;
          return acc;
        },
        { pCount: 0, aCount: 0, iLen: 0, tpDays: 0, adCum: 0 },
      );

      const lastRow = 5 + unitGroups.length - 1;
      summaryRow.getCell(12).value = {
        formula: `SUBTOTAL(9, L5:L${lastRow})`,
        result: totals.pCount,
      };
      summaryRow.getCell(13).value = {
        formula: `SUBTOTAL(9, M5:M${lastRow})`,
        result: totals.aCount,
      };
      summaryRow.getCell(15).value = {
        formula: `SUBTOTAL(9, O5:O${lastRow})`,
        result: totals.iLen,
      };
      summaryRow.getCell(16).value = {
        formula: `SUBTOTAL(9, P5:P${lastRow})`,
        result: totals.tpDays,
      };
      summaryRow.getCell(17).value = {
        formula: `SUBTOTAL(9, Q5:Q${lastRow})`,
        result: unitGroups.length,
      };
      summaryRow.getCell(18).value = {
        formula: `SUBTOTAL(9, R5:R${lastRow})`,
        result: totals.tpDays,
      };
      summaryRow.getCell(19).value = {
        formula: `SUBTOTAL(9, S5:S${lastRow})`,
        result: totals.adCum,
      };
      summaryRow.getCell(20).value = {
        formula: `SUBTOTAL(9, T5:T${lastRow})`,
        result: unitGroups.length,
      };
      summaryRow.getCell(21).value = {
        formula: `SUBTOTAL(9, U5:U${lastRow})`,
        result: totals.adCum,
      };

      summaryRow.getCell(22).value = {
        formula: `SUBTOTAL(9, V5:V${lastRow})`,
        result: placeTotals.p22,
      };
      summaryRow.getCell(23).value = {
        formula: `SUBTOTAL(9, W5:W${lastRow})`,
        result: placeTotals.p23,
      };
      summaryRow.getCell(24).value = {
        formula: `SUBTOTAL(9, X5:X${lastRow})`,
        result: placeTotals.p24,
      };
      summaryRow.getCell(25).value = {
        formula: `SUBTOTAL(9, Y5:Y${lastRow})`,
        result: placeTotals.p25,
      };
      summaryRow.getCell(26).value = {
        formula: `SUBTOTAL(9, Z5:Z${lastRow})`,
        result: placeTotals.p26,
      };
    }

    // 열 너비 내용에 맞춰 자동 조절 (헤더 행(1~4) 제외, 데이터 행부터)
    this.autoResizeColumns(sheet, 5);

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  // =====================================================
  // 월간 보고서 생성
  // =====================================================
  async generateMonthlyReport(params: MonthlyReportParams): Promise<Buffer> {
    const { year, month } = params;
    // 주차 기반 월간 범위: 첫 번째 월요일 ~ 마지막 주 일요일
    const { startDate, endDate } = this.getMonthRange(year, month);

    const workbook = new Workbook();
    const templatePath = path.join(this.templateDir, 'report_month.xlsx');
    await workbook.xlsx.readFile(templatePath);

    const unitGroups = await this.getMonthlyReportData(startDate, endDate, year, month);

    // ========== 사전 시트 (Sheet 0) ==========
    const preSheet = workbook.worksheets[0];
    // 제목 행 (Row 1, Cell B) - 병합셀이므로 B만 설정
    preSheet.getRow(1).getCell(2).value = `${year} 병 집중인성교육 1그룹 ${month}월 교육일정`;

    // 데이터 시작: Row 5
    if (unitGroups.length > 1) {
      for (let i = 1; i < unitGroups.length; i++) {
        preSheet.duplicateRow(5, 1, true);
      }
    }

    unitGroups.forEach((g, idx) => {
      const row = preSheet.getRow(5 + idx);
      row.getCell(2).value = idx + 1; // B: 번호
      row.getCell(3).value = this.getMilitaryTypeLabel(g.unitType); // C: 군구분
      row.getCell(4).value = g.unitName; // D: 부대명
      row.getCell(5).value = g.wideArea; // E: 지역(광역)
      row.getCell(6).value = g.region; // F: 지역(기초)
      row.getCell(7).value = `${month}월`; // G: 시기
      row.getCell(8).value = g.weekStr || ''; // H: 주차
      row.getCell(9).value = g.periodStr; // I: 시행기간
      row.getCell(10).value = g.plannedCount; // J: 계획인원
      row.getCell(11).value = g.officerContact; // K: 부대실무자 연락처
      row.commit();
    });

    // ========== 사후 시트 (Sheet 1) ==========
    const postSheet = workbook.worksheets[1];
    // 제목 행 (Row 2, Cell A) - 병합셀
    postSheet.getRow(2).getCell(1).value =
      `[1그룹] 푸른나무재단 ${year}년 ${month}월 병 집중인성교육 월간보고`;

    // 합계 행 수식 클리어 (Row 7)
    const initialSummaryRow = postSheet.getRow(7);
    initialSummaryRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.value = null;
      if ((cell as any).formula) (cell as any).formula = undefined;
      if ((cell as any)._sharedFormula) (cell as any)._sharedFormula = undefined;
    });

    // 데이터 시작: Row 6
    if (unitGroups.length > 1) {
      for (let i = 1; i < unitGroups.length; i++) {
        postSheet.duplicateRow(6, 1, true);
      }
    }

    unitGroups.forEach((g, idx) => {
      const row = postSheet.getRow(6 + idx);
      row.getCell(1).value = idx + 1; // A: 번호
      row.getCell(2).value = '푸른나무재단'; // B: 업체명
      row.getCell(3).value = this.getMilitaryTypeLabel(g.unitType); // C: 군별
      row.getCell(4).value = g.unitName; // D: 부대명
      row.getCell(5).value = g.wideArea; // E: 지역(광역)
      row.getCell(6).value = g.region; // F: 지역(기초)
      row.getCell(7).value = month; // G: 시기
      row.getCell(8).value = g.weekStr || ''; // H: 주차
      row.getCell(9).value = g.periodStr; // I: 시행기간
      row.getCell(10).value = g.actualCount; // J: 참여인원
      row.getCell(11).value = g.instructors.length; // K: 투입 강사 수
      row.getCell(12).value = g.totalPlannedDays; // L: 계획 횟수
      row.getCell(13).value = g.actualDaysCumulative; // M: 실시 횟수
      row.getCell(14).value = ''; // N: 특이사항
      row.commit();
    });

    // 합계 행
    const summaryRowNum = 6 + unitGroups.length;
    const summaryRow = postSheet.getRow(summaryRowNum);
    summaryRow.getCell(1).value = '계';

    const totals = unitGroups.reduce(
      (acc, g) => {
        acc.aCount += g.actualCount;
        acc.iLen += g.instructors.length;
        acc.tpDays += g.totalPlannedDays;
        acc.adCum += g.actualDaysCumulative;
        return acc;
      },
      { aCount: 0, iLen: 0, tpDays: 0, adCum: 0 },
    );

    const lastDataRow = 6 + unitGroups.length - 1;
    summaryRow.getCell(10).value = {
      formula: `SUBTOTAL(9, J6:J${lastDataRow})`,
      result: totals.aCount,
    };
    summaryRow.getCell(11).value = {
      formula: `SUBTOTAL(9, K6:K${lastDataRow})`,
      result: totals.iLen,
    };
    summaryRow.getCell(12).value = {
      formula: `SUBTOTAL(9, L6:L${lastDataRow})`,
      result: totals.tpDays,
    };
    summaryRow.getCell(13).value = {
      formula: `SUBTOTAL(9, M6:M${lastDataRow})`,
      result: totals.adCum,
    };

    // ========== 진행률 정보 (Row 10~13, 데이터 행 추가로 밀림) ==========
    const progressBaseRow = summaryRowNum + 3; // 합계 + 빈 행 2개 후

    // 진행률 계산
    const totalYearSchedules = await prisma.unitSchedule.count({
      where: { trainingPeriod: { unit: { lectureYear: year } } },
    });
    const completedThisMonth = totals.adCum;
    const completedUntilNow = await prisma.unitSchedule.count({
      where: {
        trainingPeriod: { unit: { lectureYear: year } },
        date: { lte: endDate },
        assignments: { some: { state: 'Accepted' } },
      },
    });

    const monthlySchedules = await prisma.unitSchedule.count({
      where: { date: { gte: startDate, lte: endDate } },
    });

    const monthProgress =
      monthlySchedules > 0 ? Math.round((completedThisMonth / monthlySchedules) * 100) : 0;
    const totalProgress =
      totalYearSchedules > 0 ? Math.round((completedUntilNow / totalYearSchedules) * 1000) / 10 : 0;

    postSheet.getRow(progressBaseRow).getCell(2).value =
      `* ${month}월 진행률 :  ${monthProgress}(%)`;
    postSheet.getRow(progressBaseRow + 1).getCell(2).value = `* 전체 진행률 :  ${totalProgress}(%)`;
    postSheet.getRow(progressBaseRow + 2).getCell(2).value = `총 진행 목표(${year})`;
    postSheet.getRow(progressBaseRow + 2).getCell(3).value = totalYearSchedules;
    postSheet.getRow(progressBaseRow + 3).getCell(2).value = `누적 진행(${month}월)`;
    postSheet.getRow(progressBaseRow + 3).getCell(3).value = completedUntilNow;

    // 열 너비 내용에 맞춰 자동 조절
    this.autoResizeColumns(preSheet, 5); // 사전 시트: 데이터 row 5부터
    this.autoResizeColumns(postSheet, 6); // 사후 시트: 데이터 row 6부터

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  // =====================================================
  // 주간 보고서용 데이터 조회
  // =====================================================
  private async getWeeklyReportData(startDate: Date, endDate: Date) {
    const schedulesInRange = await prisma.unitSchedule.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { trainingPeriodId: true },
    });
    const periodIds = Array.from(new Set(schedulesInRange.map((s) => s.trainingPeriodId)));
    if (periodIds.length === 0) return [];

    const periods = await prisma.trainingPeriod.findMany({
      where: { id: { in: periodIds } },
      include: {
        unit: true,
        schedules: {
          where: { date: { gte: startDate, lte: endDate } },
          orderBy: { date: 'asc' },
          include: {
            scheduleLocations: { include: { location: true } },
            assignments: {
              where: { state: 'Accepted' },
              include: { User: { select: { name: true } } },
            },
          },
        },
      },
    });

    const unitMap = new Map<number, any>();
    for (const p of periods) {
      if (!unitMap.has(p.unitId)) {
        unitMap.set(p.unitId, {
          unitName: p.unit.name,
          unitType: p.unit.unitType,
          wideArea: p.unit.wideArea,
          region: p.unit.region,
          periods: [],
        });
      }
      unitMap.get(p.unitId).periods.push(p);
    }

    return Array.from(unitMap.values()).map((u) => {
      const instructors = new Set<string>();
      const places = new Set<string>();
      const dailyPlanned = new Map<string, number>();
      const dailyActual = new Map<string, number>();
      const periodStrings: string[] = [];

      let totalPlannedDays = 0;
      let actualDaysCumulative = 0;

      u.periods.forEach((p: any) => {
        const sortedDates = p.schedules
          .map((s: any) => s.date)
          .filter(Boolean)
          .sort((a: any, b: any) => a.getTime() - b.getTime());
        if (sortedDates.length > 0) {
          periodStrings.push(this.formatPeriod(sortedDates));
        }

        totalPlannedDays += p.schedules.length;
        p.schedules.forEach((s: any) => {
          const dateStr = s.date?.toISOString().split('T')[0] || 'Unknown';
          if (!dailyPlanned.has(dateStr)) dailyPlanned.set(dateStr, 0);
          if (!dailyActual.has(dateStr)) dailyActual.set(dateStr, 0);

          s.scheduleLocations.forEach((sl: any) => {
            dailyPlanned.set(dateStr, dailyPlanned.get(dateStr)! + (sl.plannedCount || 0));
            dailyActual.set(dateStr, dailyActual.get(dateStr)! + (sl.actualCount || 0));
            const pl = sl.location?.originalPlace || sl.location?.changedPlace;
            if (pl) places.add(pl);
          });

          if (s.assignments.length > 0) actualDaysCumulative++;
          s.assignments.forEach((a: any) => {
            if (a.User?.name) instructors.add(a.User.name);
          });
        });
      });

      const plannedCount =
        dailyPlanned.size > 0 ? Math.max(...Array.from(dailyPlanned.values())) : 0;
      const actualCount = dailyActual.size > 0 ? Math.max(...Array.from(dailyActual.values())) : 0;

      return {
        ...u,
        periodStr: periodStrings.join(', '),
        plannedCount,
        actualCount,
        totalPlannedDays,
        actualDaysCumulative,
        instructors: Array.from(instructors),
        places: Array.from(places),
      };
    });
  }

  // =====================================================
  // 월간 보고서용 데이터 조회 (독립적)
  // =====================================================
  private async getMonthlyReportData(startDate: Date, endDate: Date, year: number, month: number) {
    const schedulesInRange = await prisma.unitSchedule.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { trainingPeriodId: true },
    });
    const periodIds = Array.from(new Set(schedulesInRange.map((s) => s.trainingPeriodId)));
    if (periodIds.length === 0) return [];

    const periods = await prisma.trainingPeriod.findMany({
      where: { id: { in: periodIds } },
      include: {
        unit: true,
        schedules: {
          where: { date: { gte: startDate, lte: endDate } },
          orderBy: { date: 'asc' },
          include: {
            scheduleLocations: { include: { location: true } },
            assignments: {
              where: { state: 'Accepted' },
              include: { User: { select: { name: true } } },
            },
          },
        },
      },
    });

    const unitMap = new Map<number, any>();
    for (const p of periods) {
      if (!unitMap.has(p.unitId)) {
        unitMap.set(p.unitId, {
          unitName: p.unit.name,
          unitType: p.unit.unitType,
          wideArea: p.unit.wideArea,
          region: p.unit.region,
          officerName: p.officerName,
          officerPhone: p.officerPhone,
          periods: [],
        });
      }
      // 담당관 정보 업데이트 (나중에 들어온 값으로)
      if (p.officerName) unitMap.get(p.unitId).officerName = p.officerName;
      if (p.officerPhone) unitMap.get(p.unitId).officerPhone = p.officerPhone;
      unitMap.get(p.unitId).periods.push(p);
    }

    return Array.from(unitMap.values()).map((u) => {
      const instructors = new Set<string>();
      const dailyPlanned = new Map<string, number>();
      const dailyActual = new Map<string, number>();
      const periodStrings: string[] = [];
      const weeks = new Set<number>();

      let totalPlannedDays = 0;
      let actualDaysCumulative = 0;

      u.periods.forEach((p: any) => {
        const sortedDates = p.schedules
          .map((s: any) => s.date)
          .filter(Boolean)
          .sort((a: any, b: any) => a.getTime() - b.getTime());
        if (sortedDates.length > 0) {
          periodStrings.push(this.formatPeriod(sortedDates));
          // 주차 계산
          sortedDates.forEach((d: Date) => {
            const weekNum = this.getWeekNumber(d, month);
            if (weekNum > 0) weeks.add(weekNum);
          });
        }

        totalPlannedDays += p.schedules.length;
        p.schedules.forEach((s: any) => {
          const dateStr = s.date?.toISOString().split('T')[0] || 'Unknown';
          if (!dailyPlanned.has(dateStr)) dailyPlanned.set(dateStr, 0);
          if (!dailyActual.has(dateStr)) dailyActual.set(dateStr, 0);

          s.scheduleLocations.forEach((sl: any) => {
            dailyPlanned.set(dateStr, dailyPlanned.get(dateStr)! + (sl.plannedCount || 0));
            dailyActual.set(dateStr, dailyActual.get(dateStr)! + (sl.actualCount || 0));
          });

          if (s.assignments.length > 0) actualDaysCumulative++;
          s.assignments.forEach((a: any) => {
            if (a.User?.name) instructors.add(a.User.name);
          });
        });
      });

      const plannedCount =
        dailyPlanned.size > 0 ? Math.max(...Array.from(dailyPlanned.values())) : 0;
      const actualCount = dailyActual.size > 0 ? Math.max(...Array.from(dailyActual.values())) : 0;

      // 담당관 연락처 포맷
      const officerContact =
        u.officerName && u.officerPhone
          ? `${u.officerName} / ${u.officerPhone}`
          : u.officerName || u.officerPhone || '';

      // 주차 문자열
      const weekStr = Array.from(weeks)
        .sort((a, b) => a - b)
        .join(', ');

      return {
        ...u,
        periodStr: periodStrings.join(', '),
        plannedCount,
        actualCount,
        totalPlannedDays,
        actualDaysCumulative,
        instructors: Array.from(instructors),
        officerContact,
        weekStr,
      };
    });
  }

  // =====================================================
  // 헬퍼 함수들
  // =====================================================
  private getWeekRange(year: number, month: number, week: number) {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const dayOfFirst = firstDayOfMonth.getDay();
    const firstMondayDate = 1 + (dayOfFirst === 1 ? 0 : dayOfFirst === 0 ? 1 : 8 - dayOfFirst);
    const startDay = firstMondayDate + (week - 1) * 7;
    const startDate = new Date(Date.UTC(year, month - 1, startDay, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, startDay + 6, 23, 59, 59, 999));
    return { startDate, endDate };
  }

  // 월간 보고서용 주차 기반 날짜 범위
  private getMonthRange(year: number, month: number) {
    // 해당 월의 첫 번째 월요일 계산
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const dayOfFirst = firstDayOfMonth.getDay();
    const firstMondayDate = 1 + (dayOfFirst === 1 ? 0 : dayOfFirst === 0 ? 1 : 8 - dayOfFirst);

    // 해당 월의 마지막 날
    const lastDayOfMonth = new Date(year, month, 0).getDate();

    // 마지막 주의 월요일 계산
    let lastMondayDate = firstMondayDate;
    while (lastMondayDate + 7 <= lastDayOfMonth) {
      lastMondayDate += 7;
    }

    // 마지막 주 일요일 (다음 달로 넘어갈 수 있음)
    const lastSundayDate = lastMondayDate + 6;

    const startDate = new Date(Date.UTC(year, month - 1, firstMondayDate, 0, 0, 0));
    // 일요일이 다음 달로 넘어가는 경우 처리
    const endDate = new Date(Date.UTC(year, month - 1, lastSundayDate, 23, 59, 59, 999));

    return { startDate, endDate };
  }

  private getWeekNumber(date: Date, month: number): number {
    const d = new Date(date);
    if (d.getMonth() + 1 !== month) return 0;
    const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const dayOfFirst = firstDayOfMonth.getDay();
    const firstMondayDate = 1 + (dayOfFirst === 1 ? 0 : dayOfFirst === 0 ? 1 : 8 - dayOfFirst);
    const dayOfMonth = d.getDate();
    // 국립어학원 기준: 첫 번째 월요일 이전 날짜는 0주차 (이전 달 소속)
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
   * 열 너비를 데이터에 맞게 자동 조절
   */
  autoResizeColumns(sheet: Worksheet, startRow = 1) {
    sheet.columns.forEach((column, colIndex) => {
      let maxLength = 0;

      // 각 행의 데이터 길이 체크
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber >= startRow) {
          const cell = row.getCell(colIndex + 1);
          const cellValue = cell.value ? String(cell.value) : '';
          maxLength = Math.max(maxLength, this.getTextWidth(cellValue));
        }
      });

      // 최소/최대 너비 제한
      if (maxLength > 0) {
        column.width = Math.min(Math.max(maxLength + 2, 8), 50);
      }
    });
  }

  /**
   * 텍스트 너비 계산 (한글은 2배)
   */
  private getTextWidth(text: string): number {
    let width = 0;
    for (const char of text) {
      if (/[\u3131-\uD79D]/.test(char)) {
        width += 2;
      } else {
        width += 1;
      }
    }
    return width;
  }
}

export default new ReportService();
