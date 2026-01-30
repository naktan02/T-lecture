// server/src/domains/report/report.service.ts
import { Workbook, Worksheet } from 'exceljs';
import path from 'path';
import prisma from '../../libs/prisma';
import { MilitaryType } from '../../generated/prisma/client.js';

// SystemConfig에서 TRAINEES_PER_INSTRUCTOR 값 가져오기 (캐시)
let cachedTraineesPerInstructor: number | null = null;
async function getTraineesPerInstructor(): Promise<number> {
  if (cachedTraineesPerInstructor !== null) return cachedTraineesPerInstructor;
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'TRAINEES_PER_INSTRUCTOR' },
  });
  cachedTraineesPerInstructor = config?.value ? parseInt(config.value, 10) : 36;
  return cachedTraineesPerInstructor;
}

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
   * 사용 가능한 연도 목록 조회 (실제 일정 데이터 기준)
   * ISO 8601: 해당 주의 목요일이 속한 연도 기준
   */
  async getAvailableYears(): Promise<number[]> {
    const schedules = await prisma.unitSchedule.findMany({
      where: { date: { not: null } },
      select: { date: true },
    });

    const yearsSet = new Set<number>();

    schedules.forEach((s) => {
      if (!s.date) return;
      const weekInfo = this.getISO8601WeekInfo(new Date(s.date));
      yearsSet.add(weekInfo.year);
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }

  /**
   * 해당 연도에서 데이터가 있는 월 목록 조회
   * ISO 8601: 해당 주의 목요일이 속한 월 기준
   */
  async getAvailableMonths(year: number): Promise<number[]> {
    const schedules = await prisma.unitSchedule.findMany({
      where: { date: { not: null } },
      select: { date: true },
    });

    const monthsSet = new Set<number>();

    schedules.forEach((s) => {
      if (!s.date) return;
      const weekInfo = this.getISO8601WeekInfo(new Date(s.date));
      if (weekInfo.year === year) {
        monthsSet.add(weekInfo.month);
      }
    });

    return Array.from(monthsSet).sort((a, b) => a - b);
  }

  /**
   * 해당 연도/월에서 데이터가 있는 주차 목록 조회
   * ISO 8601: 해당 주의 목요일이 속한 월 기준
   */
  async getAvailableWeeks(year: number, month: number): Promise<number[]> {
    // 해당 월의 전체 주차 범위 가져오기
    const { startDate, endDate } = this.getMonthRangeISO8601(year, month);

    const schedules = await prisma.unitSchedule.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { date: true },
    });

    const weeksSet = new Set<number>();

    schedules.forEach((s) => {
      if (!s.date) return;
      const weekInfo = this.getISO8601WeekInfo(new Date(s.date));
      // ISO 8601 기준으로 해당 연/월에 속하는 주차만 추가
      if (weekInfo.year === year && weekInfo.month === month) {
        weeksSet.add(weekInfo.week);
      }
    });

    return Array.from(weeksSet).sort((a, b) => a - b);
  }

  // =====================================================
  // ISO 8601 주차 계산 헬퍼 함수들
  // =====================================================

  /**
   * 주어진 날짜가 속한 주의 목요일을 반환
   * ISO 8601: 목요일이 속한 달/연도가 해당 주의 소속을 결정
   */
  private getThursdayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0: 일요일, 1: 월요일, ..., 4: 목요일
    // 목요일까지의 차이 계산 (일요일=0을 7로 처리)
    const diff = 4 - (day === 0 ? 7 : day);
    d.setDate(d.getDate() + diff);
    return d;
  }

  /**
   * 주어진 날짜가 속한 주의 월요일을 반환
   */
  private getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0: 일요일
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  /**
   * 주어진 날짜가 속한 주의 일요일을 반환
   */
  private getSundayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  /**
   * ISO 8601 기준으로 해당 날짜가 속한 월의 주차 번호 반환
   * 해당 주의 목요일이 속한 달이 해당 주의 소속 월
   * @returns { year, month, week } - 해당 날짜가 실제로 속한 연도, 월, 주차
   */
  private getISO8601WeekInfo(date: Date): { year: number; month: number; week: number } {
    const thursday = this.getThursdayOfWeek(date);
    const thursdayYear = thursday.getFullYear();
    const thursdayMonth = thursday.getMonth() + 1;

    // 해당 월의 첫 번째 목요일 찾기
    const firstDayOfMonth = new Date(thursdayYear, thursdayMonth - 1, 1);
    let firstThursday = new Date(firstDayOfMonth);
    const dayOfFirst = firstDayOfMonth.getDay();
    // 첫 번째 목요일까지의 차이
    const daysUntilThursday = (4 - dayOfFirst + 7) % 7;
    firstThursday.setDate(1 + daysUntilThursday);

    // 주차 계산: (목요일 날짜 - 첫 번째 목요일 날짜) / 7 + 1
    const weekNumber = Math.floor((thursday.getDate() - firstThursday.getDate()) / 7) + 1;

    return { year: thursdayYear, month: thursdayMonth, week: weekNumber };
  }

  /**
   * 해당 월의 최대 주차 수 계산 (ISO 8601 기준)
   */
  private getMaxWeeksInMonth(year: number, month: number): number {
    // 해당 월의 마지막 날
    const lastDay = new Date(year, month, 0);
    const lastDayInfo = this.getISO8601WeekInfo(lastDay);

    // 마지막 날이 해당 월에 속하면 그 주차, 아니면 그 전 주 확인
    if (lastDayInfo.year === year && lastDayInfo.month === month) {
      return lastDayInfo.week;
    }

    // 마지막 날의 주가 다음 달에 속하면 그 전 날짜 확인
    const prevWeekDay = new Date(lastDay);
    prevWeekDay.setDate(prevWeekDay.getDate() - 7);
    const prevWeekInfo = this.getISO8601WeekInfo(prevWeekDay);
    return prevWeekInfo.week;
  }

  /**
   * 해당 월의 특정 주차의 날짜 범위 반환 (월요일 ~ 일요일)
   */
  private getWeekRangeISO8601(
    year: number,
    month: number,
    week: number,
  ): { startDate: Date; endDate: Date } {
    // 해당 월의 첫 번째 목요일 찾기
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const dayOfFirst = firstDayOfMonth.getDay();
    const daysUntilThursday = (4 - dayOfFirst + 7) % 7;
    const firstThursday = new Date(year, month - 1, 1 + daysUntilThursday);

    // week 주차의 목요일
    const targetThursday = new Date(firstThursday);
    targetThursday.setDate(firstThursday.getDate() + (week - 1) * 7);

    // 해당 주의 월요일과 일요일
    const monday = this.getMondayOfWeek(targetThursday);
    const sunday = this.getSundayOfWeek(targetThursday);

    return {
      startDate: new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0)),
      endDate: new Date(
        Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59, 999),
      ),
    };
  }

  /**
   * 해당 월의 전체 주차 범위의 날짜 반환 (월간 보고서용)
   * 1주차 월요일 ~ 마지막 주차 일요일
   */
  private getMonthRangeISO8601(year: number, month: number): { startDate: Date; endDate: Date } {
    const maxWeek = this.getMaxWeeksInMonth(year, month);
    const firstWeekRange = this.getWeekRangeISO8601(year, month, 1);
    const lastWeekRange = this.getWeekRangeISO8601(year, month, maxWeek);

    return {
      startDate: firstWeekRange.startDate,
      endDate: lastWeekRange.endDate,
    };
  }

  // =====================================================
  // 주간 보고서 생성
  // =====================================================
  async generateWeeklyReport(params: WeeklyReportParams): Promise<Buffer> {
    const { year, month, week } = params;

    // 주차 유효성 검사
    const availableWeeks = await this.getAvailableWeeks(year, month);
    if (!availableWeeks.includes(week)) {
      throw new Error(`${year}년 ${month}월 ${week}주차에 교육 데이터가 없습니다.`);
    }

    const { startDate, endDate } = this.getWeekRangeISO8601(year, month, week);

    const workbook = new Workbook();
    const templatePath = path.join(this.templateDir, 'report_week.xlsx');
    await workbook.xlsx.readFile(templatePath);

    const sheet = workbook.worksheets[0];
    const shortYear = year.toString().slice(-2);
    const titleCell = sheet.getRow(1).getCell(2);
    titleCell.value = `[1그룹 푸른나무재단] ${month}월 ${week}주차 '${shortYear}년 병 집중인성교육 주간 결과보고`;

    const unitGroups = await this.getWeeklyReportData(startDate, endDate, year, month);

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
        row.getCell(9).value = g.monthStr || month; // 시기 (달 경계 넘으면 "1월/2월")
        row.getCell(10).value = g.weekStr || week; // 주차 (달 경계 넘으면 "4, 1")
        row.getCell(11).value = g.periodStr;

        row.getCell(12).value = g.plannedCount;
        row.getCell(13).value = g.actualCount;

        row.getCell(14).value = g.instructors.join(', ');
        row.getCell(15).value = g.instructors.length;

        // 최초계획 (16-18열)
        row.getCell(16).value = g.initialPeriodDays; // 최초 기간
        row.getCell(17).value = g.initialLocationCount; // 최초 그룹수
        row.getCell(18).value = g.initialTimes; // 최초 횟수

        // 실시현황 (19-21열)
        row.getCell(19).value = g.actualPeriodDays; // 실시 기간
        row.getCell(20).value = g.actualLocationCount; // 실시 그룹수
        row.getCell(21).value = g.actualTimes; // 실시 횟수

        // 교육장소 체크 (22~26열) - 기타는 개수만큼 카운트
        const placeCols = { 생활관: 22, 종교시설: 23, 식당: 24, 강의실: 25 };
        const checkedTypes = new Set<number>(); // 이미 체크한 장소 유형
        let etcCount = 0; // 기타 개수

        g.places.forEach((p) => {
          let matched = false;
          for (const [key, col] of Object.entries(placeCols)) {
            if (
              p.includes(key) ||
              (key === '강의실' && (p.includes('강당') || p.includes('교육장')))
            ) {
              // 종류별 중복 제외 (같은 종류는 1번만 체크)
              if (!checkedTypes.has(col)) {
                row.getCell(col).value = 1;
                checkedTypes.add(col);
                if (col === 22) placeTotals.p22++;
                else if (col === 23) placeTotals.p23++;
                else if (col === 24) placeTotals.p24++;
                else if (col === 25) placeTotals.p25++;
              }
              matched = true;
              break; // 하나의 장소는 한 종류에만 매칭
            }
          }
          // 매칭되지 않은 장소는 기타로 카운트
          if (!matched) {
            etcCount++;
          }
        });

        // 기타는 개수만큼 표시
        if (etcCount > 0) {
          row.getCell(26).value = etcCount;
          placeTotals.p26 += etcCount;
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
          // 최초계획
          acc.initPeriod += g.initialPeriodDays;
          acc.initLoc += g.initialLocationCount;
          acc.initTimes += g.initialTimes;
          // 실시현황
          acc.actPeriod += g.actualPeriodDays;
          acc.actLoc += g.actualLocationCount;
          acc.actTimes += g.actualTimes;
          return acc;
        },
        {
          pCount: 0,
          aCount: 0,
          iLen: 0,
          initPeriod: 0,
          initLoc: 0,
          initTimes: 0,
          actPeriod: 0,
          actLoc: 0,
          actTimes: 0,
        },
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
      // 최초계획
      summaryRow.getCell(16).value = {
        formula: `SUBTOTAL(9, P5:P${lastRow})`,
        result: totals.initPeriod,
      };
      summaryRow.getCell(17).value = {
        formula: `SUBTOTAL(9, Q5:Q${lastRow})`,
        result: totals.initLoc,
      };
      summaryRow.getCell(18).value = {
        formula: `SUBTOTAL(9, R5:R${lastRow})`,
        result: totals.initTimes,
      };
      // 실시현황
      summaryRow.getCell(19).value = {
        formula: `SUBTOTAL(9, S5:S${lastRow})`,
        result: totals.actPeriod,
      };
      summaryRow.getCell(20).value = {
        formula: `SUBTOTAL(9, T5:T${lastRow})`,
        result: totals.actLoc,
      };
      summaryRow.getCell(21).value = {
        formula: `SUBTOTAL(9, U5:U${lastRow})`,
        result: totals.actTimes,
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

    // 월 유효성 검사 - 해당 연도/월에 데이터가 있는지 확인
    const availableMonths = await this.getAvailableMonths(year);
    if (!availableMonths.includes(month)) {
      throw new Error(`${year}년 ${month}월에 교육 데이터가 없습니다.`);
    }

    // ISO 8601 기준 월간 범위: 1주차 월요일 ~ 마지막 주차 일요일
    const { startDate, endDate } = this.getMonthRangeISO8601(year, month);

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
      row.getCell(7).value = g.monthStr || `${month}월`; // G: 시기 (달 경계 시 "1월, 2월")
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
      row.getCell(7).value = g.monthStrNumOnly || month; // G: 시기 (달 경계 시 "1, 2" - "월" 없이)
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

    // 진행률 계산: 실시횟수 / 계획횟수 * 100
    // 월 진행률: 해당 월의 실시횟수 / 계획횟수
    const monthProgress =
      totals.tpDays > 0 ? Math.round((totals.adCum / totals.tpDays) * 100) : 0;

    // 연간 누적 계산을 위한 쿼리
    // 총 진행 목표: 해당 연도의 전체 일정(UnitSchedule) 수
    const totalYearPlanned = await prisma.unitSchedule.count({
      where: {
        trainingPeriod: { unit: { lectureYear: year } },
      },
    });

    // 누적 진행: 해당 연도의 완료된 일정 수 (날짜 < 오늘)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cumulativeActual = await prisma.unitSchedule.count({
      where: {
        date: { lt: today },
        trainingPeriod: { unit: { lectureYear: year } },
      },
    });

    const totalProgress =
      totalYearPlanned > 0 ? Math.round((cumulativeActual / totalYearPlanned) * 1000) / 10 : 0;

    postSheet.getRow(progressBaseRow).getCell(2).value =
      `* ${month}월 진행률 :  ${monthProgress}(%)`;
    postSheet.getRow(progressBaseRow + 1).getCell(2).value = `* 전체 진행률 :  ${totalProgress}(%)`;
    postSheet.getRow(progressBaseRow + 2).getCell(2).value = `총 진행 목표(${year})`;
    postSheet.getRow(progressBaseRow + 2).getCell(3).value = totalYearPlanned;
    postSheet.getRow(progressBaseRow + 3).getCell(2).value = `누적 진행(${month}월)`;
    postSheet.getRow(progressBaseRow + 3).getCell(3).value = cumulativeActual;

    // 열 너비 내용에 맞춰 자동 조절
    this.autoResizeColumns(preSheet, 5); // 사전 시트: 데이터 row 5부터
    this.autoResizeColumns(postSheet, 6); // 사후 시트: 데이터 row 6부터

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  // =====================================================
  // 주간 보고서용 데이터 조회 (새 로직: TrainingPeriod별 행 분리)
  // 경계에 걸친 교육은 전체 기간을 표시
  // =====================================================
  private async getWeeklyReportData(startDate: Date, endDate: Date, year: number, month: number) {
    // 1. 해당 주차에 일정이 있는 TrainingPeriod ID 조회
    const schedulesInRange = await prisma.unitSchedule.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { trainingPeriodId: true },
    });
    const periodIds = Array.from(new Set(schedulesInRange.map((s) => s.trainingPeriodId)));
    if (periodIds.length === 0) return [];

    const traineesPerInstructor = await getTraineesPerInstructor();

    // 오늘 날짜 (실시현황 계산에 사용 - 오늘 이전 완료된 교육만 포함)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. TrainingPeriod의 전체 일정 조회 (경계에 걸친 교육도 전체 기간 표시)
    const periods = await prisma.trainingPeriod.findMany({
      where: { id: { in: periodIds } },
      include: {
        unit: true,
        locations: true, // 교육장소
        schedules: {
          // 전체 일정 조회 (날짜 범위 필터 제거)
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

    // TrainingPeriod별로 행 생성 (정규교육/추가교육 분리)
    const results = periods.map((p) => {
      const instructors = new Set<string>();
      const places = new Set<string>(); // 실제 사용된 장소
      const dailyPlanned = new Map<string, number>();
      const dailyActual = new Map<string, number>();
      // 월-주차 정보 수집 (달 경계 넘는 경우 처리)
      const monthWeekMap = new Map<number, Set<number>>(); // month -> weeks

      // 실시현황 계산
      let actualPeriodDays = 0; // 실제 배정된 일정 수
      let totalAssignmentCount = 0; // 강사 배정 카운트 (실시 횟수)

      const sortedDates = p.schedules
        .map((s) => s.date)
        .filter(Boolean)
        .sort((a, b) => (a && b ? a.getTime() - b.getTime() : 0)) as Date[];

      // 모든 날짜에서 월-주차 수집 (ISO 8601, 달 경계 포함)
      sortedDates.forEach((d) => {
        const weekInfo = this.getISO8601WeekInfo(d);
        // 같은 연도의 모든 월-주차 수집 (달 경계 넘는 경우 대응)
        if (weekInfo.year === year) {
          if (!monthWeekMap.has(weekInfo.month)) {
            monthWeekMap.set(weekInfo.month, new Set<number>());
          }
          monthWeekMap.get(weekInfo.month)!.add(weekInfo.week);
        }
      });

      p.schedules.forEach((s) => {
        const dateStr = s.date?.toISOString().split('T')[0] || 'Unknown';
        if (!dailyPlanned.has(dateStr)) dailyPlanned.set(dateStr, 0);
        if (!dailyActual.has(dateStr)) dailyActual.set(dateStr, 0);

        // 날짜 < 오늘 체크 (실시현황용)
        const scheduleDate = s.date ? new Date(s.date) : null;
        const isCompleted = scheduleDate && scheduleDate < today;

        s.scheduleLocations.forEach((sl) => {
          dailyPlanned.set(dateStr, dailyPlanned.get(dateStr)! + (sl.plannedCount || 0));
          // 참여인원: actualCount가 있으면 사용, 없으면 plannedCount 사용 (배정/교육 상황 무관)
          dailyActual.set(dateStr, dailyActual.get(dateStr)! + (sl.actualCount ?? sl.plannedCount ?? 0));
          const pl = sl.location?.originalPlace || sl.location?.changedPlace;
          if (pl) places.add(pl);
        });

        if (s.assignments.length > 0 && isCompleted) {
          actualPeriodDays++;
          totalAssignmentCount += s.assignments.length; // 강사 배정 수 합산
        }
        // 강사 명단은 날짜와 관계없이 모두 포함 (배정된 강사 표시)
        s.assignments.forEach((a) => {
          if (a.User?.name) instructors.add(a.User.name);
        });
      });

      // 계획인원/참여인원: 일일 최대값
      const plannedCount =
        dailyPlanned.size > 0 ? Math.max(...Array.from(dailyPlanned.values())) : 0;
      const actualCount = dailyActual.size > 0 ? Math.max(...Array.from(dailyActual.values())) : 0;

      // 최초계획 데이터
      // 타입 단언: Prisma 마이그레이션 전까지 새 필드 접근용
      const pAny = p as any;
      const initialPeriodDays = pAny.initialPeriodDays || p.schedules.length;
      const initialLocationCount = pAny.initialLocationCount || p.locations.length;
      // 최초계획인원: 일일 계획인원 합계의 최대값 (동적 계산)
      const initialPlannedCount = plannedCount;
      // 최초 횟수: (계획인원 / 강사당교육생수) * 최초기간
      const initialTimes = Math.ceil(initialPlannedCount / traineesPerInstructor) * initialPeriodDays;

      // 실시 그룹수: 실제 사용된 교육장소 개수
      const actualLocationCount = places.size;

      // 첫 번째 일정 날짜 (정렬용)
      const firstDate = sortedDates.length > 0 ? sortedDates[0] : null;

      // 월-주차 문자열 생성 (달 경계 넘는 경우 대응)
      const sortedMonths = Array.from(monthWeekMap.keys()).sort((a, b) => a - b);
      // 시기: "1월" 또는 "1월, 2월"
      const monthStr = sortedMonths.map((m) => `${m}월`).join(', ');
      // 주차: 월별로 주차를 순서대로 나열 (예: 1월 4주, 2월 1주 → "4, 1")
      const weekStr = sortedMonths
        .flatMap((m) => Array.from(monthWeekMap.get(m)!).sort((a, b) => a - b))
        .join(', ');

      return {
        unitName: p.unit.name,
        unitType: p.unit.unitType,
        wideArea: p.unit.wideArea,
        region: p.unit.region,
        periodName: p.name, // 정규교육, 추가교육 등
        periodStr: this.formatPeriod(sortedDates),
        plannedCount,
        actualCount,
        instructors: Array.from(instructors),
        places: Array.from(places),
        // 최초계획
        initialPeriodDays,
        initialLocationCount,
        initialTimes,
        // 실시현황
        actualPeriodDays,
        actualLocationCount,
        actualTimes: totalAssignmentCount, // 강사 배정 횟수
        // 시기/주차 정보
        monthStr,
        weekStr,
        // 정렬용
        firstDate,
      };
    });

    // 교육 일자 순 정렬
    return results.sort((a, b) => {
      if (!a.firstDate && !b.firstDate) return 0;
      if (!a.firstDate) return 1;
      if (!b.firstDate) return -1;
      return a.firstDate.getTime() - b.firstDate.getTime();
    });
  }

  // =====================================================
  // 월간 보고서용 데이터 조회 (새 로직: TrainingPeriod별 행 분리)
  // 경계에 걸친 교육은 전체 기간을 표시
  // =====================================================
  private async getMonthlyReportData(startDate: Date, endDate: Date, year: number, month: number) {
    // 1. 해당 월에 일정이 있는 TrainingPeriod ID 조회
    const schedulesInRange = await prisma.unitSchedule.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { trainingPeriodId: true },
    });
    const periodIds = Array.from(new Set(schedulesInRange.map((s) => s.trainingPeriodId)));
    if (periodIds.length === 0) return [];

    const traineesPerInstructor = await getTraineesPerInstructor();

    // 오늘 날짜 (실시현황 계산에 사용 - 오늘 이전 완료된 교육만 포함)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. TrainingPeriod의 전체 일정 조회 (경계에 걸친 교육도 전체 기간 표시)
    const periods = await prisma.trainingPeriod.findMany({
      where: { id: { in: periodIds } },
      include: {
        unit: true,
        locations: true,
        schedules: {
          // 전체 일정 조회 (날짜 범위 필터 제거)
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

    // TrainingPeriod별로 행 생성 (정규교육/추가교육 분리)
    const results = periods.map((p) => {
      const instructors = new Set<string>();
      const dailyPlanned = new Map<string, number>();
      const dailyActual = new Map<string, number>();
      // 월-주차 정보 수집 (달 경계 넘는 경우 처리)
      const monthWeekMap = new Map<number, Set<number>>(); // month -> weeks

      // 실시현황 계산
      let totalAssignmentCount = 0; // 강사 배정 카운트 (실시 횟수)

      const sortedDates = p.schedules
        .map((s) => s.date)
        .filter(Boolean)
        .sort((a, b) => (a && b ? a.getTime() - b.getTime() : 0)) as Date[];

      // 모든 날짜에서 월-주차 수집 (ISO 8601, 달 경계 포함)
      sortedDates.forEach((d) => {
        const weekInfo = this.getISO8601WeekInfo(d);
        // 같은 연도의 모든 월-주차 수집 (달 경계 넘는 경우 대응)
        if (weekInfo.year === year) {
          if (!monthWeekMap.has(weekInfo.month)) {
            monthWeekMap.set(weekInfo.month, new Set<number>());
          }
          monthWeekMap.get(weekInfo.month)!.add(weekInfo.week);
        }
      });

      p.schedules.forEach((s) => {
        const dateStr = s.date?.toISOString().split('T')[0] || 'Unknown';
        if (!dailyPlanned.has(dateStr)) dailyPlanned.set(dateStr, 0);
        if (!dailyActual.has(dateStr)) dailyActual.set(dateStr, 0);

        // 날짜 < 오늘 체크 (실시현황용)
        const scheduleDate = s.date ? new Date(s.date) : null;
        const isCompleted = scheduleDate && scheduleDate < today;

        s.scheduleLocations.forEach((sl) => {
          dailyPlanned.set(dateStr, dailyPlanned.get(dateStr)! + (sl.plannedCount || 0));
          // 참여인원: actualCount가 있으면 사용, 없으면 plannedCount 사용 (배정/교육 상황 무관)
          dailyActual.set(dateStr, dailyActual.get(dateStr)! + (sl.actualCount ?? sl.plannedCount ?? 0));
        });

        // 강사 배정 카운트 (확정 + 날짜 < 오늘인 경우만 실시현황에 포함)
        if (isCompleted) {
          totalAssignmentCount += s.assignments.length;
        }
        // 강사 명단은 날짜와 관계없이 모두 포함 (배정된 강사 표시)
        s.assignments.forEach((a) => {
          if (a.User?.name) instructors.add(a.User.name);
        });
      });

      // 계획인원/참여인원: 일일 최대값
      const plannedCount =
        dailyPlanned.size > 0 ? Math.max(...Array.from(dailyPlanned.values())) : 0;
      const actualCount = dailyActual.size > 0 ? Math.max(...Array.from(dailyActual.values())) : 0;

      // 최초계획 데이터
      const pAny = p as any;
      const initialPeriodDays = pAny.initialPeriodDays || p.schedules.length;
      // 최초계획인원: 일일 계획인원 합계의 최대값 (동적 계산)
      const initialPlannedCount = plannedCount;
      // 계획 횟수: (계획인원 / 강사당교육생수) * 최초기간
      const totalPlannedDays = Math.ceil(initialPlannedCount / traineesPerInstructor) * initialPeriodDays;

      // 담당관 연락처 포맷
      const officerContact =
        p.officerName && p.officerPhone
          ? `${p.officerName} / ${p.officerPhone}`
          : p.officerName || p.officerPhone || '';

      // 첫 번째 일정 날짜 (정렬용)
      const firstDate = sortedDates.length > 0 ? sortedDates[0] : null;

      // 월-주차 문자열 생성 (달 경계 넘는 경우 대응)
      const sortedMonths = Array.from(monthWeekMap.keys()).sort((a, b) => a - b);
      // 시기 (사전 시트용): "1월" 또는 "1월, 2월"
      const monthStr = sortedMonths.map((m) => `${m}월`).join(', ');
      // 시기 (사후 시트용): "1" 또는 "1, 2" ("월" 없이)
      const monthStrNumOnly = sortedMonths.join(', ');
      // 주차: 월별로 주차를 순서대로 나열 (예: 1월 4주, 2월 1주 → "4, 1")
      const weekStr = sortedMonths
        .flatMap((m) => Array.from(monthWeekMap.get(m)!).sort((a, b) => a - b))
        .join(', ');

      return {
        unitName: p.unit.name,
        unitType: p.unit.unitType,
        wideArea: p.unit.wideArea,
        region: p.unit.region,
        periodName: p.name,
        periodStr: this.formatPeriod(sortedDates),
        plannedCount,
        actualCount,
        totalPlannedDays, // 계획 횟수
        actualDaysCumulative: totalAssignmentCount, // 실시 횟수
        instructors: Array.from(instructors),
        officerContact,
        monthStr, // 사전 시트용 (예: "1월, 2월")
        monthStrNumOnly, // 사후 시트용 (예: "1, 2")
        weekStr,
        firstDate,
      };
    });

    // 교육 일자 순 정렬
    return results.sort((a, b) => {
      if (!a.firstDate && !b.firstDate) return 0;
      if (!a.firstDate) return 1;
      if (!b.firstDate) return -1;
      return a.firstDate.getTime() - b.firstDate.getTime();
    });
  }

  // =====================================================
  // 헬퍼 함수들
  // =====================================================
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
