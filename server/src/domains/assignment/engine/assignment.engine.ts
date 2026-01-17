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
} from './assignment.types';
import { allFilters } from './filters';
import { allScorers } from './scorers';
import { allPostProcessors } from './post-processors';
import {
  createBundles,
  calculateAndSortBundlesByRisk,
  getFullBundleCandidateIds,
} from './bundle-utils';
import logger from '../../../config/logger';
import DEBUG from '../../../config/debug';

// =========================================
// Deterministic tie-breaker utilities
// - 목적: "점수 동일" 시 입력 배열 순서로 인해 앞사람부터 뽑히는 현상을 제거
// - 요구: 같은 입력이면 같은 결과 (운영/감사 대응)
// - 방식: (1) 월 신청량(가능일 수) ↓ (2) 최근 배정 수 ↑(적을수록) (3) seed 기반 pseudo-random
// =========================================

function fnv1a32(input: string): number {
  // 32-bit FNV-1a
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // hash *= 16777619 (but keep 32-bit)
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
  // availableDates: 'YYYY-MM-DD', targetMonth: 'YYYY-MM'
  let cnt = 0;
  for (const d of availableDates || []) if (d.startsWith(targetMonth)) cnt++;
  return cnt;
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
      ...config,
    };

    // 기본 필터, 스코어러, 후처리 등록
    this.filters = [...allFilters];
    this.scorers = [...allScorers];
    this.postProcessors = [...allPostProcessors];

    // 기본 가중치 설정
    for (const scorer of this.scorers) {
      this.weights[scorer.id] = scorer.defaultWeight;
    }

    // 사용자 정의 가중치 적용
    if (config?.scorerWeights) {
      Object.assign(this.weights, config.scorerWeights);
    }
  }

  /**
   * 필터 등록
   */
  registerFilter(filter: AssignmentFilter): void {
    this.filters.push(filter);
  }

  /**
   * 스코어러 등록
   */
  registerScorer(scorer: AssignmentScorer): void {
    this.scorers.push(scorer);
    this.weights[scorer.id] = scorer.defaultWeight;
  }

  /**
   * 후처리 등록
   */
  registerPostProcessor(processor: PostProcessor): void {
    this.postProcessors.push(processor);
  }

  /**
   * 가중치 설정
   */
  setWeights(weights: Record<string, number>): void {
    Object.assign(this.weights, weights);
  }

  /**
   * 메인 실행 메서드
   */
  execute(
    units: UnitData[],
    candidates: InstructorCandidate[],
    options?: {
      blockedInstructorIdsBySchedule?: Map<number, Set<number>>;
      /**
       * 디버그 후보 리포트 생성 (0이면 생성 안 함)
       * - 각 스케줄별 상위 K명의 후보자 breakdown을 수집
       */
      debugTopK?: number;
    },
  ): EngineResult {
    const assignments: AssignmentResult[] = [];
    const currentAssignments: AssignmentData[] = [];
    const debugSchedules: DebugScheduleInfo[] = [];
    const debugTopK = options?.debugTopK ?? 0;

    // 통계 계산
    const avgAssignmentCount =
      candidates.reduce((sum, c) => sum + c.recentAssignmentCount, 0) / candidates.length || 1;

    // 거리 맵 생성 (나중에 실제 데이터로 채움)
    const instructorDistances = new Map<string, number>();

    // =========================================
    // Slack 기반 스케줄 우선순위 정렬
    // - Bundle 생성 → Slack 계산 → 위험한 순서로 정렬
    // =========================================
    const bundles = createBundles(units);
    const sortedSlackInfos = calculateAndSortBundlesByRisk(bundles, candidates);

    // DEBUG: Slack 정렬 결과 로깅
    if (DEBUG.ASSIGNMENT) {
      logger.debug(`[Slack 정렬] 총 ${bundles.length}개 번들 생성, 위험순 정렬 완료`);
      for (const info of sortedSlackInfos.slice(0, 5)) {
        logger.debug(
          `  - ${info.bundle.unitName} [${info.bundle.dates.join(', ')}]: ` +
            `minSlack=${info.minSlack}, overlap=${info.overlapPenalty}, risk=${info.riskScore}`,
        );
      }
    }

    // 기회비용 계산용: 남은 슬롯 맵 생성
    const remainingSlotsByInstructor = new Map<number, number>();
    let totalRemainingSlots = 0;
    for (const info of sortedSlackInfos) {
      for (const candidateId of info.fullBundleCandidateIds) {
        const current = remainingSlotsByInstructor.get(candidateId) ?? 0;
        remainingSlotsByInstructor.set(candidateId, current + info.bundle.requiredPerDay);
        totalRemainingSlots += info.bundle.requiredPerDay;
      }
    }

    // 모든 스케줄을 Slack 우선순위로 플래튼
    interface ScheduleWithUnit {
      unit: UnitData;
      schedule: { id: number; date: Date; requiredCount: number; isBlocked?: boolean };
      bundleRisk: number;
      trainingPeriodId: number; // TrainingPeriod ID 추가
    }
    const allSchedules: ScheduleWithUnit[] = [];

    for (const info of sortedSlackInfos) {
      const unit = units.find((u) => u.id === info.bundle.unitId);
      if (!unit) continue;

      for (const schedule of info.bundle.schedules) {
        allSchedules.push({
          unit,
          schedule,
          bundleRisk: info.riskScore,
          trainingPeriodId: info.bundle.trainingPeriodId, // TrainingPeriod ID 저장
        });
      }
    }

    // Slack이 낮은 번들의 스케줄 먼저, 같은 번들 내에서는 날짜순
    allSchedules.sort((a, b) => {
      if (a.bundleRisk !== b.bundleRisk) return a.bundleRisk - b.bundleRisk;
      return new Date(a.schedule.date).getTime() - new Date(b.schedule.date).getTime();
    });

    // 스케줄별 배정 진행 (Slack 우선순위로)
    for (const { unit, schedule, trainingPeriodId } of allSchedules) {
      // isBlocked=true인 스케줄은 배정 생략
      if (schedule.isBlocked) {
        continue;
      }

      // 스케줄 기준 월(YYYY-MM)
      const targetMonth = new Date(schedule.date).toISOString().slice(0, 7);
      const scheduleDate = new Date(schedule.date).toISOString().split('T')[0];

      // 월별 가능일 수를 스케줄마다 계산(정확화)
      const monthlyAvailCountByInstructorId = new Map<number, number>();
      let maxMonthlyAvailCount = 1;
      for (const c of candidates) {
        const cnt = getMonthlyAvailCountByMonthStrings(c.availableDates, targetMonth);
        monthlyAvailCountByInstructorId.set(c.userId, cnt);
        if (cnt > maxMonthlyAvailCount) maxMonthlyAvailCount = cnt;
      }
      const context: AssignmentContext = {
        targetMonth,
        currentScheduleId: schedule.id,
        currentScheduleDate: scheduleDate,
        currentUnitId: unit.id,
        currentTrainingPeriodId: trainingPeriodId, // TrainingPeriod ID 추가
        currentUnitRegion: unit.region,
        currentAssignments: [...currentAssignments],
        instructorDistances,
        config: this.config,
        maxMonthlyAvailCount,
        avgAssignmentCount,
        blockedInstructorIdsBySchedule: options?.blockedInstructorIdsBySchedule,
        // 기회비용 계산용
        remainingSlotsByInstructor,
        totalRemainingSlots,
      };

      // DEBUG: 스케줄 처리 시작 로그
      if (DEBUG.ASSIGNMENT) {
        logger.debug(
          `[스케줄 처리] Unit: ${unit.name}, Schedule: ${schedule.id}, Date: ${context.currentScheduleDate}, Required: ${schedule.requiredCount}, 현재 배정된 강사 수: ${currentAssignments.length}`,
        );
      }

      // 1. Hard 필터 적용
      const filtered = candidates.filter((c) => this.filters.every((f) => f.check(c, context)));

      // DEBUG: 필터 결과 로깅
      if (DEBUG.ASSIGNMENT) {
        logger.debug(`[필터 결과] 후보: ${candidates.length}명 → 통과: ${filtered.length}명`);
        // 필터별 통과 수 체크 (모든 후보가 필터링됐을 때만)
        if (filtered.length === 0 && candidates.length > 0) {
          for (const filter of this.filters) {
            const passCount = candidates.filter((c) => filter.check(c, context)).length;
            logger.debug(`  - ${filter.name}: ${passCount}/${candidates.length} 통과`);
          }
        }
      }

      // 2. Soft 점수 계산 (breakdown 포함)
      const scored = filtered.map((c) => {
        const { total, breakdown } = this.calculateScoreWithBreakdown(c, context);
        const tieKey = `${context.currentScheduleId}|${context.targetMonth}|${c.userId}`;
        const tieRand = deterministicRand01(tieKey);
        return {
          candidate: c,
          score: total,
          breakdown,
          tieRand,
          monthlyAvailCount: monthlyAvailCountByInstructorId.get(c.userId) ?? 0,
        };
      });

      // 3. 점수 높은 순 정렬 (+ deterministic tie-breaker)
      const EPS = 1e-9;
      scored.sort((a, b) => {
        const scoreDiff = b.score - a.score;
        if (Math.abs(scoreDiff) > EPS) return scoreDiff;

        // [Tie-break 1] "해당 월" 가능일 수: 큰 사람 우선
        const availDiff = (b.monthlyAvailCount ?? 0) - (a.monthlyAvailCount ?? 0);
        if (availDiff !== 0) return availDiff;

        // [Tie-break 2] recentAssignmentCount: 적은 사람 우선 (공정성)
        const assignDiff =
          (a.candidate.recentAssignmentCount ?? 0) - (b.candidate.recentAssignmentCount ?? 0);
        if (assignDiff !== 0) return assignDiff;

        // [Tie-break 3] deterministic pseudo-random
        if (a.tieRand !== b.tieRand) return b.tieRand - a.tieRand;

        // 완전 동일한 경우: userId로 최종 안정화
        return a.candidate.userId - b.candidate.userId;
      });

      // 4. 필요 인원만큼 배정
      const required = schedule.requiredCount;
      const selectedForSchedule: Array<{ userId: number; name: string; totalScore: number }> = [];

      for (let i = 0; i < required && i < scored.length; i++) {
        const selected = scored[i];
        const assignment: AssignmentResult = {
          unitScheduleId: schedule.id,
          instructorId: selected.candidate.userId,
          score: selected.score,
        };
        assignments.push(assignment);
        selectedForSchedule.push({
          userId: selected.candidate.userId,
          name: selected.candidate.name,
          totalScore: selected.score,
        });

        // DEBUG: 배정 로그
        if (DEBUG.ASSIGNMENT) {
          logger.debug(
            `[배정] ${selected.candidate.name} (ID:${selected.candidate.userId}) → Schedule:${schedule.id}, Date:${context.currentScheduleDate}`,
          );
        }

        // context 업데이트 (연속성 계산용)
        currentAssignments.push({
          unitScheduleId: schedule.id,
          scheduleId: schedule.id,
          unitId: unit.id,
          trainingPeriodId, // TrainingPeriod ID 추가
          date: context.currentScheduleDate,
          instructorId: selected.candidate.userId,
          category: selected.candidate.category,
          teamId: selected.candidate.teamId,
          state: 'Pending',
          classification: null,
          isTeamLeader: selected.candidate.isTeamLeader,
          generation: selected.candidate.generation,
        });
      }

      // ---- Debug 리포트 수집 (debugTopK > 0일 때만) ----
      if (debugTopK > 0) {
        const topCandidates = scored.slice(0, debugTopK).map((x) => ({
          userId: x.candidate.userId,
          name: x.candidate.name,
          totalScore: x.score,
          monthlyAvailCount: x.monthlyAvailCount,
          recentAssignmentCount: x.candidate.recentAssignmentCount ?? 0,
          recentRejectionCount: x.candidate.recentRejectionCount ?? 0,
          priorityCredits: x.candidate.priorityCredits ?? 0,
          tieRand: x.tieRand,
          breakdown: x.breakdown,
        }));

        debugSchedules.push({
          uniqueScheduleId: schedule.id,
          date: scheduleDate,
          required,
          candidatesTotal: candidates.length,
          candidatesAfterFilter: filtered.length,
          topK: debugTopK,
          topCandidates,
          selected: selectedForSchedule,
        });
      }
    }

    // 5. 후처리
    let result = assignments;
    for (const processor of this.postProcessors) {
      const dummyContext: AssignmentContext = {
        targetMonth: '',
        currentScheduleId: 0,
        currentScheduleDate: '',
        currentUnitId: 0,
        currentTrainingPeriodId: 0, // TrainingPeriod ID 추가
        currentUnitRegion: '',
        currentAssignments: [],
        instructorDistances,
        config: this.config,
        maxMonthlyAvailCount: 1,
        avgAssignmentCount,
        blockedInstructorIdsBySchedule: options?.blockedInstructorIdsBySchedule,
      };
      result = processor.process(result, dummyContext);
    }

    // 통계 계산
    const byUnit: Record<number, number> = {};
    for (const assignment of result) {
      // TrainingPeriod 구조에서 스케줄 찾기
      let foundUnitId: number | undefined;
      for (const u of units) {
        for (const period of u.trainingPeriods) {
          if (period.schedules.some((s) => s.id === assignment.unitScheduleId)) {
            foundUnitId = u.id;
            break;
          }
        }
        if (foundUnitId) break;
      }
      if (foundUnitId) {
        byUnit[foundUnitId] = (byUnit[foundUnitId] || 0) + 1;
      }
    }

    const totalRequired = units.reduce(
      (sum, u) =>
        sum +
        u.trainingPeriods.reduce(
          (pSum, p) => pSum + p.schedules.reduce((sSum, sch) => sSum + sch.requiredCount, 0),
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
      // debugTopK > 0이면 debug 포함
      ...(debugSchedules.length > 0 ? { debug: { schedules: debugSchedules } } : {}),
    };
  }

  /**
   * 점수 계산 (breakdown 포함)
   */
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
