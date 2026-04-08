// server/src/domains/assignment/services/assignment-query.service.ts
// 배정 조회 전용 서비스 (CQRS - Query)

import { assignmentQueryRepository, assignmentConfigRepository } from '../repositories';
import instructorRepository from '../../instructor/instructor.repository';
import distanceRepository from '../../distance/distance.repository';
import type { UnitRaw, InstructorRaw } from '../../../types/assignment.types';
import logger from '../../../config/logger';

// Helper: 오늘 UTC 자정 생성
function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

interface AssignmentCandidateSnapshot {
  unitsRaw: UnitRaw[];
  instructorsRaw: InstructorRaw[];
  allInstructorsRaw: InstructorRaw[];
  actualDateRange: {
    startDate: string;
    endDate: string;
  };
  distanceMap: Record<string, number>;
  distanceLimits: {
    internMaxDistanceKm: number;
    subMaxDistanceKm: number | null;
  };
}

interface AssignmentCandidateResult extends AssignmentCandidateSnapshot {
  cacheStatus: 'hit' | 'miss';
}

interface CandidateCacheEntry {
  createdAt: number;
  expiresAt: number;
  value: AssignmentCandidateSnapshot;
}

const CANDIDATE_CACHE_TTL_MS = Number(process.env.ASSIGNMENT_CANDIDATE_CACHE_TTL_MS || 60_000);
const CANDIDATE_CACHE_MAX_ENTRIES = Number(process.env.ASSIGNMENT_CANDIDATE_CACHE_MAX_ENTRIES || 8);
const candidateCache = new Map<string, CandidateCacheEntry>();

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function buildCandidateCacheKey(startDate: string, endDate: string): string {
  return `${startDate}:${endDate}`;
}

function pruneExpiredCandidateCacheEntries(now = Date.now()): void {
  for (const [key, entry] of candidateCache.entries()) {
    if (entry.expiresAt <= now) {
      candidateCache.delete(key);
    }
  }
}

function getCachedCandidateSnapshot(key: string): AssignmentCandidateSnapshot | null {
  const now = Date.now();
  pruneExpiredCandidateCacheEntries(now);

  const entry = candidateCache.get(key);
  if (!entry) return null;

  return cloneValue(entry.value);
}

function setCachedCandidateSnapshot(key: string, value: AssignmentCandidateSnapshot): void {
  const now = Date.now();
  pruneExpiredCandidateCacheEntries(now);

  if (!candidateCache.has(key) && candidateCache.size >= CANDIDATE_CACHE_MAX_ENTRIES) {
    const oldestKey = [...candidateCache.entries()].sort(
      (a, b) => a[1].createdAt - b[1].createdAt,
    )[0]?.[0];
    if (oldestKey) {
      candidateCache.delete(oldestKey);
    }
  }

  candidateCache.set(key, {
    createdAt: now,
    expiresAt: now + CANDIDATE_CACHE_TTL_MS,
    value: cloneValue(value),
  });
}

class AssignmentQueryService {
  /**
   * 시스템 설정 숫자 값 조회
   */
  async getSystemConfigNumber(key: string, defaultValue: number): Promise<number> {
    const value = await assignmentConfigRepository.getSystemConfigValue(key);
    if (!value) return defaultValue;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
  }

  /**
   * 강사당 교육생 수 조회 (공개 메서드)
   */
  async getTraineesPerInstructor(): Promise<number> {
    return this.getSystemConfigNumber('TRAINEES_PER_INSTRUCTOR', 36);
  }

  /**
   * 배정 후보 데이터 조회 (DB 직접 조회 - 간소화)
   */
  async getAssignmentCandidatesWithCache(
    startDate: string,
    endDate: string,
    _userId: number,
  ): Promise<AssignmentCandidateResult> {
    const cacheKey = buildCandidateCacheKey(startDate, endDate);
    const cached = getCachedCandidateSnapshot(cacheKey);

    if (cached) {
      return {
        ...cached,
        cacheStatus: 'hit',
      };
    }

    // 1) DB에서 부대 + 배정 데이터 한 번에 조회
    const unitsRaw = await assignmentQueryRepository.findScheduleCandidates(startDate, endDate);

    // 정렬은 클라이언트에서 수행 (grouping 후 순서 보장)

    // 3) 스케줄 날짜 범위 계산
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);
    let minScheduleDate = start;
    let maxScheduleDate = end;

    for (const unit of unitsRaw) {
      for (const period of unit.trainingPeriods || []) {
        for (const schedule of period.schedules || []) {
          if (!schedule.date) continue;
          const scheduleDate = new Date(schedule.date);
          if (scheduleDate < minScheduleDate) minScheduleDate = scheduleDate;
          if (scheduleDate > maxScheduleDate) maxScheduleDate = scheduleDate;
        }
      }
    }

    const actualDateRangeStr = {
      startDate: minScheduleDate.toISOString().split('T')[0],
      endDate: maxScheduleDate.toISOString().split('T')[0],
    };

    // 4) 병렬 조회: 강사 목록, 전체 강사 목록, 거리 데이터, 거리 제한 설정
    const unitIds = unitsRaw.map((u) => u.id);

    const [
      instructorsRaw,
      allInstructorsRaw,
      distanceData,
      internMaxDistanceKm,
      subMaxDistanceKmValue,
    ] = await Promise.all([
      instructorRepository.findAvailableInPeriod(
        actualDateRangeStr.startDate,
        actualDateRangeStr.endDate,
      ),
      instructorRepository.findActiveInstructors(),
      distanceRepository.findManyByUnitIds(unitIds),
      this.getSystemConfigNumber('INTERN_MAX_DISTANCE_KM', 50),
      assignmentConfigRepository.getSystemConfigValue('SUB_MAX_DISTANCE_KM'),
    ]);

    // 5) 거리 데이터 변환 (미터 → km)
    // distance가 null이면 preDistance 사용 (주소 변경 후 재계산 대기 중)
    // 둘 다 null인 강사는 distanceMap에 포함되지 않음 → 프론트에서 필터링 안함
    const distanceMap: Record<string, number> = {};
    for (const d of distanceData) {
      const effectiveDistanceM = d.distance ?? d.preDistance;
      if (effectiveDistanceM !== null) {
        const key = `${d.userId}-${d.unitId}`;
        distanceMap[key] = Number(effectiveDistanceM) / 1000; // km
      }
    }

    // SUB_MAX_DISTANCE_KM: 0 또는 빈 값 = 제한 없음 (null)
    const subMaxDistanceKm =
      subMaxDistanceKmValue && Number(subMaxDistanceKmValue) > 0
        ? Number(subMaxDistanceKmValue)
        : null;

    const result = {
      unitsRaw: unitsRaw as unknown as UnitRaw[],
      instructorsRaw: instructorsRaw as unknown as InstructorRaw[],
      allInstructorsRaw: allInstructorsRaw as unknown as InstructorRaw[],
      actualDateRange: actualDateRangeStr,
      distanceMap,
      distanceLimits: {
        internMaxDistanceKm,
        subMaxDistanceKm,
      },
    };

    setCachedCandidateSnapshot(cacheKey, result);

    return {
      ...cloneValue(result),
      cacheStatus: 'miss',
    };
  }

  clearAssignmentCandidateCache(reason?: string): void {
    if (candidateCache.size === 0) return;

    const clearedEntries = candidateCache.size;
    candidateCache.clear();

    logger.info('[assignment.candidateCache.clear]', {
      reason: reason || 'manual',
      clearedEntries,
    });
  }

  /**
   * 근무 이력 조회 (Confirmed + Past)
   */
  async getWorkHistory(instructorId: number) {
    const today = getTodayUTC();
    return await assignmentQueryRepository.findAllByInstructorId(instructorId, {
      state: 'Accepted',
      classification: 'Confirmed',
      UnitSchedule: { date: { lt: today } },
    });
  }

  /**
   * 배정 목록 조회 (Active + Future)
   */
  async getUpcomingAssignments(instructorId: number) {
    const today = getTodayUTC();
    return await assignmentQueryRepository.findAllByInstructorId(instructorId, {
      state: { in: ['Pending', 'Accepted'] },
      UnitSchedule: { date: { gte: today } },
    });
  }

  /**
   * 내 배정 목록 조회 (강사용 - 메시지함에서 사용)
   */
  async getMyAssignments(userId: number) {
    return await assignmentQueryRepository.getMyAssignments(userId);
  }
}

export const assignmentQueryService = new AssignmentQueryService();
export default assignmentQueryService;
