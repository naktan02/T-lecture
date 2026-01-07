// server/src/domains/data-backup/data-backup.service.ts
// 새 스키마(lectureYear 기반) 데이터 백업/삭제 서비스
import ExcelJS from 'exceljs';
import prisma from '../../libs/prisma';
import logger from '../../config/logger';

interface ExportOptions {
  year: number;
}

export class DataBackupService {
  /**
   * 지정된 연도의 데이터를 엑셀 파일로 생성
   * - 백업용 시트: 전체 필드 (DB 복원용)
   * - 분석용 시트: 사람이 읽기 쉬운 형태
   */
  async generateExcel(options: ExportOptions): Promise<ExcelJS.Workbook> {
    const { year } = options;

    logger.info(`[DataBackup] Generating Excel for lectureYear ${year}`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'T-LECTURE';
    workbook.created = new Date();

    // ========== 백업용 시트 (전체 필드) ==========
    await this.addUnitsSheet(workbook, year);
    await this.addTrainingPeriodsSheet(workbook, year);
    await this.addTrainingLocationsSheet(workbook, year);
    await this.addSchedulesSheet(workbook, year);
    await this.addScheduleLocationsSheet(workbook, year);
    await this.addAssignmentsSheet(workbook, year);
    await this.addDistancesSheet(workbook, year);
    await this.addAvailabilitiesSheet(workbook, year);
    await this.addDispatchesSheet(workbook, year);
    await this.addDispatchAssignmentsSheet(workbook, year);

    // ========== 분석용 시트 (사람이 읽기 쉬운 형태) ==========
    await this.addUnitsSummarySheet(workbook, year);
    await this.addAssignmentsSummarySheet(workbook, year);
    await this.addInstructorMonthlyStatsSheet(workbook, year);

    logger.info(`[DataBackup] Excel generation completed for lectureYear ${year}`);
    return workbook;
  }

  // ========== 백업용 시트 메서드 ==========

  private async addUnitsSheet(workbook: ExcelJS.Workbook, year: number) {
    const sheet = workbook.addWorksheet('부대');
    sheet.columns = [
      { header: 'id', key: 'id', width: 8 },
      { header: 'lectureYear', key: 'lectureYear', width: 10 },
      { header: 'name', key: 'name', width: 25 },
      { header: 'unitType', key: 'unitType', width: 10 },
      { header: 'wideArea', key: 'wideArea', width: 12 },
      { header: 'region', key: 'region', width: 12 },
      { header: 'addressDetail', key: 'addressDetail', width: 40 },
      { header: 'detailAddress', key: 'detailAddress', width: 40 },
      { header: 'lat', key: 'lat', width: 12 },
      { header: 'lng', key: 'lng', width: 12 },
    ];

    const units = await prisma.unit.findMany({
      where: { lectureYear: year },
    });

    units.forEach((u) => {
      sheet.addRow({
        id: u.id,
        lectureYear: u.lectureYear,
        name: u.name || '',
        unitType: u.unitType || '',
        wideArea: u.wideArea || '',
        region: u.region || '',
        addressDetail: u.addressDetail || '',
        detailAddress: u.detailAddress || '',
        lat: u.lat,
        lng: u.lng,
      });
    });

    this.styleHeader(sheet);
  }

  private async addTrainingPeriodsSheet(workbook: ExcelJS.Workbook, year: number) {
    const sheet = workbook.addWorksheet('교육기간');
    sheet.columns = [
      { header: 'id', key: 'id', width: 8 },
      { header: 'unitId', key: 'unitId', width: 8 },
      { header: 'name', key: 'name', width: 20 },
      { header: 'workStartTime', key: 'workStartTime', width: 15 },
      { header: 'workEndTime', key: 'workEndTime', width: 15 },
      { header: 'lunchStartTime', key: 'lunchStartTime', width: 15 },
      { header: 'lunchEndTime', key: 'lunchEndTime', width: 15 },
      { header: 'officerName', key: 'officerName', width: 12 },
      { header: 'officerPhone', key: 'officerPhone', width: 15 },
      { header: 'officerEmail', key: 'officerEmail', width: 25 },
      { header: 'isStaffLocked', key: 'isStaffLocked', width: 12 },
      { header: 'excludedDates', key: 'excludedDates', width: 30 },
      { header: 'hasCateredMeals', key: 'hasCateredMeals', width: 12 },
      { header: 'hasHallLodging', key: 'hasHallLodging', width: 12 },
      { header: 'allowsPhoneBeforeAfter', key: 'allowsPhoneBeforeAfter', width: 18 },
    ];

    const periods = await prisma.trainingPeriod.findMany({
      where: { unit: { lectureYear: year } },
    });

    periods.forEach((p) => {
      sheet.addRow({
        id: p.id,
        unitId: p.unitId,
        name: p.name || '',
        workStartTime: p.workStartTime ? this.formatTime(p.workStartTime) : '',
        workEndTime: p.workEndTime ? this.formatTime(p.workEndTime) : '',
        lunchStartTime: p.lunchStartTime ? this.formatTime(p.lunchStartTime) : '',
        lunchEndTime: p.lunchEndTime ? this.formatTime(p.lunchEndTime) : '',
        officerName: p.officerName || '',
        officerPhone: p.officerPhone || '',
        officerEmail: p.officerEmail || '',
        isStaffLocked: p.isStaffLocked,
        excludedDates: p.excludedDates ? JSON.stringify(p.excludedDates) : '',
        hasCateredMeals: p.hasCateredMeals,
        hasHallLodging: p.hasHallLodging,
        allowsPhoneBeforeAfter: p.allowsPhoneBeforeAfter,
      });
    });

    this.styleHeader(sheet);
  }

  private async addTrainingLocationsSheet(workbook: ExcelJS.Workbook, year: number) {
    const sheet = workbook.addWorksheet('교육장소');
    sheet.columns = [
      { header: 'id', key: 'id', width: 8 },
      { header: 'trainingPeriodId', key: 'trainingPeriodId', width: 14 },
      { header: 'originalPlace', key: 'originalPlace', width: 25 },
      { header: 'changedPlace', key: 'changedPlace', width: 25 },
      { header: 'hasInstructorLounge', key: 'hasInstructorLounge', width: 15 },
      { header: 'hasWomenRestroom', key: 'hasWomenRestroom', width: 15 },
      { header: 'note', key: 'note', width: 30 },
    ];

    const locations = await prisma.trainingLocation.findMany({
      where: { trainingPeriod: { unit: { lectureYear: year } } },
    });

    locations.forEach((l) => {
      sheet.addRow({
        id: l.id,
        trainingPeriodId: l.trainingPeriodId,
        originalPlace: l.originalPlace || '',
        changedPlace: l.changedPlace || '',
        hasInstructorLounge: l.hasInstructorLounge,
        hasWomenRestroom: l.hasWomenRestroom,
        note: l.note || '',
      });
    });

    this.styleHeader(sheet);
  }

  private async addSchedulesSheet(workbook: ExcelJS.Workbook, year: number) {
    const sheet = workbook.addWorksheet('부대일정');
    sheet.columns = [
      { header: 'id', key: 'id', width: 8 },
      { header: 'trainingPeriodId', key: 'trainingPeriodId', width: 14 },
      { header: 'date', key: 'date', width: 12 },
    ];

    const schedules = await prisma.unitSchedule.findMany({
      where: { trainingPeriod: { unit: { lectureYear: year } } },
    });

    schedules.forEach((s) => {
      sheet.addRow({
        id: s.id,
        trainingPeriodId: s.trainingPeriodId,
        date: s.date ? this.formatDate(s.date) : '',
      });
    });

    this.styleHeader(sheet);
  }

  private async addScheduleLocationsSheet(workbook: ExcelJS.Workbook, year: number) {
    const sheet = workbook.addWorksheet('일정_장소');
    sheet.columns = [
      { header: 'id', key: 'id', width: 8 },
      { header: 'unitScheduleId', key: 'unitScheduleId', width: 12 },
      { header: 'trainingLocationId', key: 'trainingLocationId', width: 14 },
      { header: 'plannedCount', key: 'plannedCount', width: 10 },
      { header: 'actualCount', key: 'actualCount', width: 10 },
    ];

    const scheduleLocations = await prisma.scheduleLocation.findMany({
      where: { schedule: { trainingPeriod: { unit: { lectureYear: year } } } },
    });

    scheduleLocations.forEach((sl) => {
      sheet.addRow({
        id: sl.id,
        unitScheduleId: sl.unitScheduleId,
        trainingLocationId: sl.trainingLocationId,
        plannedCount: sl.plannedCount,
        actualCount: sl.actualCount,
      });
    });

    this.styleHeader(sheet);
  }

  private async addAssignmentsSheet(workbook: ExcelJS.Workbook, year: number) {
    const sheet = workbook.addWorksheet('강사배정');
    sheet.columns = [
      { header: 'userId', key: 'userId', width: 8 },
      { header: 'unitScheduleId', key: 'unitScheduleId', width: 12 },
      { header: 'trainingLocationId', key: 'trainingLocationId', width: 14 },
      { header: 'classification', key: 'classification', width: 12 },
      { header: 'state', key: 'state', width: 10 },
      { header: 'role', key: 'role', width: 12 },
    ];

    const assignments = await prisma.instructorUnitAssignment.findMany({
      where: { UnitSchedule: { trainingPeriod: { unit: { lectureYear: year } } } },
    });

    assignments.forEach((a) => {
      sheet.addRow({
        userId: a.userId,
        unitScheduleId: a.unitScheduleId,
        trainingLocationId: a.trainingLocationId,
        classification: a.classification || '',
        state: a.state,
        role: a.role || '',
      });
    });

    this.styleHeader(sheet);
  }

  private async addDistancesSheet(workbook: ExcelJS.Workbook, year: number) {
    const sheet = workbook.addWorksheet('강사_부대_거리');
    sheet.columns = [
      { header: 'userId', key: 'userId', width: 8 },
      { header: 'unitId', key: 'unitId', width: 8 },
      { header: 'distance', key: 'distance', width: 10 },
      { header: 'duration', key: 'duration', width: 10 },
      { header: 'preDistance', key: 'preDistance', width: 10 },
      { header: 'preDuration', key: 'preDuration', width: 10 },
      { header: 'needsRecalc', key: 'needsRecalc', width: 10 },
    ];

    const distances = await prisma.instructorUnitDistance.findMany({
      where: { unit: { lectureYear: year } },
    });

    distances.forEach((d) => {
      sheet.addRow({
        userId: d.userId,
        unitId: d.unitId,
        distance: d.distance ? Number(d.distance) : '',
        duration: d.duration,
        preDistance: d.preDistance ? Number(d.preDistance) : '',
        preDuration: d.preDuration,
        needsRecalc: d.needsRecalc,
      });
    });

    this.styleHeader(sheet);
  }

  private async addAvailabilitiesSheet(workbook: ExcelJS.Workbook, year: number) {
    const sheet = workbook.addWorksheet('강사가능일');
    sheet.columns = [
      { header: 'id', key: 'id', width: 8 },
      { header: 'instructorId', key: 'instructorId', width: 12 },
      { header: 'availableOn', key: 'availableOn', width: 12 },
    ];

    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const availabilities = await prisma.instructorAvailability.findMany({
      where: { availableOn: { gte: startDate, lt: endDate } },
    });

    availabilities.forEach((a) => {
      sheet.addRow({
        id: a.id,
        instructorId: a.instructorId,
        availableOn: this.formatDate(a.availableOn),
      });
    });

    this.styleHeader(sheet);
  }

  private async addDispatchesSheet(workbook: ExcelJS.Workbook, year: number) {
    const sheet = workbook.addWorksheet('메시지');
    sheet.columns = [
      { header: 'id', key: 'id', width: 8 },
      { header: 'type', key: 'type', width: 12 },
      { header: 'title', key: 'title', width: 30 },
      { header: 'body', key: 'body', width: 50 },
      { header: 'status', key: 'status', width: 10 },
      { header: 'userId', key: 'userId', width: 8 },
      { header: 'createdAt', key: 'createdAt', width: 18 },
      { header: 'readAt', key: 'readAt', width: 18 },
    ];

    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const dispatches = await prisma.dispatch.findMany({
      where: { createdAt: { gte: startDate, lt: endDate } },
    });

    dispatches.forEach((d) => {
      sheet.addRow({
        id: d.id,
        type: d.type || '',
        title: d.title || '',
        body: d.body || '',
        status: d.status || '',
        userId: d.userId,
        createdAt: d.createdAt ? this.formatDateTime(d.createdAt) : '',
        readAt: d.readAt ? this.formatDateTime(d.readAt) : '',
      });
    });

    this.styleHeader(sheet);
  }

  private async addDispatchAssignmentsSheet(workbook: ExcelJS.Workbook, year: number) {
    const sheet = workbook.addWorksheet('메시지_배정');
    sheet.columns = [
      { header: 'dispatchId', key: 'dispatchId', width: 10 },
      { header: 'unitScheduleId', key: 'unitScheduleId', width: 12 },
      { header: 'userId', key: 'userId', width: 8 },
    ];

    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const dispatchAssignments = await prisma.dispatchAssignment.findMany({
      where: { dispatch: { createdAt: { gte: startDate, lt: endDate } } },
    });

    dispatchAssignments.forEach((da) => {
      sheet.addRow({
        dispatchId: da.dispatchId,
        unitScheduleId: da.unitScheduleId,
        userId: da.userId,
      });
    });

    this.styleHeader(sheet);
  }

  // ========== 분석용 시트 메서드 ==========

  private async addUnitsSummarySheet(workbook: ExcelJS.Workbook, year: number) {
    const sheet = workbook.addWorksheet('(분석) 부대요약');
    sheet.columns = [
      { header: '부대ID', key: 'id', width: 8 },
      { header: '강의년도', key: 'lectureYear', width: 10 },
      { header: '군구분', key: 'unitType', width: 10 },
      { header: '부대명', key: 'name', width: 25 },
      { header: '광역', key: 'wideArea', width: 10 },
      { header: '지역', key: 'region', width: 10 },
      { header: '주소', key: 'address', width: 40 },
      { header: '교육기간수', key: 'periodCount', width: 10 },
      { header: '일정수', key: 'scheduleCount', width: 8 },
      { header: '배정강사수', key: 'assignmentCount', width: 10 },
    ];

    const unitTypeMap: Record<string, string> = {
      Army: '육군',
      Navy: '해군',
      AirForce: '공군',
      Marines: '해병대',
      MND: '국직부대',
    };

    const units = await prisma.unit.findMany({
      where: { lectureYear: year },
      include: {
        trainingPeriods: {
          include: {
            schedules: {
              include: { _count: { select: { assignments: true } } },
            },
          },
        },
      },
    });

    units.forEach((u) => {
      const periodCount = u.trainingPeriods.length;
      const scheduleCount = u.trainingPeriods.reduce((acc, p) => acc + p.schedules.length, 0);
      const assignmentCount = u.trainingPeriods.reduce(
        (acc, p) => acc + p.schedules.reduce((acc2, s) => acc2 + s._count.assignments, 0),
        0,
      );

      sheet.addRow({
        id: u.id,
        lectureYear: u.lectureYear,
        unitType: u.unitType ? unitTypeMap[u.unitType] || u.unitType : '-',
        name: u.name || '-',
        wideArea: u.wideArea || '-',
        region: u.region || '-',
        address: u.addressDetail || '-',
        periodCount,
        scheduleCount,
        assignmentCount,
      });
    });

    this.styleHeader(sheet);
  }

  private async addAssignmentsSummarySheet(workbook: ExcelJS.Workbook, year: number) {
    const sheet = workbook.addWorksheet('(분석) 배정요약');
    sheet.columns = [
      { header: '교육일', key: 'date', width: 12 },
      { header: '부대명', key: 'unitName', width: 25 },
      { header: '강사명', key: 'instructorName', width: 12 },
      { header: '배정상태', key: 'state', width: 10 },
      { header: '역할', key: 'role', width: 12 },
      { header: '근무시간', key: 'workHours', width: 10 },
    ];

    const stateMap: Record<string, string> = {
      Pending: '대기',
      Accepted: '수락',
      Rejected: '거절',
      Canceled: '취소',
    };
    const roleMap: Record<string, string> = {
      Head: '총괄강사',
      Supervisor: '책임강사',
    };

    const assignments = await prisma.instructorUnitAssignment.findMany({
      where: { UnitSchedule: { trainingPeriod: { unit: { lectureYear: year } } } },
      include: {
        UnitSchedule: { include: { trainingPeriod: { include: { unit: true } } } },
        User: true,
      },
      orderBy: { UnitSchedule: { date: 'asc' } },
    });

    assignments.forEach((a) => {
      const period = a.UnitSchedule.trainingPeriod;
      const unit = period.unit;
      let workHours = 0;
      if (period.workStartTime && period.workEndTime) {
        const s = new Date(period.workStartTime);
        const e = new Date(period.workEndTime);
        let diff = e.getHours() * 60 + e.getMinutes() - (s.getHours() * 60 + s.getMinutes());
        if (diff < 0) diff += 24 * 60;
        workHours = diff / 60;
      }

      sheet.addRow({
        date: a.UnitSchedule.date ? this.formatDate(a.UnitSchedule.date) : '-',
        unitName: unit.name || '-',
        instructorName: a.User.name || '-',
        state: stateMap[a.state] || a.state,
        role: a.role ? roleMap[a.role] || a.role : '-',
        workHours: Math.round(workHours * 10) / 10,
      });
    });

    this.styleHeader(sheet);
  }

  private async addInstructorMonthlyStatsSheet(workbook: ExcelJS.Workbook, year: number) {
    const sheet = workbook.addWorksheet('(분석) 강사월별통계');
    sheet.columns = [
      { header: '강사ID', key: 'instructorId', width: 8 },
      { header: '강사명', key: 'name', width: 12 },
      { header: '연월', key: 'month', width: 10 },
      { header: '교육건수', key: 'count', width: 10 },
      { header: '근무시간', key: 'workHours', width: 10 },
      { header: '이동거리(km)', key: 'distance', width: 12 },
    ];

    const assignments = await prisma.instructorUnitAssignment.findMany({
      where: {
        state: 'Accepted',
        UnitSchedule: { trainingPeriod: { unit: { lectureYear: year } } },
      },
      include: {
        User: true,
        UnitSchedule: { include: { trainingPeriod: { include: { unit: true } } } },
      },
    });

    const allDistances = await prisma.instructorUnitDistance.findMany({
      where: { unit: { lectureYear: year } },
    });
    const distanceMap = new Map<string, number>();
    allDistances.forEach((d) => {
      const key = `${d.userId}-${d.unitId}`;
      distanceMap.set(
        key,
        d.distance
          ? typeof d.distance === 'object' && 'toNumber' in d.distance
            ? (d.distance as { toNumber: () => number }).toNumber()
            : Number(d.distance)
          : 0,
      );
    });

    const statsMap = new Map<
      string,
      {
        instructorId: number;
        name: string;
        month: string;
        count: number;
        workHours: number;
        distance: number;
        countedUnits: Set<number>;
      }
    >();

    for (const a of assignments) {
      if (!a.UnitSchedule?.date || !a.UnitSchedule?.trainingPeriod?.unit) continue;

      const d = new Date(a.UnitSchedule.date);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const key = `${a.userId}-${month}`;

      if (!statsMap.has(key)) {
        statsMap.set(key, {
          instructorId: a.userId,
          name: a.User.name || '-',
          month,
          count: 0,
          workHours: 0,
          distance: 0,
          countedUnits: new Set(),
        });
      }

      const stats = statsMap.get(key)!;
      stats.count++;

      const period = a.UnitSchedule.trainingPeriod;
      const unit = period.unit;
      if (period.workStartTime && period.workEndTime) {
        const s = new Date(period.workStartTime);
        const e = new Date(period.workEndTime);
        let diff = e.getHours() * 60 + e.getMinutes() - (s.getHours() * 60 + s.getMinutes());
        if (diff < 0) diff += 24 * 60;
        stats.workHours += diff / 60;
      }

      if (!stats.countedUnits.has(unit.id)) {
        const distKey = `${a.userId}-${unit.id}`;
        const dist = distanceMap.get(distKey) || 0;
        stats.distance += dist * 2;
        stats.countedUnits.add(unit.id);
      }
    }

    const sortedStats = Array.from(statsMap.values()).sort((a, b) => {
      if (a.instructorId !== b.instructorId) return a.instructorId - b.instructorId;
      return a.month.localeCompare(b.month);
    });

    sortedStats.forEach((s) => {
      sheet.addRow({
        instructorId: s.instructorId,
        name: s.name,
        month: s.month,
        count: s.count,
        workHours: Math.round(s.workHours * 10) / 10,
        distance: Math.round(s.distance),
      });
    });

    this.styleHeader(sheet);
  }

  private styleHeader(sheet: ExcelJS.Worksheet) {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.alignment = { horizontal: 'center' };
  }

  private formatDate(date: Date): string {
    return new Date(date).toISOString().split('T')[0];
  }

  private formatDateTime(date: Date): string {
    return new Date(date).toISOString().replace('T', ' ').slice(0, 19);
  }

  private formatTime(date: Date): string {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
    const limitMB = 500; // Supabase free tier
    const percentage = Math.round((usedMB / limitMB) * 100 * 10) / 10;

    return { usedBytes, usedMB, limitMB, percentage };
  }

  /**
   * 삭제 미리보기: 해당 연도에 삭제될 데이터 개수 반환
   * 기준: Unit.lectureYear === year
   */
  async getDeletePreview(year: number) {
    const currentYear = new Date().getFullYear();
    const startDateAvail = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDateAvail = new Date(`${year + 1}-01-01T00:00:00.000Z`);
    const startDateDispatch = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDateDispatch = new Date(`${year + 1}-01-01T00:00:00.000Z`);

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
      prisma.unit.count({ where: { lectureYear: year } }),
      prisma.trainingPeriod.count({ where: { unit: { lectureYear: year } } }),
      prisma.trainingLocation.count({ where: { trainingPeriod: { unit: { lectureYear: year } } } }),
      prisma.unitSchedule.count({ where: { trainingPeriod: { unit: { lectureYear: year } } } }),
      prisma.scheduleLocation.count({
        where: { schedule: { trainingPeriod: { unit: { lectureYear: year } } } },
      }),
      prisma.instructorUnitAssignment.count({
        where: { UnitSchedule: { trainingPeriod: { unit: { lectureYear: year } } } },
      }),
      prisma.instructorUnitDistance.count({ where: { unit: { lectureYear: year } } }),
      prisma.instructorAvailability.count({
        where: { availableOn: { gte: startDateAvail, lt: endDateAvail } },
      }),
      prisma.dispatch.count({
        where: { createdAt: { gte: startDateDispatch, lt: endDateDispatch } },
      }),
    ]);

    return {
      year,
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
   * Cascade 삭제 활용
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
        // DispatchAssignment는 Dispatch의 onDelete: Cascade로 자동 삭제됨
        const dispatches = await tx.dispatch.deleteMany({
          where: { createdAt: { gte: startDateDispatch, lt: endDateDispatch } },
        });

        // 3. 강사-부대 거리 삭제 (Unit과 연결됨, Unit 삭제 전에 먼저 삭제)
        const distances = await tx.instructorUnitDistance.deleteMany({
          where: { unit: { lectureYear: year } },
        });

        // 4. Unit 삭제 (Cascade로 TrainingPeriod, TrainingLocation, UnitSchedule,
        //    ScheduleLocation, InstructorUnitAssignment, DispatchAssignment 자동 삭제)
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
