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
} from './assignment.types';
import { allFilters } from './filters';
import { allScorers } from './scorers';
import { allPostProcessors } from './post-processors';
import logger from '../../../config/logger';
import DEBUG from '../../../config/debug';

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
  execute(units: UnitData[], candidates: InstructorCandidate[]): EngineResult {
    const assignments: AssignmentResult[] = [];
    const currentAssignments: AssignmentData[] = [];

    // 통계 계산
    const maxMonthlyAvailCount = Math.max(...candidates.map((c) => c.monthlyAvailabilityCount), 1);
    const avgAssignmentCount =
      candidates.reduce((sum, c) => sum + c.recentAssignmentCount, 0) / candidates.length || 1;

    // 거리 맵 생성 (나중에 실제 데이터로 채움)
    const instructorDistances = new Map<string, number>();

    // 부대별, 날짜별 배정 진행
    for (const unit of units) {
      for (const schedule of unit.schedules) {
        const context: AssignmentContext = {
          targetMonth: new Date(schedule.date).toISOString().slice(0, 7),
          currentScheduleId: schedule.id,
          currentScheduleDate: new Date(schedule.date).toISOString().split('T')[0],
          currentUnitId: unit.id,
          currentUnitRegion: unit.region,
          currentAssignments: [...currentAssignments],
          instructorDistances,
          config: this.config,
          maxMonthlyAvailCount,
          avgAssignmentCount,
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

        // 2. Soft 점수 계산
        const scored = filtered.map((c) => ({
          candidate: c,
          score: this.calculateTotalScore(c, context),
        }));

        // 3. 점수 높은 순 정렬
        scored.sort((a, b) => b.score - a.score);

        // 4. 필요 인원만큼 배정
        const required = schedule.requiredCount;
        for (let i = 0; i < required && i < scored.length; i++) {
          const selected = scored[i];
          const assignment: AssignmentResult = {
            unitScheduleId: schedule.id,
            instructorId: selected.candidate.userId,
            score: selected.score,
          };
          assignments.push(assignment);

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
            date: context.currentScheduleDate,
            instructorId: selected.candidate.userId,
            category: selected.candidate.category,
            teamId: selected.candidate.teamId,
            state: 'Pending',
            classification: null,
          });
        }
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
        currentUnitRegion: '',
        currentAssignments: [],
        instructorDistances,
        config: this.config,
        maxMonthlyAvailCount,
        avgAssignmentCount,
      };
      result = processor.process(result, dummyContext);
    }

    // 통계 계산
    const byUnit: Record<number, number> = {};
    for (const assignment of result) {
      const unitId = units.find((u) =>
        u.schedules.some((s) => s.id === assignment.unitScheduleId),
      )?.id;
      if (unitId) {
        byUnit[unitId] = (byUnit[unitId] || 0) + 1;
      }
    }

    const totalRequired = units.reduce(
      (sum, u) => sum + u.schedules.reduce((s, sch) => s + sch.requiredCount, 0),
      0,
    );

    return {
      assignments: result,
      stats: {
        totalAssigned: result.length,
        totalUnassigned: totalRequired - result.length,
        byUnit,
      },
    };
  }

  /**
   * 총점 계산
   */
  private calculateTotalScore(candidate: InstructorCandidate, context: AssignmentContext): number {
    return this.scorers.reduce((total, scorer) => {
      const weight = this.weights[scorer.id] ?? scorer.defaultWeight;
      const score = scorer.calculate(candidate, context);
      return total + weight * score;
    }, 0);
  }
}
