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

  /**
   * 주간 보고서 생성
   */
  async generateWeeklyReport(params: WeeklyReportParams): Promise<Buffer> {
    const { year, month, week } = params;
    const { startDate, endDate } = this.getWeekRange(year, month, week);

    const workbook = new Workbook();
    const templatePath = path.join(this.templateDir, 'report_week.xlsx');
    await workbook.xlsx.readFile(templatePath);

    const sheet = workbook.worksheets[0]; // 첫 번째 시트 사용

    // 시트 이름 업데이트 (예: 6월 2주차 결과보고)
    sheet.name = `${month}월 ${week}주차 결과보고`;

    // 제목 셀 업데이트 (Row 1)
    const titleCell = sheet.getRow(1).getCell(2);
    const shortYear = year.toString().slice(-2);
    titleCell.value = `[1그룹 푸른나무재단] ${month}월 ${week}주차 '${shortYear}년 병 집중인성교육 주간 결과보고`;

    // 데이터 조회
    const schedules = await prisma.unitSchedule.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        trainingPeriod: {
          include: {
            unit: true,
            locations: true,
          },
        },
        assignments: {
          where: { state: 'Accepted' },
          include: { User: { select: { name: true } } },
        },
        scheduleLocations: {
          include: { location: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // 부대별 그룹화
    // "한 행에 한 부대의 데이터를 처리합니다."
    const unitGroups = this.groupByUnit(schedules);

    // 데이터 삽입
    // Row 5가 데이터 템플릿 행임. Row 6은 합계 행임.
    if (unitGroups.length > 0) {
      // [중요] exceljs 버그 수정: 공유 수식이 포함된 행(합계 행)이 duplicateRow에 의해 밀려날 때
      // "Shared Formula master must exist above and or left of clone" 오류나
      // "Cannot read properties of undefined (reading 'replace')" 오류가 발생할 수 있음.
      // 이를 방지하기 위해 합계 행의 수식과 값을 완전히 제거함.
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

      unitGroups.forEach((group, index) => {
        const rowNumber = 5 + index;
        const row = sheet.getRow(rowNumber);

        // 데이터 채우기 (열 번호는 analysis_results.json 참고)
        row.getCell(2).value = index + 1; // 번호/누적
        row.getCell(4).value = '푸른나무재단'; // 업체명 (고정)
        row.getCell(5).value = this.getMilitaryTypeLabel(group.unitType); // 군 구분
        row.getCell(6).value = group.unitName; // 부대명
        row.getCell(7).value = group.wideArea; // 지역(광역)
        row.getCell(8).value = group.region; // 지역(기초)
        row.getCell(9).value = month; // 월
        row.getCell(10).value = week; // 주차
        row.getCell(11).value = group.periodStr; // 시행기간 (예: 6.9~6.11)
        row.getCell(12).value = group.plannedCount; // 계획인원
        row.getCell(13).value = group.actualCount; // 참여인원
        row.getCell(14).value = group.instructors.join(', '); // 투입강사
        row.getCell(15).value = group.instructors.length; // 투입강사 수

        // 최초 계획 (기간, 그룹 수, 횟수)
        row.getCell(16).value = group.initialDaysCount;
        row.getCell(17).value = 1; // 그룹 수 (1로 고정)
        row.getCell(18).value = group.initialSchedulesCount;

        // 실시 현황 (기간, 그룹, 횟수)
        row.getCell(19).value = group.actualDaysCount;
        row.getCell(20).value = 1; // 그룹 (1로 고정)
        row.getCell(21).value = group.actualSchedulesCount;

        // 교육장소 (체크 표시 "1")
        // 생활관(22), 종교시설(23), 식당(24), 교육장(25), 기타(26)
        const place = group.place;
        const lowerPlace = (place || '').toLowerCase();
        if (lowerPlace.includes('생활관')) row.getCell(22).value = 1;
        else if (
          lowerPlace.includes('종교시설') ||
          lowerPlace.includes('성당') ||
          lowerPlace.includes('교회') ||
          lowerPlace.includes('사찰')
        )
          row.getCell(23).value = 1;
        else if (lowerPlace.includes('식당')) row.getCell(24).value = 1;
        else if (
          lowerPlace.includes('교육장') ||
          lowerPlace.includes('대강당') ||
          lowerPlace.includes('강의실')
        )
          row.getCell(25).value = 1;
        else row.getCell(26).value = 1; // 기타

        row.commit();
      });
    }

    // 합계 수식 업데이트
    const summaryRowNumber = 5 + (unitGroups.length > 0 ? unitGroups.length : 1);
    const summaryRow = sheet.getRow(summaryRowNumber);
    if (unitGroups.length > 0) {
      // "계" 레이블 및 서식 복구
      summaryRow.getCell(2).value = '계';
      summaryRow.getCell(4).value = '계';
      summaryRow.getCell(5).value = '계';
      summaryRow.getCell(6).value = '계';
      summaryRow.getCell(7).value = '계';
      summaryRow.getCell(8).value = '계';
      summaryRow.getCell(10).value = '계';

      summaryRow.getCell(12).value = { formula: `SUBTOTAL(9, L5:L${5 + unitGroups.length - 1})` };
      summaryRow.getCell(13).value = { formula: `SUBTOTAL(9, M5:M${5 + unitGroups.length - 1})` };
      summaryRow.getCell(15).value = { formula: `SUBTOTAL(9, O5:O${5 + unitGroups.length - 1})` };
      summaryRow.getCell(16).value = { formula: `SUBTOTAL(9, P5:P${5 + unitGroups.length - 1})` };
      summaryRow.getCell(17).value = { formula: `SUBTOTAL(9, Q5:Q${5 + unitGroups.length - 1})` };
      summaryRow.getCell(18).value = { formula: `SUBTOTAL(9, R5:R${5 + unitGroups.length - 1})` };
      summaryRow.getCell(19).value = { formula: `SUBTOTAL(9, S5:S${5 + unitGroups.length - 1})` };
      summaryRow.getCell(20).value = { formula: `SUBTOTAL(9, T5:T${5 + unitGroups.length - 1})` };
      summaryRow.getCell(21).value = { formula: `SUBTOTAL(9, U5:U${5 + unitGroups.length - 1})` };
      // 교육장소 합계 추가
      summaryRow.getCell(22).value = { formula: `SUBTOTAL(9, V5:V${5 + unitGroups.length - 1})` };
      summaryRow.getCell(23).value = { formula: `SUBTOTAL(9, W5:W${5 + unitGroups.length - 1})` };
      summaryRow.getCell(24).value = { formula: `SUBTOTAL(9, X5:X${5 + unitGroups.length - 1})` };
      summaryRow.getCell(25).value = { formula: `SUBTOTAL(9, Y5:Y${5 + unitGroups.length - 1})` };
      summaryRow.getCell(26).value = { formula: `SUBTOTAL(9, Z5:Z${5 + unitGroups.length - 1})` };
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  /**
   * 월간 보고서 생성
   */
  async generateMonthlyReport(params: MonthlyReportParams): Promise<Buffer> {
    const { year, month } = params;
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const workbook = new Workbook();
    const templatePath = path.join(this.templateDir, 'report_month.xlsx');
    await workbook.xlsx.readFile(templatePath);

    // 1. 종합 시트 (Sheet 1)
    const summarySheet = workbook.worksheets[0];
    summarySheet.name = `${month}월 집중인성교육 종합`;

    // 제목
    const shortYear = year.toString().slice(-2);
    summarySheet.getRow(1).getCell(2).value =
      `[1그룹 푸른나무재단] ${month}월 '${shortYear}년 병 집중인성교육 정기 보고`;

    // 데이터 조회 (해당 월)
    const monthlySchedules = await prisma.unitSchedule.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: {
        trainingPeriod: { include: { unit: true, locations: true } },
        assignments: {
          where: { state: 'Accepted' },
          include: { User: { select: { name: true } } },
        },
        scheduleLocations: { include: { location: true } },
      },
      orderBy: { date: 'asc' },
    });

    // 전체 목표 조회 (해당 년도 전체 일정 합계)
    // 여기서 '횟수'를 기준으로 할지 '인원'을 기준으로 할지 명확하지 않으나
    // "전체 일정의 합이 총 진행 목표"라고 하셨으므로 일정(Schedule) 개수로 처리합니다.
    const totalYearSchedules = await prisma.unitSchedule.count({
      where: {
        trainingPeriod: { unit: { lectureYear: year } },
      },
    });

    // 현재까지 진행 수량 (오늘 이전의 일정들)
    const progressCount = await prisma.unitSchedule.count({
      where: {
        trainingPeriod: { unit: { lectureYear: year } },
        date: { lt: new Date() },
      },
    });

    // 진행률 테이블 (Row 6)
    const progressRow = summarySheet.getRow(6);
    progressRow.getCell(2).value = totalYearSchedules; // 전체 목표
    progressRow.getCell(3).value = progressCount; // 진행 수량
    progressRow.getCell(4).value = totalYearSchedules > 0 ? progressCount / totalYearSchedules : 0; // 진행률 (Excel 서식이 백분율일 것)

    // 군별 통계
    const monthlyStats = this.getMonthlyStats(monthlySchedules);
    const mRow = summarySheet.getRow(12); // 육군
    mRow.getCell(3).value = monthlyStats.Army.count;
    summarySheet.getRow(13).getCell(3).value = monthlyStats.Navy.count;
    summarySheet.getRow(14).getCell(3).value = monthlyStats.AirForce.count;
    summarySheet.getRow(15).getCell(3).value = monthlyStats.Marines.count;
    summarySheet.getRow(16).getCell(3).value = monthlyStats.MND.count;

    // 2. 사전 시트 (Sheet 2) - 계획된 일정
    const preSheet = workbook.worksheets[1];
    if (monthlySchedules.length > 0) {
      if (monthlySchedules.length > 1) {
        for (let i = 1; i < monthlySchedules.length; i++) {
          preSheet.duplicateRow(4, 1, true);
        }
      }
      monthlySchedules.forEach((s, idx) => {
        const row = preSheet.getRow(4 + idx);
        row.getCell(2).value = idx + 1;
        row.getCell(4).value = '푸른나무재단';
        row.getCell(5).value = '인성교육';
        row.getCell(6).value = s.trainingPeriod.unit.name;
        row.getCell(7).value =
          s.scheduleLocations?.[0]?.location?.changedPlace ||
          s.scheduleLocations?.[0]?.location?.originalPlace;
        row.getCell(8).value = s.date ? s.date.toISOString().split('T')[0] : '';
        row.getCell(9).value =
          s.scheduleLocations?.reduce((acc, curr) => acc + (curr.plannedCount || 0), 0) || 0;
        row.getCell(10).value = s.assignments.map((a) => a.User.name).join(', ');
        row.commit();
      });
    }

    // 3. 사후 시트 (Sheet 3) - 실시 현황 (Weekly와 유사)
    const postSheet = workbook.worksheets[2];
    const unitGroups = this.groupByUnit(monthlySchedules);
    if (unitGroups.length > 0) {
      // Monthly 사후 시트에서도 동일한 공유 수식 이슈 방지를 위해 합계 행 클리어
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
      unitGroups.forEach((group, index) => {
        const row = postSheet.getRow(5 + index);
        row.getCell(2).value = index + 1;
        row.getCell(4).value = '푸른나무재단';
        row.getCell(5).value = this.getMilitaryTypeLabel(group.unitType);
        row.getCell(6).value = group.unitName;
        row.getCell(7).value = group.place;
        row.getCell(8).value = group.periodStr;
        row.getCell(9).value = group.actualCount;
        row.getCell(10).value = group.instructors.join(', ');
        row.getCell(11).value = group.instructors.length;

        row.getCell(12).value = group.initialDaysCount;
        row.getCell(13).value = 1;
        row.getCell(14).value = group.initialSchedulesCount;

        row.getCell(15).value = group.actualDaysCount;
        row.getCell(16).value = 1;
        row.getCell(17).value = group.actualSchedulesCount;

        const lowerPlace = (group.place || '').toLowerCase();
        if (lowerPlace.includes('생활관')) row.getCell(18).value = 1;
        else if (
          lowerPlace.includes('종교시설') ||
          lowerPlace.includes('성당') ||
          lowerPlace.includes('교회')
        )
          row.getCell(19).value = 1;
        else if (lowerPlace.includes('식당')) row.getCell(20).value = 1;
        else if (lowerPlace.includes('교육장') || lowerPlace.includes('강의실'))
          row.getCell(21).value = 1;
        else row.getCell(22).value = 1;
        row.commit();
      });

      // 합계 수식
      const summaryRow = postSheet.getRow(5 + unitGroups.length);
      summaryRow.getCell(2).value = '계';
      summaryRow.getCell(4).value = '계';
      summaryRow.getCell(6).value = '계';
      summaryRow.getCell(9).value = { formula: `SUBTOTAL(9, I5:I${5 + unitGroups.length - 1})` };
      summaryRow.getCell(11).value = { formula: `SUBTOTAL(9, K5:K${5 + unitGroups.length - 1})` };
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
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

  /**
   * 주차에 해당하는 시작/종료일 계산 (Mon-Sun 기준)
   */
  private getWeekRange(year: number, month: number, week: number) {
    // 해당 월의 1일
    const firstDayOfMonth = new Date(year, month - 1, 1);

    // 첫 번째 월요일 찾기 (국립국어원 표준: 첫 번째 월요일이 포함된 주가 1주차)
    // firstDayOfMonth.getDay(): 0(일) ~ 6(토)
    const dayOfFirst = firstDayOfMonth.getDay();
    let firstMondayDate = 1;
    if (dayOfFirst !== 1) {
      // 월요일이 아니면
      firstMondayDate = 1 + (dayOfFirst === 0 ? 1 : 8 - dayOfFirst);
    }

    // 계산된 첫 월요일이 1일이 아니고, 그 전의 며칠(목/금/토/일 등)이 있다면
    // 그 날들은 전월의 마지막 주에 속함.

    const startDay = firstMondayDate + (week - 1) * 7;
    const startDate = new Date(Date.UTC(year, month - 1, startDay, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, startDay + 6, 23, 59, 59, 999));

    return { startDate, endDate };
  }

  private groupByUnit(schedules: any[]) {
    const map = new Map<number, any>();

    schedules.forEach((s) => {
      const unit = s.trainingPeriod.unit;
      if (!map.has(unit.id)) {
        map.set(unit.id, {
          unitName: unit.name,
          unitType: unit.unitType,
          wideArea: unit.wideArea,
          region: unit.region,
          dates: [],
          initialDates: [],
          dailyPlanned: new Map<string, number>(),
          dailyActual: new Map<string, number>(),
          instructors: new Set<string>(),
          place:
            s.scheduleLocations?.[0]?.location?.changedPlace ||
            s.scheduleLocations?.[0]?.location?.originalPlace,
        });
      }

      const g = map.get(unit.id);
      if (s.date) g.dates.push(s.date);
      if (s.initialDate) g.initialDates.push(s.initialDate);

      const sl = s.scheduleLocations || [];
      const dateStr = s.date?.toISOString().split('T')[0] || 'Unknown';
      if (!g.dailyPlanned.has(dateStr)) g.dailyPlanned.set(dateStr, 0);
      if (!g.dailyActual.has(dateStr)) g.dailyActual.set(dateStr, 0);

      sl.forEach((l: any) => {
        g.dailyPlanned.set(dateStr, g.dailyPlanned.get(dateStr) + (l.plannedCount || 0));
        g.dailyActual.set(dateStr, g.dailyActual.get(dateStr) + (l.actualCount || 0));
      });

      s.assignments.forEach((a: any) => {
        if (a.User?.name) g.instructors.add(a.User.name);
      });
    });

    return Array.from(map.values()).map((g) => {
      const uniqueInstructors = Array.from(g.instructors);
      const sortedDates = g.dates.sort((a: any, b: any) => a.getTime() - b.getTime());
      const periodStr = this.formatPeriod(sortedDates);

      const initialDaysCount = new Set(
        g.initialDates.map((d: Date) => d.toISOString().split('T')[0]),
      ).size;
      const actualDaysCount = new Set(g.dates.map((d: Date) => d.toISOString().split('T')[0])).size;

      // 일별 합계 중 최대값을 해당 주차의 인원으로 산정
      const plannedCount =
        g.dailyPlanned.size > 0
          ? Math.max(...(Array.from(g.dailyPlanned.values()) as number[]))
          : 0;
      const actualCount =
        g.dailyActual.size > 0 ? Math.max(...(Array.from(g.dailyActual.values()) as number[])) : 0;

      return {
        ...g,
        plannedCount,
        actualCount,
        instructors: uniqueInstructors as string[],
        periodStr,
        initialDaysCount,
        initialSchedulesCount: g.initialDates.length,
        actualDaysCount,
        actualSchedulesCount: g.dates.length,
      };
    });
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
}

export default new ReportService();
