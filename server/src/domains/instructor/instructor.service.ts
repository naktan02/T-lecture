// server/src/domains/instructor/instructor.service.ts
import instructorRepository from './instructor.repository';
import AppError from '../../common/errors/AppError';
import { PROMOTION_CRITERIA } from '../../common/constants/constants';
import { runExclusiveOperation } from '../../common/utils/operationLock';

interface AvailabilityMonthUpdate {
  year: number;
  month: number;
  dates: number[];
}

interface AvailabilityMonthReplacement {
  startDate: Date;
  endDateExclusive: Date;
  newDates: string[];
}

const getLastDayOfMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
const getMonthStartUtc = (year: number, month: number) => new Date(Date.UTC(year, month - 1, 1));
const getNextMonthStartUtc = (year: number, month: number) => new Date(Date.UTC(year, month, 1));
const toDateOnlyString = (date: Date) => date.toISOString().split('T')[0];

class InstructorService {
  // 근무 가능일 조회
  async getAvailabilities(instructorId: number, year: number, month: number) {
    const startDate = getMonthStartUtc(year, month);
    const endDateExclusive = getNextMonthStartUtc(year, month);

    const availabilities = await instructorRepository.findAvailabilities(
      instructorId,
      startDate,
      endDateExclusive,
    );

    // 클라이언트가 기대하는 형식으로 반환: { data: AvailabilityDate[] }
    const data = availabilities.map((item) => {
      return {
        date: toDateOnlyString(item.availableOn),
        isAvailable: true,
      };
    });

    return { data };
  }

  // 근무 가능일 수정
  async updateAvailabilities(
    instructorId: number,
    year: number,
    month: number,
    dates: number[], // day 숫자 배열 (1~31)
  ) {
    const normalizedInstructorId = Number(instructorId);
    const normalizedYear = Number(year);
    const normalizedMonth = Number(month);
    const [monthUpdate] = this.normalizeAvailabilityMonthUpdates([
      { year: normalizedYear, month: normalizedMonth, dates },
    ]);

    return await runExclusiveOperation(
      `instructor-availability:${normalizedInstructorId}`,
      async () => {
        const replacement = await this.buildAvailabilityMonthReplacement(
          normalizedInstructorId,
          monthUpdate.year,
          monthUpdate.month,
          monthUpdate.dates,
        );

        await instructorRepository.replaceAvailabilityMonths(normalizedInstructorId, [replacement]);

        return { message: '근무 가능일이 저장되었습니다.' };
      },
      {
        conflictMessage: '근무 가능일 저장이 이미 진행 중입니다. 잠시 후 다시 시도해주세요.',
      },
    );
  }

  async updateAvailabilitiesBulk(instructorId: number, months: AvailabilityMonthUpdate[]) {
    const normalizedInstructorId = Number(instructorId);
    const normalizedMonths = this.normalizeAvailabilityMonthUpdates(months);

    if (normalizedMonths.length === 0) {
      throw new AppError('저장할 근무 가능일 월 목록이 없습니다.', 400, 'VALIDATION_ERROR');
    }

    return await runExclusiveOperation(
      `instructor-availability:${normalizedInstructorId}`,
      async () => {
        const replacements: AvailabilityMonthReplacement[] = [];

        for (const monthUpdate of normalizedMonths) {
          replacements.push(
            await this.buildAvailabilityMonthReplacement(
              normalizedInstructorId,
              monthUpdate.year,
              monthUpdate.month,
              monthUpdate.dates,
            ),
          );
        }

        await instructorRepository.replaceAvailabilityMonths(normalizedInstructorId, replacements);

        return { message: '근무 가능일이 저장되었습니다.' };
      },
      {
        conflictMessage: '근무 가능일 저장이 이미 진행 중입니다. 잠시 후 다시 시도해주세요.',
      },
    );
  }

  private normalizeAvailabilityMonthUpdates(
    months: AvailabilityMonthUpdate[],
  ): AvailabilityMonthUpdate[] {
    if (!Array.isArray(months)) {
      throw new AppError('months는 배열이어야 합니다.', 400, 'VALIDATION_ERROR');
    }

    const byMonth = new Map<string, AvailabilityMonthUpdate>();

    months.forEach((item) => {
      const year = Number(item?.year);
      const month = Number(item?.month);
      const dates = item?.dates;
      const normalizedDates = Array.isArray(dates) ? dates.map(Number) : [];
      const lastDay =
        Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12
          ? getLastDayOfMonth(year, month)
          : 31;

      if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12 ||
        !Array.isArray(dates) ||
        normalizedDates.some((day) => !Number.isInteger(day) || day < 1 || day > lastDay)
      ) {
        throw new AppError('잘못된 근무 가능일 월 데이터입니다.', 400, 'VALIDATION_ERROR');
      }

      byMonth.set(`${year}-${month}`, {
        year,
        month,
        dates: [...new Set(normalizedDates)],
      });
    });

    return Array.from(byMonth.values());
  }

  private async buildAvailabilityMonthReplacement(
    instructorId: number,
    year: number,
    month: number,
    dates: number[],
  ): Promise<AvailabilityMonthReplacement> {
    const startDate = getMonthStartUtc(year, month);
    const endDateExclusive = getNextMonthStartUtc(year, month);

    // UTC 자정 기준 오늘 (과거 날짜 필터링용)
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    // 과거 날짜 필터링 (오늘 포함 이전 제외)
    const futureDates = dates.filter((day) => {
      const targetDateUTC = new Date(Date.UTC(year, month - 1, day));
      return targetDateUTC > todayUTC;
    });

    // day 숫자를 날짜 문자열로 변환 (로컬 시간대 유지)
    const newDatesStr = futureDates.map((day) => {
      const year_str = year.toString();
      const month_str = month.toString().padStart(2, '0');
      const day_str = day.toString().padStart(2, '0');
      return `${year_str}-${month_str}-${day_str}`;
    });

    // 해당 기간에 이미 배정된(Active) 날짜 조회
    const activeAssignmentDates = await instructorRepository.findActiveAssignmentsDate(
      instructorId,
      startDate,
      endDateExclusive,
    );

    // 배정된 날짜 Set 생성
    const assignedDatesSet = new Set(
      activeAssignmentDates.filter((d): d is Date => d !== null).map(toDateOnlyString),
    );

    // 배정된 날짜를 새 가능일에 자동 추가 (배정 확정된 날짜는 제외 불가)
    const newDates = [...new Set([...newDatesStr, ...Array.from(assignedDatesSet)])];

    return { startDate, endDateExclusive, newDates };
  }

  // 통계 조회
  async getInstructorStats(instructorId: number) {
    const [assignmentCount, rawAssignments, legacyStats] = await Promise.all([
      instructorRepository.countActiveAssignments(instructorId),
      instructorRepository.findAssignmentsForCalc(instructorId),
      instructorRepository.findLegacyStats(instructorId),
    ]);

    let totalMilliseconds = 0;

    rawAssignments.forEach((a) => {
      // NOTE: workStartTime/workEndTime는 이제 TrainingPeriod에 있음
      const trainingPeriod = a.UnitSchedule?.trainingPeriod;
      if (trainingPeriod?.workStartTime && trainingPeriod?.workEndTime) {
        totalMilliseconds +=
          new Date(trainingPeriod.workEndTime).getTime() -
          new Date(trainingPeriod.workStartTime).getTime();
      }
    });

    const lectureHours = Math.floor(totalMilliseconds / (1000 * 60 * 60));

    return {
      instructorId,
      assignmentCount,
      lectureHours,
      legacyPracticumCount: legacyStats?.legacyPracticumCount || 0,
      autoPromotionEnabled: legacyStats?.autoPromotionEnabled ?? true,
    };
  }

  // 강의 가능 과목(덕목) 수정
  async updateVirtues(instructorId: number, virtueIds: number[]) {
    await instructorRepository.updateVirtues(instructorId, [...new Set(virtueIds)]);

    return { message: '강의 가능 과목이 수정되었습니다.' };
  }

  // 승급 신청
  async requestPromotion(instructorId: number, desiredLevel: string) {
    const stats = await this.getInstructorStats(instructorId);

    const MIN_HOURS_FOR_PROMOTION = PROMOTION_CRITERIA.MIN_LECTURE_HOURS;

    if (stats.lectureHours < MIN_HOURS_FOR_PROMOTION) {
      throw new AppError(
        `승급 신청 자격이 부족합니다. (현재: ${stats.lectureHours}시간 / 필요: ${MIN_HOURS_FOR_PROMOTION}시간)`,
        400,
        'NOT_ELIGIBLE',
      );
    }

    return {
      message: '승급 신청이 성공적으로 접수되었습니다.',
      currentLevel: 'Assistant',
      requestedLevel: desiredLevel,
      qualificationMet: true,
      evaluatedAt: new Date(),
    };
  }
}

export default new InstructorService();

// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = new InstructorService();
