// server/src/domains/report/report.service.ts
import { Workbook } from 'exceljs';
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

  async generateWeeklyReport(params: WeeklyReportParams): Promise<Buffer> {
    const { year, month, week } = params;
    const { startDate, endDate } = this.getWeekRange(year, month, week);

    const workbook = new Workbook();
    const templatePath = path.join(this.templateDir, 'report_week.xlsx');
    await workbook.xlsx.readFile(templatePath);

    const sheet = workbook.worksheets[0];
    const shortYear = year.toString().slice(-2);
    // 제목: Sheet name is already set in template usually, but we update title cell
    const titleCell = sheet.getRow(1).getCell(2);
    titleCell.value = `[1그룹 푸른나무재단] ${month}월 ${week}주차 '${shortYear}년 병 집중인성교육 주간 결과보고`;

    const unitGroups = await this.getProcessedReportData(startDate, endDate);

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

      unitGroups.forEach((g, idx) => {
        const row = sheet.getRow(5 + idx);
        row.getCell(2).value = idx + 1; // 번호/누적
        row.getCell(4).value = '푸른나무재단'; // 업체명
        row.getCell(5).value = this.getMilitaryTypeLabel(g.unitType); // 군 구분
        row.getCell(6).value = g.unitName; // 부대명
        row.getCell(7).value = g.wideArea;
        row.getCell(8).value = g.region;
        row.getCell(9).value = month;
        row.getCell(10).value = week;
        row.getCell(11).value = g.periodStr;

        // 인원 (Peak Attendance)
        row.getCell(12).value = g.plannedCount;
        row.getCell(13).value = g.actualCount;

        // 강사
        row.getCell(14).value = g.instructors.join(', ');
        row.getCell(15).value = g.instructors.length;

        // 회차/횟수 (Session-based Cumulative)
        row.getCell(16).value = g.totalPlannedDays; // 최초계획 (기간)
        row.getCell(17).value = 1; // 그룹 (고정 1)
        row.getCell(18).value = g.totalPlannedDays; // 최초계획 (횟수)

        row.getCell(19).value = g.actualDaysCumulative; // 실시현황 (기간)
        row.getCell(20).value = 1; // 그룹 (고정 1)
        row.getCell(21).value = g.actualDaysCumulative; // 실시현황 (횟수)

        // 교육장소 체크 (22~26열)
        const placeCols = { 생활관: 22, 종교시설: 23, 식당: 24, 강의실: 25, 기타: 26 };
        g.places.forEach((p) => {
          let found = false;
          for (const [key, col] of Object.entries(placeCols)) {
            if (
              p.includes(key) ||
              (key === '강의실' && (p.includes('강당') || p.includes('교육장')))
            ) {
              row.getCell(col).value = 1;
              found = true;
            }
          }
          if (!found) row.getCell(26).value = 1;
        });
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
      // Protected View 호환을 위해 수식과 결과값 모두 삽입
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
      // 장소 체크별 합계는 복잡하므로 여기서는 생략하거나 필요시 추가
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async generateMonthlyReport(params: MonthlyReportParams): Promise<Buffer> {
    const { year, month } = params;
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const workbook = new Workbook();
    const templatePath = path.join(this.templateDir, 'report_month.xlsx');
    await workbook.xlsx.readFile(templatePath);

    const unitGroups = await this.getProcessedReportData(startDate, endDate);

    // 1. 종합 시트 (Sheet 1)
    const summarySheet = workbook.worksheets[0];
    const shortYear = year.toString().slice(-2);
    summarySheet.getRow(1).getCell(2).value =
      `[1그룹 푸른나무재단] ${month}월 '${shortYear}년 병 집중인성교육 정기 보고`;

    const totalYearSchedules = await prisma.unitSchedule.count({
      where: { trainingPeriod: { unit: { lectureYear: year } } },
    });
    const progressCount = await prisma.unitSchedule.count({
      where: { trainingPeriod: { unit: { lectureYear: year } }, date: { lt: new Date() } },
    });
    const progressRow = summarySheet.getRow(6);
    progressRow.getCell(2).value = totalYearSchedules;
    progressRow.getCell(3).value = progressCount;
    progressRow.getCell(4).value = totalYearSchedules > 0 ? progressCount / totalYearSchedules : 0;

    const schedulesForSummary = await prisma.unitSchedule.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { trainingPeriod: { include: { unit: true } } },
    });
    const monthlyStats = this.getMonthlyStats(schedulesForSummary);
    summarySheet.getRow(12).getCell(3).value = monthlyStats.Army.count;
    summarySheet.getRow(13).getCell(3).value = monthlyStats.Navy.count;
    summarySheet.getRow(14).getCell(3).value = monthlyStats.AirForce.count;
    summarySheet.getRow(15).getCell(3).value = monthlyStats.Marines.count;
    summarySheet.getRow(16).getCell(3).value = monthlyStats.MND.count;

    // 2. 사전 시트 (Sheet 2)
    const preSheet = workbook.worksheets[1];
    preSheet.getRow(1).getCell(1).value = `${year} 집중인성교육 ${month}월 교육일정`;
    if (unitGroups.length > 0) {
      if (unitGroups.length > 1) {
        for (let i = 1; i < unitGroups.length; i++) {
          preSheet.duplicateRow(4, 1, true);
        }
      }
      unitGroups.forEach((g, idx) => {
        const row = preSheet.getRow(4 + idx);
        row.getCell(2).value = idx + 1;
        row.getCell(4).value = '푸른나무재단';
        row.getCell(5).value = '인성교육';
        row.getCell(6).value = g.unitName;
        row.getCell(7).value = g.place; // 대표 장소
        row.getCell(8).value = g.periodStr;
        row.getCell(9).value = g.plannedCount;
        row.getCell(10).value = g.instructors.join(', ');
        row.commit();
      });
    }

    // 3. 사후 시트 (Sheet 3)
    const postSheet = workbook.worksheets[2];
    postSheet.getRow(1).getCell(1).value = `${year} 집중인성교육 ${month}월 교육결과`;

    if (unitGroups.length > 0) {
      const initialSummaryRow = postSheet.getRow(6);
      initialSummaryRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.value = null;
        if ((cell as any).formula) (cell as any).formula = undefined;
        if ((cell as any)._sharedFormula) (cell as any)._sharedFormula = undefined;
      });

      if (unitGroups.length > 1) {
        for (let i = 1; i < unitGroups.length; i++) {
          postSheet.duplicateRow(5, 1, true);
        }
      }

      unitGroups.forEach((g, idx) => {
        const row = postSheet.getRow(5 + idx);
        row.getCell(2).value = idx + 1;
        row.getCell(4).value = '푸른나무재단';
        row.getCell(5).value = this.getMilitaryTypeLabel(g.unitType);
        row.getCell(6).value = g.unitName;
        row.getCell(7).value = g.place;
        row.getCell(8).value = g.periodStr;
        row.getCell(9).value = g.actualCount;
        row.getCell(10).value = g.instructors.join(', ');
        row.getCell(11).value = g.instructors.length;

        // 회차/횟수 (Weekly와 동일한 컬럼 구조)
        row.getCell(12).value = g.totalPlannedDays;
        row.getCell(13).value = 1;
        row.getCell(14).value = g.totalPlannedDays;

        row.getCell(15).value = g.actualDaysCumulative;
        row.getCell(16).value = 1;
        row.getCell(17).value = g.actualDaysCumulative;

        // 장소 체크 (18~22열 - Template layout)
        const placeCols = { 생활관: 18, 종교시설: 19, 식당: 20, 강의실: 21, 기타: 22 };
        g.places.forEach((p) => {
          let found = false;
          for (const [key, col] of Object.entries(placeCols)) {
            if (
              p.includes(key) ||
              (key === '강의실' && (p.includes('강당') || p.includes('교육장')))
            ) {
              row.getCell(col).value = 1;
              found = true;
            }
          }
          if (!found) row.getCell(22).value = 1;
        });
        row.commit();
      });

      const totals = unitGroups.reduce(
        (acc, g) => {
          acc.aCount += g.actualCount;
          acc.iLen += g.instructors.length;
          return acc;
        },
        { aCount: 0, iLen: 0 },
      );
      const summaryRow = postSheet.getRow(5 + unitGroups.length);
      const lastRow = 5 + unitGroups.length - 1;
      summaryRow.getCell(2).value = '계';
      summaryRow.getCell(4).value = '계';
      summaryRow.getCell(6).value = '계';
      summaryRow.getCell(9).value = {
        formula: `SUBTOTAL(9, I5:I${lastRow})`,
        result: totals.aCount,
      };
      summaryRow.getCell(11).value = {
        formula: `SUBTOTAL(9, K5:K${lastRow})`,
        result: totals.iLen,
      };
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  private async getProcessedReportData(startDate: Date, endDate: Date) {
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
      const periodStrings: string[] = u.periods.map((p: any) => {
        const sortedDates = p.schedules
          .map((s: any) => s.date)
          .filter(Boolean)
          .sort((a: any, b: any) => a.getTime() - b.getTime());
        return this.formatPeriod(sortedDates);
      });

      let totalPlannedDays = 0;
      let actualDaysCumulative = 0;

      u.periods.forEach((p: any) => {
        totalPlannedDays += p.schedules.length;
        p.schedules.forEach((s: any) => {
          const dateStr = s.date?.toISOString().split('T')[0] || 'Unknown';
          if (!dailyPlanned.has(dateStr)) dailyPlanned.set(dateStr, 0);
          if (!dailyActual.has(dateStr)) dailyActual.set(dateStr, 0);

          s.scheduleLocations.forEach((sl: any) => {
            const pCount = sl.plannedCount || 0;
            const aCount = sl.actualCount || 0;
            dailyPlanned.set(dateStr, dailyPlanned.get(dateStr)! + pCount);
            dailyActual.set(dateStr, dailyActual.get(dateStr)! + aCount);
            const pl = sl.location?.originalPlace || sl.location?.changedPlace;
            if (pl) places.add(pl);
          });

          if (s.assignments.length > 0 && s.date <= endDate) actualDaysCumulative++;
          s.assignments.forEach((a: any) => {
            if (a.User?.name) instructors.add(a.User.name);
          });
        });
      });

      const plannedCount =
        dailyPlanned.size > 0 ? Math.max(...(Array.from(dailyPlanned.values()) as number[])) : 0;
      const actualCount =
        dailyActual.size > 0 ? Math.max(...(Array.from(dailyActual.values()) as number[])) : 0;

      return {
        ...u,
        periodStr: periodStrings.join(', '),
        plannedCount,
        actualCount,
        totalPlannedDays,
        actualDaysCumulative,
        instructors: Array.from(instructors),
        places: Array.from(places),
        place: Array.from(places)[0] || '', // 대표 장소
      };
    });
  }

  private getWeekRange(year: number, month: number, week: number) {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const dayOfFirst = firstDayOfMonth.getDay();
    const firstMondayDate = 1 + (dayOfFirst === 1 ? 0 : dayOfFirst === 0 ? 1 : 8 - dayOfFirst);
    const startDay = firstMondayDate + (week - 1) * 7;
    const startDate = new Date(Date.UTC(year, month - 1, startDay, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, startDay + 6, 23, 59, 59, 999));
    return { startDate, endDate };
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

  private getMonthlyStats(schedules: any[]) {
    const stats: Record<string, { count: number }> = {
      Army: { count: 0 },
      Navy: { count: 0 },
      AirForce: { count: 0 },
      Marines: { count: 0 },
      MND: { count: 0 },
    };
    schedules.forEach((s) => {
      const type = s.trainingPeriod.unit.unitType;
      if (type && stats[type]) stats[type].count++;
    });
    return stats;
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
}

export default new ReportService();
