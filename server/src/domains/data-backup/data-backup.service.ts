// server/src/domains/data-backup/data-backup.service.ts
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
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    logger.info(`[DataBackup] Generating Excel for year ${year}`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'T-LECTURE';
    workbook.created = new Date();

    // ========== 백업용 시트 (전체 필드) ==========
    // 1. 부대 시트
    await this.addUnitsSheet(workbook, startDate, endDate);

    // 2. 일정 시트
    await this.addSchedulesSheet(workbook, startDate, endDate);

    // 3. 교육장소 시트
    await this.addTrainingLocationsSheet(workbook, startDate, endDate);

    // 4. 배정 내역 시트
    await this.addAssignmentsSheet(workbook, startDate, endDate);

    // 5. 강사 가능일 시트
    await this.addAvailabilitiesSheet(workbook, startDate, endDate);

    // 6. 메시지 시트
    await this.addDispatchesSheet(workbook, startDate, endDate);

    // 7. 메시지-배정 연결 시트
    await this.addDispatchAssignmentsSheet(workbook, startDate, endDate);

    // ========== 분석용 시트 (사람이 읽기 쉬운 형태) ==========
    // 8. 부대 요약 (분석용)
    await this.addUnitsSummarySheet(workbook, startDate, endDate);

    // 9. 배정 요약 (분석용)
    await this.addAssignmentsSummarySheet(workbook, startDate, endDate);

    // 10. 강사 월별 통계 (분석용)
    await this.addInstructorMonthlyStatsSheet(workbook, startDate, endDate);

    logger.info(`[DataBackup] Excel generation completed for year ${year}`);
    return workbook;
  }

  private async addUnitsSheet(workbook: ExcelJS.Workbook, startDate: Date, endDate: Date) {
    const sheet = workbook.addWorksheet('부대');
    sheet.columns = [
      { header: 'id', key: 'id', width: 8 },
      { header: 'unitType', key: 'unitType', width: 10 },
      { header: 'name', key: 'name', width: 25 },
      { header: 'wideArea', key: 'wideArea', width: 10 },
      { header: 'region', key: 'region', width: 10 },
      { header: 'addressDetail', key: 'addressDetail', width: 40 },
      { header: 'detailAddress', key: 'detailAddress', width: 40 },
      { header: 'lat', key: 'lat', width: 12 },
      { header: 'lng', key: 'lng', width: 12 },
      { header: 'educationStart', key: 'educationStart', width: 15 },
      { header: 'educationEnd', key: 'educationEnd', width: 15 },
      { header: 'workStartTime', key: 'workStartTime', width: 15 },
      { header: 'workEndTime', key: 'workEndTime', width: 15 },
      { header: 'lunchStartTime', key: 'lunchStartTime', width: 15 },
      { header: 'lunchEndTime', key: 'lunchEndTime', width: 15 },
      { header: 'officerName', key: 'officerName', width: 12 },
      { header: 'officerPhone', key: 'officerPhone', width: 15 },
      { header: 'officerEmail', key: 'officerEmail', width: 25 },
      { header: 'isStaffLocked', key: 'isStaffLocked', width: 12 },
      { header: 'excludedDates', key: 'excludedDates', width: 30 },
    ];

    const units = await prisma.unit.findMany({
      where: { educationEnd: { gte: startDate, lt: endDate } },
    });

    units.forEach((u) => {
      sheet.addRow({
        id: u.id,
        unitType: u.unitType || '',
        name: u.name || '',
        wideArea: u.wideArea || '',
        region: u.region || '',
        addressDetail: u.addressDetail || '',
        detailAddress: u.detailAddress || '',
        lat: u.lat,
        lng: u.lng,
        educationStart: u.educationStart ? this.formatDateTime(u.educationStart) : '',
        educationEnd: u.educationEnd ? this.formatDateTime(u.educationEnd) : '',
        workStartTime: u.workStartTime ? this.formatTime(u.workStartTime) : '',
        workEndTime: u.workEndTime ? this.formatTime(u.workEndTime) : '',
        lunchStartTime: u.lunchStartTime ? this.formatTime(u.lunchStartTime) : '',
        lunchEndTime: u.lunchEndTime ? this.formatTime(u.lunchEndTime) : '',
        officerName: u.officerName || '',
        officerPhone: u.officerPhone || '',
        officerEmail: u.officerEmail || '',
        isStaffLocked: u.isStaffLocked,
        excludedDates: u.excludedDates ? JSON.stringify(u.excludedDates) : '',
      });
    });

    this.styleHeader(sheet);
  }

  private async addSchedulesSheet(workbook: ExcelJS.Workbook, startDate: Date, endDate: Date) {
    const sheet = workbook.addWorksheet('부대일정');
    sheet.columns = [
      { header: 'id', key: 'id', width: 8 },
      { header: 'unitId', key: 'unitId', width: 8 },
      { header: 'date', key: 'date', width: 12 },
    ];

    const schedules = await prisma.unitSchedule.findMany({
      where: { date: { gte: startDate, lt: endDate } },
    });

    schedules.forEach((s) => {
      sheet.addRow({
        id: s.id,
        unitId: s.unitId,
        date: s.date ? this.formatDate(s.date) : '',
      });
    });

    this.styleHeader(sheet);
  }

  private async addTrainingLocationsSheet(
    workbook: ExcelJS.Workbook,
    startDate: Date,
    endDate: Date,
  ) {
    const sheet = workbook.addWorksheet('교육장소');
    sheet.columns = [
      { header: 'id', key: 'id', width: 8 },
      { header: 'unitId', key: 'unitId', width: 8 },
      { header: 'originalPlace', key: 'originalPlace', width: 20 },
      { header: 'changedPlace', key: 'changedPlace', width: 20 },
      { header: 'hasInstructorLounge', key: 'hasInstructorLounge', width: 15 },
      { header: 'hasWomenRestroom', key: 'hasWomenRestroom', width: 15 },
      { header: 'hasCateredMeals', key: 'hasCateredMeals', width: 12 },
      { header: 'hasHallLodging', key: 'hasHallLodging', width: 12 },
      { header: 'allowsPhoneBeforeAfter', key: 'allowsPhoneBeforeAfter', width: 18 },
      { header: 'plannedCount', key: 'plannedCount', width: 10 },
      { header: 'actualCount', key: 'actualCount', width: 10 },
      { header: 'note', key: 'note', width: 30 },
    ];

    const locations = await prisma.trainingLocation.findMany({
      where: { unit: { educationEnd: { gte: startDate, lt: endDate } } },
    });

    locations.forEach((l) => {
      sheet.addRow({
        id: l.id,
        unitId: l.unitId,
        originalPlace: l.originalPlace || '',
        changedPlace: l.changedPlace || '',
        hasInstructorLounge: l.hasInstructorLounge,
        hasWomenRestroom: l.hasWomenRestroom,
        hasCateredMeals: l.hasCateredMeals,
        hasHallLodging: l.hasHallLodging,
        allowsPhoneBeforeAfter: l.allowsPhoneBeforeAfter,
        plannedCount: l.plannedCount,
        actualCount: l.actualCount,
        note: l.note || '',
      });
    });

    this.styleHeader(sheet);
  }

  private async addAssignmentsSheet(workbook: ExcelJS.Workbook, startDate: Date, endDate: Date) {
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
      where: { UnitSchedule: { date: { gte: startDate, lt: endDate } } },
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

  private async addAvailabilitiesSheet(workbook: ExcelJS.Workbook, startDate: Date, endDate: Date) {
    const sheet = workbook.addWorksheet('강사가능일');
    sheet.columns = [
      { header: 'id', key: 'id', width: 8 },
      { header: 'instructorId', key: 'instructorId', width: 12 },
      { header: 'availableOn', key: 'availableOn', width: 12 },
    ];

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

  private async addDispatchesSheet(workbook: ExcelJS.Workbook, startDate: Date, endDate: Date) {
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

  private async addDispatchAssignmentsSheet(
    workbook: ExcelJS.Workbook,
    startDate: Date,
    endDate: Date,
  ) {
    const sheet = workbook.addWorksheet('메시지_배정');
    sheet.columns = [
      { header: 'dispatchId', key: 'dispatchId', width: 10 },
      { header: 'unitScheduleId', key: 'unitScheduleId', width: 12 },
      { header: 'userId', key: 'userId', width: 8 },
    ];

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

  private async addUnitsSummarySheet(workbook: ExcelJS.Workbook, startDate: Date, endDate: Date) {
    const sheet = workbook.addWorksheet('(분석) 부대요약');
    sheet.columns = [
      { header: '부대ID', key: 'id', width: 8 },
      { header: '군구분', key: 'unitType', width: 10 },
      { header: '부대명', key: 'name', width: 25 },
      { header: '광역', key: 'wideArea', width: 10 },
      { header: '지역', key: 'region', width: 10 },
      { header: '주소', key: 'address', width: 40 },
      { header: '교육시작일', key: 'educationStart', width: 12 },
      { header: '교육종료일', key: 'educationEnd', width: 12 },
      { header: '근무시간', key: 'workTime', width: 15 },
      { header: '담당간부', key: 'officer', width: 20 },
      { header: '일정수', key: 'scheduleCount', width: 8 },
    ];

    const unitTypeMap: Record<string, string> = {
      Army: '육군',
      Navy: '해군',
      AirForce: '공군',
      Marines: '해병대',
      MND: '국직부대',
    };

    const units = await prisma.unit.findMany({
      where: { educationEnd: { gte: startDate, lt: endDate } },
      include: { _count: { select: { schedules: true } } },
    });

    units.forEach((u) => {
      sheet.addRow({
        id: u.id,
        unitType: u.unitType ? unitTypeMap[u.unitType] || u.unitType : '-',
        name: u.name || '-',
        wideArea: u.wideArea || '-',
        region: u.region || '-',
        address: u.addressDetail || '-',
        educationStart: u.educationStart ? this.formatDate(u.educationStart) : '-',
        educationEnd: u.educationEnd ? this.formatDate(u.educationEnd) : '-',
        workTime:
          u.workStartTime && u.workEndTime
            ? `${this.formatTime(u.workStartTime)}~${this.formatTime(u.workEndTime)}`
            : '-',
        officer: u.officerName ? `${u.officerName} (${u.officerPhone || ''})` : '-',
        scheduleCount: u._count.schedules,
      });
    });

    this.styleHeader(sheet);
  }

  private async addAssignmentsSummarySheet(
    workbook: ExcelJS.Workbook,
    startDate: Date,
    endDate: Date,
  ) {
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
      where: { UnitSchedule: { date: { gte: startDate, lt: endDate } } },
      include: { UnitSchedule: { include: { unit: true } }, User: true },
      orderBy: { UnitSchedule: { date: 'asc' } },
    });

    assignments.forEach((a) => {
      const unit = a.UnitSchedule.unit;
      let workHours = 0;
      if (unit.workStartTime && unit.workEndTime) {
        const s = new Date(unit.workStartTime);
        const e = new Date(unit.workEndTime);
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

  private async addInstructorMonthlyStatsSheet(
    workbook: ExcelJS.Workbook,
    startDate: Date,
    endDate: Date,
  ) {
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
        UnitSchedule: { date: { gte: startDate, lt: endDate } },
      },
      include: { User: true, UnitSchedule: { include: { unit: true } } },
    });

    const allDistances = await prisma.instructorUnitDistance.findMany();
    const distanceMap = new Map<string, number>();
    allDistances.forEach((d) => {
      const key = `${d.userId}-${d.unitId}`;
      distanceMap.set(
        key,
        d.distance
          ? typeof d.distance === 'object' && 'toNumber' in d.distance
            ? d.distance.toNumber()
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
      if (!a.UnitSchedule?.date || !a.UnitSchedule?.unit) continue;

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

      const unit = a.UnitSchedule.unit;
      if (unit.workStartTime && unit.workEndTime) {
        const s = new Date(unit.workStartTime);
        const e = new Date(unit.workEndTime);
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
   */
  async getDeletePreview(year: number) {
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const [units, schedules, assignments, dispatches, availabilities] = await Promise.all([
      prisma.unit.count({ where: { educationEnd: { gte: startDate, lt: endDate } } }),
      prisma.unitSchedule.count({ where: { date: { gte: startDate, lt: endDate } } }),
      prisma.instructorUnitAssignment.count({
        where: { UnitSchedule: { date: { gte: startDate, lt: endDate } } },
      }),
      prisma.dispatch.count({ where: { createdAt: { gte: startDate, lt: endDate } } }),
      prisma.instructorAvailability.count({
        where: { availableOn: { gte: startDate, lt: endDate } },
      }),
    ]);

    return { year, units, schedules, assignments, dispatches, availabilities };
  }

  /**
   * 해당 연도 데이터 삭제
   * 삭제 기준: UnitSchedule.date가 해당 연도인 데이터
   */
  async deleteDataByYear(year: number) {
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    logger.info(`[DataBackup] Starting deletion for year ${year}`);

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. 해당 연도 스케줄 ID 조회
        const scheduleIds = await tx.unitSchedule.findMany({
          where: { date: { gte: startDate, lt: endDate } },
          select: { id: true },
        });
        const scheduleIdList = scheduleIds.map((s) => s.id);

        // 2. DispatchAssignment 삭제 (스케줄 기준)
        const dispatchAssignments = await tx.dispatchAssignment.deleteMany({
          where: { unitScheduleId: { in: scheduleIdList } },
        });

        // 3. InstructorUnitAssignment 삭제 (스케줄 기준)
        const assignments = await tx.instructorUnitAssignment.deleteMany({
          where: { unitScheduleId: { in: scheduleIdList } },
        });

        // 4. 해당 연도 스케줄 삭제
        const schedules = await tx.unitSchedule.deleteMany({
          where: { id: { in: scheduleIdList } },
        });

        // 5. 강사 가능일 삭제 (날짜 기준)
        const availabilities = await tx.instructorAvailability.deleteMany({
          where: { availableOn: { gte: startDate, lt: endDate } },
        });

        // 6. 메시지 삭제 (생성일 기준)
        const dispatches = await tx.dispatch.deleteMany({
          where: { createdAt: { gte: startDate, lt: endDate } },
        });

        // 7. 스케줄이 모두 삭제된 부대 정리 (옵션 - 스케줄 없는 부대만 삭제)
        // 주의: educationEnd가 해당 연도인 부대 중, 남아있는 스케줄이 없는 부대만 삭제
        const orphanedUnits = await tx.unit.findMany({
          where: {
            educationEnd: { gte: startDate, lt: endDate },
            schedules: { none: {} },
          },
          select: { id: true },
        });

        let deletedUnits = 0;
        if (orphanedUnits.length > 0) {
          // TrainingLocation은 cascade 삭제됨
          const unitResult = await tx.unit.deleteMany({
            where: { id: { in: orphanedUnits.map((u) => u.id) } },
          });
          deletedUnits = unitResult.count;
        }

        return {
          deletedSchedules: schedules.count,
          deletedAssignments: assignments.count,
          deletedDispatchAssignments: dispatchAssignments.count,
          deletedDispatches: dispatches.count,
          deletedAvailabilities: availabilities.count,
          deletedUnits,
        };
      });

      logger.info(`[DataBackup] Deletion completed for year ${year}: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      logger.error(`[DataBackup] Deletion failed for year ${year}: ${error}`);
      throw error;
    }
  }
}

export default new DataBackupService();
