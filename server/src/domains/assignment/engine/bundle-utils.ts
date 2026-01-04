// server/src/domains/assignment/engine/bundle-utils.ts
// Slack 기반 배정을 위한 Bundle 유틸리티

import {
  UnitData,
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
 * 두 날짜가 연속인지 확인 (하루 차이)
 */
function isConsecutive(date1: string, date2: string): boolean {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Math.abs(d1 - d2) === oneDayMs;
}

/**
 * 부대 데이터에서 연속 일정 묶음(Bundle) 생성
 * - 같은 부대의 연속된 날짜들을 하나의 묶음으로
 */
export function createBundles(units: UnitData[]): ScheduleBundle[] {
  const bundles: ScheduleBundle[] = [];

  for (const unit of units) {
    if (!unit.schedules || unit.schedules.length === 0) continue;

    // 날짜 순 정렬
    const sortedSchedules = [...unit.schedules].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    let currentBundle: ScheduleData[] = [sortedSchedules[0]];

    for (let i = 1; i < sortedSchedules.length; i++) {
      const prevDate = toDateString(sortedSchedules[i - 1].date);
      const currDate = toDateString(sortedSchedules[i].date);

      if (isConsecutive(prevDate, currDate)) {
        // 연속이면 현재 묶음에 추가
        currentBundle.push(sortedSchedules[i]);
      } else {
        // 연속 아니면 현재 묶음 저장 후 새 묶음 시작
        bundles.push(createBundleFromSchedules(unit, currentBundle));
        currentBundle = [sortedSchedules[i]];
      }
    }

    // 마지막 묶음 저장
    if (currentBundle.length > 0) {
      bundles.push(createBundleFromSchedules(unit, currentBundle));
    }
  }

  return bundles;
}

/**
 * 스케줄 배열로부터 Bundle 객체 생성
 */
function createBundleFromSchedules(unit: UnitData, schedules: ScheduleData[]): ScheduleBundle {
  const dates = schedules.map((s) => toDateString(s.date));
  const requiredPerDay = schedules[0]?.requiredCount ?? 2;

  return {
    bundleId: `${unit.id}_${dates[0]}`,
    unitId: unit.id,
    unitName: unit.name,
    region: unit.region,
    schedules,
    dates,
    requiredPerDay,
    totalRequired: requiredPerDay * schedules.length,
    trainingLocations: unit.trainingLocations,
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
