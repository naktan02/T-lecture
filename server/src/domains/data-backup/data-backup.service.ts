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
   */
  async generateExcel(options: ExportOptions): Promise<ExcelJS.Workbook> {
    const { year } = options;
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    logger.info(`[DataBackup] Generating Excel for year ${year}`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'T-LECTURE';
    workbook.created = new Date();

    // 1. 강사 통계 시트
    await this.addInstructorStatsSheet(workbook);

    // 2. 부대 시트
    await this.addUnitsSheet(workbook, startDate, endDate);

    // 3. 일정 시트
    await this.addSchedulesSheet(workbook, startDate, endDate);

    // 4. 교육장소 시트
    await this.addTrainingLocationsSheet(workbook, startDate, endDate);

    // 5. 배정 내역 시트
    await this.addAssignmentsSheet(workbook, startDate, endDate);

    // 6. 강사 가능일 시트
    await this.addAvailabilitiesSheet(workbook, startDate, endDate);

    // 7. 메시지 시트
    await this.addDispatchesSheet(workbook, startDate, endDate);

    logger.info(`[DataBackup] Excel generation completed for year ${year}`);
    return workbook;
  }

  private async addInstructorStatsSheet(workbook: ExcelJS.Workbook) {
    const sheet = workbook.addWorksheet('강사통계');
    sheet.columns = [
      { header: '강사ID', key: 'id', width: 10 },
      { header: '강사명', key: 'name', width: 15 },
      { header: '총근무시간', key: 'workHours', width: 12 },
      { header: '총이동거리(km)', key: 'distance', width: 15 },
      { header: '총근무일수', key: 'workDays', width: 12 },
      { header: '수락건수', key: 'accepted', width: 10 },
      { header: '총제안건수', key: 'total', width: 12 },
    ];

    const stats = await prisma.instructorStats.findMany({
      include: { instructor: { include: { user: true } } },
    });

    stats.forEach((s) => {
      sheet.addRow({
        id: s.instructorId,
        name: s.instructor.user.name || '-',
        workHours: s.totalWorkHours,
        distance: s.totalDistance,
        workDays: s.totalWorkDays,
        accepted: s.acceptedCount,
        total: s.totalAssignmentsCount,
      });
    });

    this.styleHeader(sheet);
  }

  private async addUnitsSheet(workbook: ExcelJS.Workbook, startDate: Date, endDate: Date) {
    const sheet = workbook.addWorksheet('부대');
    sheet.columns = [
      { header: '부대ID', key: 'id', width: 10 },
      { header: '군구분', key: 'type', width: 10 },
      { header: '부대명', key: 'name', width: 20 },
      { header: '광역', key: 'wideArea', width: 10 },
      { header: '지역', key: 'region', width: 10 },
      { header: '주소', key: 'address', width: 40 },
      { header: '교육시작일', key: 'startDate', width: 12 },
      { header: '교육종료일', key: 'endDate', width: 12 },
    ];

    const units = await prisma.unit.findMany({
      where: {
        educationEnd: { gte: startDate, lt: endDate },
      },
    });

    units.forEach((u) => {
      sheet.addRow({
        id: u.id,
        type: u.unitType || '-',
        name: u.name || '-',
        wideArea: u.wideArea || '-',
        region: u.region || '-',
        address: u.addressDetail || '-',
        startDate: u.educationStart ? new Date(u.educationStart).toISOString().split('T')[0] : '-',
        endDate: u.educationEnd ? new Date(u.educationEnd).toISOString().split('T')[0] : '-',
      });
    });

    this.styleHeader(sheet);
  }

  private async addSchedulesSheet(workbook: ExcelJS.Workbook, startDate: Date, endDate: Date) {
    const sheet = workbook.addWorksheet('일정');
    sheet.columns = [
      { header: '일정ID', key: 'id', width: 10 },
      { header: '부대명', key: 'unitName', width: 20 },
      { header: '교육일', key: 'date', width: 12 },
    ];

    const schedules = await prisma.unitSchedule.findMany({
      where: { date: { gte: startDate, lt: endDate } },
      include: { unit: true },
    });

    schedules.forEach((s) => {
      sheet.addRow({
        id: s.id,
        unitName: s.unit.name || '-',
        date: s.date ? new Date(s.date).toISOString().split('T')[0] : '-',
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
      { header: '장소ID', key: 'id', width: 10 },
      { header: '부대명', key: 'unitName', width: 20 },
      { header: '기존장소', key: 'original', width: 20 },
      { header: '변경장소', key: 'changed', width: 20 },
      { header: '계획인원', key: 'planned', width: 10 },
      { header: '참여인원', key: 'actual', width: 10 },
      { header: '특이사항', key: 'note', width: 30 },
    ];

    const locations = await prisma.trainingLocation.findMany({
      where: { unit: { educationEnd: { gte: startDate, lt: endDate } } },
      include: { unit: true },
    });

    locations.forEach((l) => {
      sheet.addRow({
        id: l.id,
        unitName: l.unit.name || '-',
        original: l.originalPlace || '-',
        changed: l.changedPlace || '-',
        planned: l.plannedCount || 0,
        actual: l.actualCount || 0,
        note: l.note || '-',
      });
    });

    this.styleHeader(sheet);
  }

  private async addAssignmentsSheet(workbook: ExcelJS.Workbook, startDate: Date, endDate: Date) {
    const sheet = workbook.addWorksheet('배정내역');
    sheet.columns = [
      { header: '일정ID', key: 'scheduleId', width: 10 },
      { header: '부대명', key: 'unitName', width: 20 },
      { header: '교육일', key: 'date', width: 12 },
      { header: '강사명', key: 'instructorName', width: 15 },
      { header: '배정상태', key: 'state', width: 10 },
      { header: '역할', key: 'role', width: 12 },
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
    });

    assignments.forEach((a) => {
      sheet.addRow({
        scheduleId: a.unitScheduleId,
        unitName: a.UnitSchedule.unit.name || '-',
        date: a.UnitSchedule.date ? new Date(a.UnitSchedule.date).toISOString().split('T')[0] : '-',
        instructorName: a.User.name || '-',
        state: stateMap[a.state] || a.state,
        role: a.role ? roleMap[a.role] || a.role : '-',
      });
    });

    this.styleHeader(sheet);
  }

  private async addAvailabilitiesSheet(workbook: ExcelJS.Workbook, startDate: Date, endDate: Date) {
    const sheet = workbook.addWorksheet('강사가능일');
    sheet.columns = [
      { header: '강사ID', key: 'instructorId', width: 10 },
      { header: '강사명', key: 'name', width: 15 },
      { header: '가능일', key: 'date', width: 12 },
    ];

    const availabilities = await prisma.instructorAvailability.findMany({
      where: { availableOn: { gte: startDate, lt: endDate } },
      include: { instructor: { include: { user: true } } },
    });

    availabilities.forEach((a) => {
      sheet.addRow({
        instructorId: a.instructorId,
        name: a.instructor.user.name || '-',
        date: new Date(a.availableOn).toISOString().split('T')[0],
      });
    });

    this.styleHeader(sheet);
  }

  private async addDispatchesSheet(workbook: ExcelJS.Workbook, startDate: Date, endDate: Date) {
    const sheet = workbook.addWorksheet('메시지');
    sheet.columns = [
      { header: '메시지ID', key: 'id', width: 10 },
      { header: '유형', key: 'type', width: 12 },
      { header: '제목', key: 'title', width: 30 },
      { header: '수신자', key: 'recipient', width: 15 },
      { header: '발송일시', key: 'createdAt', width: 18 },
      { header: '읽음일시', key: 'readAt', width: 18 },
    ];

    const typeMap: Record<string, string> = {
      Temporary: '임시배정',
      Confirmed: '확정배정',
    };

    const dispatches = await prisma.dispatch.findMany({
      where: { createdAt: { gte: startDate, lt: endDate } },
      include: { user: true },
    });

    dispatches.forEach((d) => {
      sheet.addRow({
        id: d.id,
        type: d.type ? typeMap[d.type] || d.type : '-',
        title: d.title || '-',
        recipient: d.user.name || '-',
        createdAt: d.createdAt
          ? new Date(d.createdAt).toISOString().replace('T', ' ').slice(0, 19)
          : '-',
        readAt: d.readAt ? new Date(d.readAt).toISOString().replace('T', ' ').slice(0, 19) : '-',
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
   */
  async deleteDataByYear(year: number) {
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    logger.info(`[DataBackup] Starting deletion for year ${year}`);

    // 트랜잭션으로 안전하게 삭제 (Cascade 설정으로 관련 데이터 자동 삭제)
    const result = await prisma.$transaction(async (tx) => {
      // 1. 강사 가능일 삭제
      const availabilities = await tx.instructorAvailability.deleteMany({
        where: { availableOn: { gte: startDate, lt: endDate } },
      });

      // 2. 메시지 삭제 (DispatchAssignment는 Cascade로 자동 삭제)
      const dispatches = await tx.dispatch.deleteMany({
        where: { createdAt: { gte: startDate, lt: endDate } },
      });

      // 3. 부대 삭제 (Schedule, TrainingLocation, Assignment는 Cascade로 자동 삭제)
      const units = await tx.unit.deleteMany({
        where: { educationEnd: { gte: startDate, lt: endDate } },
      });

      return {
        deletedUnits: units.count,
        deletedDispatches: dispatches.count,
        deletedAvailabilities: availabilities.count,
      };
    });

    logger.info(`[DataBackup] Deletion completed for year ${year}: ${JSON.stringify(result)}`);
    return result;
  }
}

export default new DataBackupService();
