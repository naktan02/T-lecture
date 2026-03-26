// server/src/domains/assignment/engine/assignment.engine.ts
// 배정 알고리즘 메인 엔진

import {
  AssignmentFilter,
  AssignmentScorer,
  PostProcessor,
  AssignmentContext,
  InstructorCandidate,
  UnitData,
  AssignmentResult,
  EngineResult,
  AssignmentData,
  AssignmentConfig,
  ScoreBreakdown,
  DebugScheduleInfo,
  DebugCandidateInfo,
} from './assignment.types';
import { allFilters } from './filters';
import { allScorers } from './scorers';
import { allPostProcessors } from './post-processors';
import { createBundles, calculateAndSortBundlesByRisk } from './bundle-utils';
import logger from '../../../config/logger';
import DEBUG from '../../../config/debug';

// =========================================
// Deterministic tie-breaker utilities
// - 목적: "점수 동일" 시 입력 배열 순서로 인해 앞사람부터 뽑히는 현상을 제거
// - 요구: 같은 입력이면 같은 결과 (운영/감사 대응)
// =========================================

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicRand01(key: string): number {
  const seed = fnv1a32(key);
  return mulberry32(seed)();
}

function getMonthlyAvailCountByMonthStrings(availableDates: string[], targetMonth: string): number {
  if (!targetMonth) return 0;
  let cnt = 0;
  for (const d of availableDates || []) {
    if (d.startsWith(targetMonth)) cnt++;
  }
  return cnt;
}

function toDateString(date: Date): string {
  return new Date(date).toISOString().split('T')[0];
}

interface ScheduleWithUnit {
  unit: UnitData;
  schedule: { id: number; date: Date; requiredCount: number; isBlocked?: boolean };
  bundleRisk: number;
  trainingPeriodId: number;
  trainingPeriodDates: string[];
  periodSlack: number;
}

interface RankedCandidate {
  candidate: InstructorCandidate;
  score: number;
  breakdown: ScoreBreakdown[];
  tieRand: number;
  monthlyAvailCount: number;
}

interface CandidateCoverageMeta {
  candidate: InstructorCandidate;
  aggregateScore: number;
  monthlyAvailCount: number;
  tieRand: number;
  coverableMissingScheduleIds: number[];
  coverableOpenScheduleIds: number[];
  scoreByScheduleId: Map<number, number>;
  existingPeriodAssignmentsCount: number;
}

interface FullCoverCandidateMeta {
  candidate: InstructorCandidate;
  aggregateScore: number;
  monthlyAvailCount: number;
  tieRand: number;
  scoreByScheduleId: Map<number, number>;
  existingPeriodAssignmentsCount: number;
}

export class AssignmentEngine {
  private filters: AssignmentFilter[] = [];
  private scorers: AssignmentScorer[] = [];
  private postProcessors: PostProcessor[] = [];
  private weights: Record<string, number> = {};
  private config: AssignmentConfig;

  constructor(config?: Partial<AssignmentConfig>) {
    this.config = {
      traineesPerInstructor: 36,
      rejectionPenaltyMonths: 6,
      fairnessLookbackMonths: 3,
      scorerWeights: {},
      internMaxDistanceKm: 50,
      subMaxDistanceKm: null,
      ...config,
    };

    this.filters = [...allFilters];
    this.scorers = [...allScorers];
    this.postProcessors = [...allPostProcessors];

    for (const scorer of this.scorers) {
      this.weights[scorer.id] = scorer.defaultWeight;
    }

    if (config?.scorerWeights) {
      Object.assign(this.weights, config.scorerWeights);
    }
  }

  registerFilter(filter: AssignmentFilter): void {
    this.filters.push(filter);
  }

  registerScorer(scorer: AssignmentScorer): void {
    this.scorers.push(scorer);
    this.weights[scorer.id] = scorer.defaultWeight;
  }

  registerPostProcessor(processor: PostProcessor): void {
    this.postProcessors.push(processor);
  }

  setWeights(weights: Record<string, number>): void {
    Object.assign(this.weights, weights);
  }

  execute(
    units: UnitData[],
    candidates: InstructorCandidate[],
    options?: {
      initialAssignments?: AssignmentData[];
      blockedInstructorIdsBySchedule?: Map<number, Set<number>>;
      debugTopK?: number;
      instructorDistances?: Map<string, number>;
    },
  ): EngineResult {
    const assignments: AssignmentResult[] = [];
    const currentAssignments: AssignmentData[] = [...(options?.initialAssignments ?? [])];
    const debugSchedules: DebugScheduleInfo[] = [];
    const debugTopK = options?.debugTopK ?? 0;

    const avgAssignmentCount =
      candidates.reduce((sum, c) => sum + c.recentAssignmentCount, 0) / candidates.length || 1;
    const instructorDistances = options?.instructorDistances ?? new Map<string, number>();
    const activeTeamCount =
      new Set(candidates.map((c) => c.teamId).filter((teamId): teamId is number => teamId !== null))
        .size || 1;

    const bundles = createBundles(units);
    const sortedSlackInfos = calculateAndSortBundlesByRisk(bundles, candidates);

    if (DEBUG.ASSIGNMENT) {
      logger.debug(`[Slack 정렬] 총 ${bundles.length}개 번들 생성, 위험순 정렬 완료`);
      for (const info of sortedSlackInfos.slice(0, 5)) {
        logger.debug(
          `  - ${info.bundle.unitName} [${info.bundle.dates.join(', ')}]: ` +
            `minSlack=${info.minSlack}, overlap=${info.overlapPenalty}, risk=${info.riskScore}`,
        );
      }
    }

    const remainingSlotsByInstructor = new Map<number, number>();
    let totalRemainingSlots = 0;
    for (const info of sortedSlackInfos) {
      for (const candidateId of info.fullBundleCandidateIds) {
        const current = remainingSlotsByInstructor.get(candidateId) ?? 0;
        remainingSlotsByInstructor.set(candidateId, current + info.bundle.requiredPerDay);
        totalRemainingSlots += info.bundle.requiredPerDay;
      }
    }

    const allSchedules: ScheduleWithUnit[] = [];
    const periodRiskMap = new Map<number, number>();
    const periodSlackMap = new Map<number, number>();
    const periodStartDateMap = new Map<number, number>();
    const periodExistingAssignmentsCountMap = new Map<number, number>();
    const scheduleToUnitIdMap = new Map<number, number>();

    for (const info of sortedSlackInfos) {
      const unit = units.find((u) => u.id === info.bundle.unitId);
      if (!unit) continue;

      if (!periodRiskMap.has(info.bundle.trainingPeriodId)) {
        periodRiskMap.set(info.bundle.trainingPeriodId, info.riskScore);
      }
      if (!periodSlackMap.has(info.bundle.trainingPeriodId)) {
        periodSlackMap.set(info.bundle.trainingPeriodId, Math.max(0, info.minSlack));
      }
      if (
        !periodStartDateMap.has(info.bundle.trainingPeriodId) &&
        info.bundle.schedules.length > 0
      ) {
        periodStartDateMap.set(
          info.bundle.trainingPeriodId,
          new Date(info.bundle.schedules[0].date).getTime(),
        );
      }
      if (!periodExistingAssignmentsCountMap.has(info.bundle.trainingPeriodId)) {
        periodExistingAssignmentsCountMap.set(
          info.bundle.trainingPeriodId,
          currentAssignments.filter(
            (assignment) => assignment.trainingPeriodId === info.bundle.trainingPeriodId,
          ).length,
        );
      }

      for (const schedule of info.bundle.schedules) {
        allSchedules.push({
          unit,
          schedule,
          bundleRisk: info.riskScore,
          trainingPeriodId: info.bundle.trainingPeriodId,
          trainingPeriodDates: info.bundle.dates,
          periodSlack: Math.max(0, info.minSlack),
        });
        scheduleToUnitIdMap.set(schedule.id, unit.id);
      }
    }

    allSchedules.sort((a, b) => {
      const aExistingCount = periodExistingAssignmentsCountMap.get(a.trainingPeriodId) ?? 0;
      const bExistingCount = periodExistingAssignmentsCountMap.get(b.trainingPeriodId) ?? 0;
      if (aExistingCount !== bExistingCount) return bExistingCount - aExistingCount;

      const aRisk = periodRiskMap.get(a.trainingPeriodId) ?? 0;
      const bRisk = periodRiskMap.get(b.trainingPeriodId) ?? 0;
      const aStart = periodStartDateMap.get(a.trainingPeriodId) ?? 0;
      const bStart = periodStartDateMap.get(b.trainingPeriodId) ?? 0;
      if (aStart !== bStart) return aStart - bStart;
      if (aRisk !== bRisk) return aRisk - bRisk;
      if (a.trainingPeriodId !== b.trainingPeriodId) return a.trainingPeriodId - b.trainingPeriodId;
      return new Date(a.schedule.date).getTime() - new Date(b.schedule.date).getTime();
    });

    const orderedPeriodIds: number[] = [];
    const schedulesByPeriodId = new Map<number, ScheduleWithUnit[]>();
    const remainingRequiredByScheduleId = new Map<number, number>();
    const debugSelectedByScheduleId = new Map<
      number,
      Array<{ userId: number; name: string; totalScore: number }>
    >();
    const debugTopCandidatesByScheduleId = new Map<number, DebugCandidateInfo[]>();
    const monthlyAvailabilityCache = new Map<
      string,
      { byInstructorId: Map<number, number>; maxMonthlyAvailCount: number }
    >();

    for (const scheduleInfo of allSchedules) {
      if (!schedulesByPeriodId.has(scheduleInfo.trainingPeriodId)) {
        schedulesByPeriodId.set(scheduleInfo.trainingPeriodId, []);
        orderedPeriodIds.push(scheduleInfo.trainingPeriodId);
      }
      schedulesByPeriodId.get(scheduleInfo.trainingPeriodId)!.push(scheduleInfo);
      remainingRequiredByScheduleId.set(
        scheduleInfo.schedule.id,
        scheduleInfo.schedule.requiredCount,
      );
    }

    const getMonthlyAvailabilityStats = (targetMonth: string) => {
      let cached = monthlyAvailabilityCache.get(targetMonth);
      if (cached) return cached;

      const byInstructorId = new Map<number, number>();
      let maxMonthlyAvailCount = 1;
      for (const candidate of candidates) {
        const count = getMonthlyAvailCountByMonthStrings(candidate.availableDates, targetMonth);
        byInstructorId.set(candidate.userId, count);
        if (count > maxMonthlyAvailCount) maxMonthlyAvailCount = count;
      }

      cached = { byInstructorId, maxMonthlyAvailCount };
      monthlyAvailabilityCache.set(targetMonth, cached);
      return cached;
    };

    const buildContext = (scheduleInfo: ScheduleWithUnit): AssignmentContext => {
      const targetMonth = toDateString(scheduleInfo.schedule.date).slice(0, 7);
      const { maxMonthlyAvailCount } = getMonthlyAvailabilityStats(targetMonth);

      return {
        targetMonth,
        currentScheduleId: scheduleInfo.schedule.id,
        currentScheduleDate: toDateString(scheduleInfo.schedule.date),
        currentUnitId: scheduleInfo.unit.id,
        currentTrainingPeriodId: scheduleInfo.trainingPeriodId,
        currentTrainingPeriodDates: scheduleInfo.trainingPeriodDates,
        currentUnitRegion: scheduleInfo.unit.region,
        currentAssignments: [...currentAssignments],
        instructorDistances,
        config: this.config,
        maxMonthlyAvailCount,
        avgAssignmentCount,
        blockedInstructorIdsBySchedule: options?.blockedInstructorIdsBySchedule,
        remainingSlotsByInstructor,
        totalRemainingSlots,
        activeTeamCount,
        currentPeriodSlack:
          periodSlackMap.get(scheduleInfo.trainingPeriodId) ?? scheduleInfo.periodSlack,
        currentScheduleRemainingCount:
          remainingRequiredByScheduleId.get(scheduleInfo.schedule.id) ?? 0,
      };
    };

    const passesFilters = (
      candidate: InstructorCandidate,
      context: AssignmentContext,
      requireMain = false,
    ): boolean => {
      if (requireMain && candidate.category !== 'Main') return false;
      return this.filters.every((filter) => filter.check(candidate, context));
    };

    const rankCandidatesForSchedule = (
      scheduleInfo: ScheduleWithUnit,
      candidatePool: InstructorCandidate[],
      requireMain = false,
    ): RankedCandidate[] => {
      const context = buildContext(scheduleInfo);
      const { byInstructorId } = getMonthlyAvailabilityStats(context.targetMonth);
      const filtered = candidatePool.filter((candidate) =>
        passesFilters(candidate, context, requireMain),
      );

      const ranked = filtered.map((candidate) => {
        const { total, breakdown } = this.calculateScoreWithBreakdown(candidate, context);
        const tieKey = `${context.currentScheduleId}|${context.targetMonth}|${candidate.userId}`;
        return {
          candidate,
          score: total,
          breakdown,
          tieRand: deterministicRand01(tieKey),
          monthlyAvailCount: byInstructorId.get(candidate.userId) ?? 0,
        };
      });

      const EPS = 1e-9;
      ranked.sort((a, b) => {
        const scoreDiff = b.score - a.score;
        if (Math.abs(scoreDiff) > EPS) return scoreDiff;

        const availDiff = (b.monthlyAvailCount ?? 0) - (a.monthlyAvailCount ?? 0);
        if (availDiff !== 0) return availDiff;

        const completedDiff =
          (a.candidate.recentConfirmedCompletedCount ?? 0) -
          (b.candidate.recentConfirmedCompletedCount ?? 0);
        if (completedDiff !== 0) return completedDiff;

        const assignmentDiff =
          (a.candidate.recentAssignmentCount ?? 0) - (b.candidate.recentAssignmentCount ?? 0);
        if (assignmentDiff !== 0) return assignmentDiff;

        if (a.tieRand !== b.tieRand) return b.tieRand - a.tieRand;
        return a.candidate.userId - b.candidate.userId;
      });

      return ranked;
    };

    const hasMainAssigned = (scheduleId: number): boolean =>
      currentAssignments.some(
        (assignment) => assignment.scheduleId === scheduleId && assignment.category === 'Main',
      );

    const decrementOpportunitySlots = (candidateId: number) => {
      const current = remainingSlotsByInstructor.get(candidateId) ?? 0;
      if (current > 0) {
        remainingSlotsByInstructor.set(candidateId, current - 1);
      }
      if (totalRemainingSlots > 0) {
        totalRemainingSlots--;
      }
    };

    const recordSelected = (scheduleId: number, candidate: InstructorCandidate, score: number) => {
      const selected = debugSelectedByScheduleId.get(scheduleId) ?? [];
      selected.push({
        userId: candidate.userId,
        name: candidate.name,
        totalScore: score,
      });
      debugSelectedByScheduleId.set(scheduleId, selected);
    };

    const appendAssignment = (
      scheduleInfo: ScheduleWithUnit,
      candidate: InstructorCandidate,
      score: number,
    ): boolean => {
      const remaining = remainingRequiredByScheduleId.get(scheduleInfo.schedule.id) ?? 0;
      if (remaining <= 0) return false;

      assignments.push({
        unitScheduleId: scheduleInfo.schedule.id,
        instructorId: candidate.userId,
        score,
      });

      currentAssignments.push({
        unitScheduleId: scheduleInfo.schedule.id,
        scheduleId: scheduleInfo.schedule.id,
        unitId: scheduleInfo.unit.id,
        trainingPeriodId: scheduleInfo.trainingPeriodId,
        date: toDateString(scheduleInfo.schedule.date),
        instructorId: candidate.userId,
        category: candidate.category,
        teamId: candidate.teamId,
        state: 'Pending',
        classification: null,
        isExisting: false,
        isTeamLeader: candidate.isTeamLeader,
        generation: candidate.generation,
      });

      remainingRequiredByScheduleId.set(scheduleInfo.schedule.id, remaining - 1);
      decrementOpportunitySlots(candidate.userId);
      recordSelected(scheduleInfo.schedule.id, candidate, score);

      if (DEBUG.ASSIGNMENT) {
        logger.debug(
          `[배정] ${candidate.name} (ID:${candidate.userId}) → Schedule:${scheduleInfo.schedule.id}, Date:${toDateString(scheduleInfo.schedule.date)}`,
        );
      }

      return true;
    };

    const buildCoverageMeta = (
      candidate: InstructorCandidate,
      openSchedules: ScheduleWithUnit[],
      missingMainSchedules: ScheduleWithUnit[],
    ): CandidateCoverageMeta | null => {
      const missingScheduleIds = new Set(
        missingMainSchedules.map((scheduleInfo) => scheduleInfo.schedule.id),
      );
      const coverableMissingScheduleIds: number[] = [];
      const coverableOpenScheduleIds: number[] = [];
      const scoreByScheduleId = new Map<number, number>();
      let aggregateScore = 0;

      for (const scheduleInfo of openSchedules) {
        const context = buildContext(scheduleInfo);
        if (!passesFilters(candidate, context, true)) continue;

        const { total } = this.calculateScoreWithBreakdown(candidate, context);
        scoreByScheduleId.set(scheduleInfo.schedule.id, total);
        coverableOpenScheduleIds.push(scheduleInfo.schedule.id);

        if (missingScheduleIds.has(scheduleInfo.schedule.id)) {
          coverableMissingScheduleIds.push(scheduleInfo.schedule.id);
          aggregateScore += total;
        }
      }

      if (coverableMissingScheduleIds.length === 0) return null;

      const targetMonth = toDateString(openSchedules[0]?.schedule.date ?? new Date()).slice(0, 7);
      const { byInstructorId } = getMonthlyAvailabilityStats(targetMonth);

      return {
        candidate,
        aggregateScore,
        monthlyAvailCount: byInstructorId.get(candidate.userId) ?? 0,
        tieRand: deterministicRand01(
          `main|${openSchedules[0]?.trainingPeriodId ?? 0}|${candidate.userId}`,
        ),
        coverableMissingScheduleIds,
        coverableOpenScheduleIds,
        scoreByScheduleId,
        existingPeriodAssignmentsCount: currentAssignments.filter(
          (assignment) =>
            assignment.trainingPeriodId === (openSchedules[0]?.trainingPeriodId ?? 0) &&
            assignment.instructorId === candidate.userId,
        ).length,
      };
    };

    const buildFullCoverMeta = (
      candidate: InstructorCandidate,
      openSchedules: ScheduleWithUnit[],
      priorityKey: string,
    ): FullCoverCandidateMeta | null => {
      if (openSchedules.length === 0) return null;

      const scoreByScheduleId = new Map<number, number>();
      let aggregateScore = 0;

      for (const scheduleInfo of openSchedules) {
        const context = buildContext(scheduleInfo);
        if (!passesFilters(candidate, context)) return null;

        const { total } = this.calculateScoreWithBreakdown(candidate, context);
        scoreByScheduleId.set(scheduleInfo.schedule.id, total);
        aggregateScore += total;
      }

      const targetMonth = toDateString(openSchedules[0].schedule.date).slice(0, 7);
      const { byInstructorId } = getMonthlyAvailabilityStats(targetMonth);

      return {
        candidate,
        aggregateScore,
        monthlyAvailCount: byInstructorId.get(candidate.userId) ?? 0,
        tieRand: deterministicRand01(
          `${priorityKey}|${openSchedules[0].trainingPeriodId}|${candidate.userId}`,
        ),
        scoreByScheduleId,
        existingPeriodAssignmentsCount: currentAssignments.filter(
          (assignment) =>
            assignment.trainingPeriodId === openSchedules[0].trainingPeriodId &&
            assignment.instructorId === candidate.userId,
        ).length,
      };
    };

    const ensureMainCoverageForPeriod = (periodSchedules: ScheduleWithUnit[]) => {
      const activeSchedules = periodSchedules.filter(
        (scheduleInfo) => !scheduleInfo.schedule.isBlocked,
      );

      while (true) {
        const openSchedules = activeSchedules.filter(
          (scheduleInfo) => (remainingRequiredByScheduleId.get(scheduleInfo.schedule.id) ?? 0) > 0,
        );
        const missingMainSchedules = openSchedules.filter(
          (scheduleInfo) => !hasMainAssigned(scheduleInfo.schedule.id),
        );

        if (missingMainSchedules.length === 0) break;

        const metas = candidates
          .filter((candidate) => candidate.category === 'Main')
          .map((candidate) => buildCoverageMeta(candidate, openSchedules, missingMainSchedules))
          .filter((meta): meta is CandidateCoverageMeta => meta !== null);

        if (metas.length === 0) {
          if (DEBUG.ASSIGNMENT) {
            logger.debug(
              `[Main 보장 실패] TrainingPeriod:${periodSchedules[0]?.trainingPeriodId ?? 0} - 남은 날짜 ${missingMainSchedules
                .map((scheduleInfo) => scheduleInfo.schedule.id)
                .join(', ')}`,
            );
          }
          break;
        }

        metas.sort((a, b) => {
          const continuityDiff =
            b.existingPeriodAssignmentsCount - a.existingPeriodAssignmentsCount;
          if (continuityDiff !== 0) return continuityDiff;

          const aPriorityFull =
            a.candidate.priorityCredits > 0 &&
            a.coverableOpenScheduleIds.length === openSchedules.length;
          const bPriorityFull =
            b.candidate.priorityCredits > 0 &&
            b.coverableOpenScheduleIds.length === openSchedules.length;
          if (aPriorityFull !== bPriorityFull) return aPriorityFull ? -1 : 1;

          const aFullMissing = a.coverableMissingScheduleIds.length === missingMainSchedules.length;
          const bFullMissing = b.coverableMissingScheduleIds.length === missingMainSchedules.length;
          if (aFullMissing !== bFullMissing) return aFullMissing ? -1 : 1;

          const missingDiff =
            b.coverableMissingScheduleIds.length - a.coverableMissingScheduleIds.length;
          if (missingDiff !== 0) return missingDiff;

          const scoreDiff = b.aggregateScore - a.aggregateScore;
          if (Math.abs(scoreDiff) > 1e-9) return scoreDiff;

          const availDiff = b.monthlyAvailCount - a.monthlyAvailCount;
          if (availDiff !== 0) return availDiff;

          if (a.tieRand !== b.tieRand) return b.tieRand - a.tieRand;
          return a.candidate.userId - b.candidate.userId;
        });

        const selected = metas[0];
        for (const scheduleInfo of missingMainSchedules) {
          if (!selected.coverableMissingScheduleIds.includes(scheduleInfo.schedule.id)) continue;
          const score = selected.scoreByScheduleId.get(scheduleInfo.schedule.id) ?? 0;
          appendAssignment(scheduleInfo, selected.candidate, score);
        }
      }
    };

    const assignFullCoverAnchorsForPeriod = (periodSchedules: ScheduleWithUnit[]) => {
      const activeSchedules = periodSchedules.filter(
        (scheduleInfo) => !scheduleInfo.schedule.isBlocked,
      );

      while (true) {
        const openSchedules = activeSchedules.filter(
          (scheduleInfo) => (remainingRequiredByScheduleId.get(scheduleInfo.schedule.id) ?? 0) > 0,
        );
        if (openSchedules.length === 0) break;

        const metas = candidates
          .map((candidate) => buildFullCoverMeta(candidate, openSchedules, 'anchor'))
          .filter((meta): meta is FullCoverCandidateMeta => meta !== null);

        if (metas.length === 0) break;

        metas.sort((a, b) => {
          const continuityDiff =
            b.existingPeriodAssignmentsCount - a.existingPeriodAssignmentsCount;
          if (continuityDiff !== 0) return continuityDiff;

          const priorityDiff =
            Number(b.candidate.priorityCredits > 0) - Number(a.candidate.priorityCredits > 0);
          if (priorityDiff !== 0) return priorityDiff;

          const scoreDiff = b.aggregateScore - a.aggregateScore;
          if (Math.abs(scoreDiff) > 1e-9) return scoreDiff;

          const availDiff = b.monthlyAvailCount - a.monthlyAvailCount;
          if (availDiff !== 0) return availDiff;

          if (a.tieRand !== b.tieRand) return b.tieRand - a.tieRand;
          return a.candidate.userId - b.candidate.userId;
        });

        const selected = metas[0];
        for (const scheduleInfo of openSchedules) {
          const score = selected.scoreByScheduleId.get(scheduleInfo.schedule.id) ?? 0;
          appendAssignment(scheduleInfo, selected.candidate, score);
        }
      }
    };

    for (const trainingPeriodId of orderedPeriodIds) {
      const periodSchedules = schedulesByPeriodId.get(trainingPeriodId) ?? [];
      if (periodSchedules.length === 0) continue;

      ensureMainCoverageForPeriod(periodSchedules);
      assignFullCoverAnchorsForPeriod(periodSchedules);

      for (const scheduleInfo of periodSchedules) {
        if (scheduleInfo.schedule.isBlocked) continue;

        const required = remainingRequiredByScheduleId.get(scheduleInfo.schedule.id) ?? 0;
        if (DEBUG.ASSIGNMENT) {
          logger.debug(
            `[스케줄 처리] Unit:${scheduleInfo.unit.name}, Schedule:${scheduleInfo.schedule.id}, Date:${toDateString(scheduleInfo.schedule.date)}, Remaining:${required}, 현재 배정:${currentAssignments.length}`,
          );
        }

        while ((remainingRequiredByScheduleId.get(scheduleInfo.schedule.id) ?? 0) > 0) {
          const requireMain = !hasMainAssigned(scheduleInfo.schedule.id);
          const ranked = rankCandidatesForSchedule(scheduleInfo, candidates, requireMain);

          if (DEBUG.ASSIGNMENT) {
            logger.debug(
              `[필터 결과] Schedule:${scheduleInfo.schedule.id} 후보:${candidates.length}명 → 통과:${ranked.length}명`,
            );
          }

          if (ranked.length === 0) {
            if (DEBUG.ASSIGNMENT) {
              logger.debug(
                `[배정 중단] Schedule:${scheduleInfo.schedule.id} - ${
                  requireMain ? 'Main 후보' : '후보'
                } 부족`,
              );
            }
            break;
          }

          const selected = ranked[0];
          appendAssignment(scheduleInfo, selected.candidate, selected.score);

          if (debugTopK > 0 && !debugTopCandidatesByScheduleId.has(scheduleInfo.schedule.id)) {
            debugTopCandidatesByScheduleId.set(
              scheduleInfo.schedule.id,
              ranked.slice(0, debugTopK).map((candidateInfo) => ({
                userId: candidateInfo.candidate.userId,
                name: candidateInfo.candidate.name,
                totalScore: candidateInfo.score,
                monthlyAvailCount: candidateInfo.monthlyAvailCount,
                recentAssignmentCount: candidateInfo.candidate.recentAssignmentCount ?? 0,
                recentConfirmedCompletedCount:
                  candidateInfo.candidate.recentConfirmedCompletedCount ?? 0,
                recentRejectionCount: candidateInfo.candidate.recentRejectionCount ?? 0,
                priorityCredits: candidateInfo.candidate.priorityCredits ?? 0,
                tieRand: candidateInfo.tieRand,
                breakdown: candidateInfo.breakdown,
              })),
            );
          }
        }
      }
    }

    if (debugTopK > 0) {
      for (const scheduleInfo of allSchedules) {
        if (scheduleInfo.schedule.isBlocked) continue;

        if (!debugTopCandidatesByScheduleId.has(scheduleInfo.schedule.id)) {
          const requireMain = !hasMainAssigned(scheduleInfo.schedule.id);
          const ranked = rankCandidatesForSchedule(scheduleInfo, candidates, requireMain);
          debugTopCandidatesByScheduleId.set(
            scheduleInfo.schedule.id,
            ranked.slice(0, debugTopK).map((candidateInfo) => ({
              userId: candidateInfo.candidate.userId,
              name: candidateInfo.candidate.name,
              totalScore: candidateInfo.score,
              monthlyAvailCount: candidateInfo.monthlyAvailCount,
              recentAssignmentCount: candidateInfo.candidate.recentAssignmentCount ?? 0,
              recentConfirmedCompletedCount:
                candidateInfo.candidate.recentConfirmedCompletedCount ?? 0,
              recentRejectionCount: candidateInfo.candidate.recentRejectionCount ?? 0,
              priorityCredits: candidateInfo.candidate.priorityCredits ?? 0,
              tieRand: candidateInfo.tieRand,
              breakdown: candidateInfo.breakdown,
            })),
          );
        }

        debugSchedules.push({
          uniqueScheduleId: scheduleInfo.schedule.id,
          date: toDateString(scheduleInfo.schedule.date),
          required: scheduleInfo.schedule.requiredCount,
          candidatesTotal: candidates.length,
          candidatesAfterFilter:
            debugTopCandidatesByScheduleId.get(scheduleInfo.schedule.id)?.length ?? 0,
          topK: debugTopK,
          topCandidates: debugTopCandidatesByScheduleId.get(scheduleInfo.schedule.id) ?? [],
          selected: debugSelectedByScheduleId.get(scheduleInfo.schedule.id) ?? [],
        });
      }
    }

    let result = assignments;
    for (const processor of this.postProcessors) {
      const processorContext: AssignmentContext = {
        targetMonth: '',
        currentScheduleId: 0,
        currentScheduleDate: '',
        currentUnitId: 0,
        currentTrainingPeriodId: 0,
        currentTrainingPeriodDates: [],
        currentUnitRegion: '',
        currentAssignments: [...currentAssignments],
        instructorDistances,
        config: this.config,
        maxMonthlyAvailCount: 1,
        avgAssignmentCount,
        blockedInstructorIdsBySchedule: options?.blockedInstructorIdsBySchedule,
        remainingSlotsByInstructor,
        totalRemainingSlots,
        activeTeamCount,
        currentPeriodSlack: 0,
        currentScheduleRemainingCount: 0,
      };
      result = processor.process(result, processorContext);
    }

    const byUnit: Record<number, number> = {};
    for (const assignment of result) {
      const unitId = scheduleToUnitIdMap.get(assignment.unitScheduleId);
      if (!unitId) continue;
      byUnit[unitId] = (byUnit[unitId] || 0) + 1;
    }

    const totalRequired = units.reduce(
      (sum, unit) =>
        sum +
        unit.trainingPeriods.reduce(
          (periodSum, period) =>
            periodSum +
            period.schedules.reduce(
              (scheduleSum, schedule) => scheduleSum + schedule.requiredCount,
              0,
            ),
          0,
        ),
      0,
    );

    return {
      assignments: result,
      stats: {
        totalAssigned: result.length,
        totalUnassigned: totalRequired - result.length,
        byUnit,
      },
      ...(debugSchedules.length > 0 ? { debug: { schedules: debugSchedules } } : {}),
    };
  }

  private calculateScoreWithBreakdown(
    candidate: InstructorCandidate,
    context: AssignmentContext,
  ): { total: number; breakdown: ScoreBreakdown[] } {
    const breakdown: ScoreBreakdown[] = [];
    let total = 0;

    for (const scorer of this.scorers) {
      const weight = this.weights[scorer.id] ?? scorer.defaultWeight;
      const raw = scorer.calculate(candidate, context);
      const weighted = weight * raw;
      total += weighted;
      breakdown.push({
        scorerId: scorer.id,
        scorerName: scorer.name,
        weight,
        raw,
        weighted,
      });
    }

    return { total, breakdown };
  }
}
