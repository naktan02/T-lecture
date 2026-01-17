// server/src/domains/assignment/engine/bundle-utils.ts
// Slack 기반 배정을 위한 Bundle 유틸리티
// 변경: TrainingPeriod 단위로 Bundle 생성 (날짜 연속성 대신)

import {
  UnitData,
  TrainingPeriodData,
  ScheduleBundle,
  BundleSlackInfo,
  InstructorCandidate,
  ScheduleData,
} from './assignment.types';

/**
 * 날짜를 'YYYY-MM-DD' 문자열로 변환
 */
function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * @deprecated TrainingPeriod 단위로 변경되어 더 이상 사용하지 않음
 * 두 날짜가 연속인지 확인 (하루 차이)
 */
function isConsecutive(date1: string, date2: string): boolean {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Math.abs(d1 - d2) === oneDayMs;
}

/**
 * TrainingPeriod 단위로 Bundle 생성
 * - 기존: 날짜 연속성 기반
 * - 변경: TrainingPeriod ID 기반 (excludedDates가 있어도 같은 Bundle)
 *
 * @param units 부대 데이터 (trainingPeriods 포함)
 * @returns ScheduleBundle 배열
 */
export function createBundles(units: UnitData[]): ScheduleBundle[] {
  const bundles: ScheduleBundle[] = [];

  for (const unit of units) {
    if (!unit.trainingPeriods || unit.trainingPeriods.length === 0) continue;

    for (const period of unit.trainingPeriods) {
      // isStaffLocked=true인 교육기간은 Bundle에서 제외
      if (period.isStaffLocked) continue;
      if (!period.schedules || period.schedules.length === 0) continue;

      const bundle = createBundleFromPeriod(period);
      if (bundle.schedules.length > 0) {
        bundles.push(bundle);
      }
    }
  }

  return bundles;
}

/**
 * TrainingPeriod로부터 Bundle 객체 생성
 */
function createBundleFromPeriod(period: TrainingPeriodData): ScheduleBundle {
  // 날짜 순 정렬
  const sortedSchedules = [...period.schedules].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const dates = sortedSchedules.map((s) => toDateString(s.date));

  // 필요 인원: 각 스케줄의 requiredCount 평균
  const totalRequired = sortedSchedules.reduce((sum, s) => sum + s.requiredCount, 0);
  const requiredPerDay =
    sortedSchedules.length > 0 ? Math.ceil(totalRequired / sortedSchedules.length) : 2;

  return {
    bundleId: `tp_${period.id}`, // TrainingPeriod ID 기반
    unitId: period.unitId,
    unitName: period.unitName,
    region: period.region,
    trainingPeriodId: period.id, // 핵심: TrainingPeriod ID
    isStaffLocked: period.isStaffLocked,
    excludedDates: period.excludedDates || [],
    schedules: sortedSchedules,
    dates,
    requiredPerDay,
    totalRequired,
    trainingLocations: period.locations,
  };
}

/**
 * @deprecated 하위 호환성을 위해 유지 (기존 방식)
 * 스케줄 배열로부터 Bundle 객체 생성
 */
function createBundleFromSchedules(
  unit: { id: number; name: string; region: string },
  schedules: ScheduleData[],
  trainingPeriodId: number = 0,
): ScheduleBundle {
  const dates = schedules.map((s) => toDateString(s.date));
  const requiredPerDay = schedules[0]?.requiredCount ?? 2;

  return {
    bundleId: `${unit.id}_${dates[0]}`,
    unitId: unit.id,
    unitName: unit.name,
    region: unit.region,
    trainingPeriodId, // 기본값 0 (레거시 호환)
    isStaffLocked: false,
    excludedDates: [],
    schedules,
    dates,
    requiredPerDay,
    totalRequired: requiredPerDay * schedules.length,
    trainingLocations: [],
  };
}

/**
 * 특정 묶음의 전체 날짜에 가능한 강사 ID 목록 반환
 */
export function getFullBundleCandidateIds(
  bundle: ScheduleBundle,
  candidates: InstructorCandidate[],
): number[] {
  return candidates
    .filter((c) => bundle.dates.every((d) => c.availableDates.includes(d)))
    .map((c) => c.userId);
}

/**
 * 특정 날짜에 가능한 강사 수 계산
 */
function countAvailableOnDate(date: string, candidates: InstructorCandidate[]): number {
  return candidates.filter((c) => c.availableDates.includes(date)).length;
}

/**
 * 날짜별 Slack 계산 (min_over_days)
 * Slack = 가능 인원 - 필요 인원
 */
export function calculateMinSlack(
  bundle: ScheduleBundle,
  candidates: InstructorCandidate[],
): number {
  let minSlack = Infinity;

  for (const date of bundle.dates) {
    const available = countAvailableOnDate(date, candidates);
    const slack = available - bundle.requiredPerDay;
    minSlack = Math.min(minSlack, slack);
  }

  return minSlack === Infinity ? 0 : minSlack;
}

/**
 * 겹치는 날짜 병목 페널티 계산
 * - 다른 묶음과 날짜가 겹치고, 해당 날짜의 slack이 낮으면 페널티 증가
 */
export function calculateOverlapPenalty(
  bundle: ScheduleBundle,
  allBundles: ScheduleBundle[],
  candidates: InstructorCandidate[],
): number {
  let penalty = 0;

  for (const date of bundle.dates) {
    // 이 날짜에 겹치는 다른 묶음 수
    const overlappingBundles = allBundles.filter(
      (b) => b.bundleId !== bundle.bundleId && b.dates.includes(date),
    );

    if (overlappingBundles.length > 0) {
      // 해당 날짜의 slack이 낮을수록 페널티 증가
      const available = countAvailableOnDate(date, candidates);
      const totalRequired =
        bundle.requiredPerDay + overlappingBundles.reduce((sum, b) => sum + b.requiredPerDay, 0);
      const dateSlack = available - totalRequired;

      // slack이 음수면 더 큰 페널티
      if (dateSlack < 0) {
        penalty += Math.abs(dateSlack) * 2;
      } else if (dateSlack < 2) {
        penalty += 1;
      }
    }
  }

  return penalty;
}

/**
 * 모든 묶음의 Slack 정보 계산 및 위험도 순 정렬
 * - riskScore 낮을수록 위험 → 먼저 처리
 */
export function calculateAndSortBundlesByRisk(
  bundles: ScheduleBundle[],
  candidates: InstructorCandidate[],
): BundleSlackInfo[] {
  const slackInfos: BundleSlackInfo[] = bundles.map((bundle) => {
    const fullBundleCandidateIds = getFullBundleCandidateIds(bundle, candidates);
    const minSlack = calculateMinSlack(bundle, candidates);
    const overlapPenalty = calculateOverlapPenalty(bundle, bundles, candidates);
    const riskScore = minSlack - overlapPenalty;

    return {
      bundle,
      fullBundleCandidateIds,
      minSlack,
      overlapPenalty,
      riskScore,
    };
  });

  // 위험도 순 정렬 (riskScore 오름차순 = 위험한 것 먼저)
  slackInfos.sort((a, b) => a.riskScore - b.riskScore);

  return slackInfos;
}

/**
 * 강사 희소도 계산 (가능한 슬롯 수)
 * - 적을수록 희소 → tie-breaker에서 우선
 */
export function calculateInstructorScarcity(
  candidate: InstructorCandidate,
  bundles: ScheduleBundle[],
): number {
  let totalCoverableSlots = 0;

  for (const bundle of bundles) {
    // 이 강사가 이 묶음의 전체 날짜에 가능한지
    if (bundle.dates.every((d) => candidate.availableDates.includes(d))) {
      totalCoverableSlots += bundle.requiredPerDay;
    } else {
      // 부분만 가능해도 카운트 (일부)
      const coverableDays = bundle.dates.filter((d) => candidate.availableDates.includes(d)).length;
      totalCoverableSlots += coverableDays * 0.3; // 부분 가능은 0.3배
    }
  }

  return totalCoverableSlots;
}
