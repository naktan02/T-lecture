// server/src/libs/cache.ts
// 엔티티 기반 Redis 캐싱 헬퍼

import { getRedis, CACHE_TTL } from '../config/redis';
import logger from '../config/logger';

// =============================================================================
// 캐시 키 생성
// =============================================================================

export const CACHE_KEYS = {
  // 강사 개별 데이터
  instructor: (userId: number) => `instructor:${userId}`,
  // 부대 개별 데이터 (스케줄 포함)
  unit: (unitId: number) => `unit:${unitId}`,
  // 메타데이터
  teams: 'metadata:teams',
  virtues: 'metadata:virtues',
};

// =============================================================================
// 강사 캐싱
// =============================================================================

interface CachedInstructor {
  userId: number;
  name: string | null | undefined;
  category: string | null | undefined;
  teamId: number | null;
  teamName: string | null | undefined;
  isTeamLeader: boolean;
  generation: number | null;
  restrictedArea: string | null;
  availableDates: (Date | string)[];
  priorityCredits: number;
  [key: string]: unknown; // 기타 필드
}

/**
 * 강사 데이터 캐시 저장 (개별)
 */
export async function cacheInstructor(instructor: CachedInstructor): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = CACHE_KEYS.instructor(instructor.userId);
    // TTL=0이면 만료 없이 저장
    if (CACHE_TTL.instructor > 0) {
      await redis.set(key, JSON.stringify(instructor), { ex: CACHE_TTL.instructor });
    } else {
      await redis.set(key, JSON.stringify(instructor));
    }
    logger.debug(`[Cache] 강사 저장: ${key}`);
  } catch (error) {
    logger.error('[Cache] 강사 저장 실패:', error);
  }
}

/**
 * 강사 데이터 일괄 캐시 저장
 */
export async function cacheInstructors(instructors: CachedInstructor[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const pipeline = redis.pipeline();
    for (const inst of instructors) {
      const key = CACHE_KEYS.instructor(inst.userId);
      // TTL=0이면 만료 없이 저장
      if (CACHE_TTL.instructor > 0) {
        pipeline.set(key, JSON.stringify(inst), { ex: CACHE_TTL.instructor });
      } else {
        pipeline.set(key, JSON.stringify(inst));
      }
    }
    await pipeline.exec();
    logger.debug(`[Cache] 강사 ${instructors.length}명 일괄 저장`);
  } catch (error) {
    logger.error('[Cache] 강사 일괄 저장 실패:', error);
  }
}

/**
 * 강사 데이터 캐시 조회 (개별)
 */
export async function getCachedInstructor(userId: number): Promise<CachedInstructor | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const key = CACHE_KEYS.instructor(userId);
    const cached = await redis.get<string>(key);
    if (!cached) return null;
    return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch (error) {
    logger.error('[Cache] 강사 조회 실패:', error);
    return null;
  }
}

/**
 * 강사 데이터 일괄 캐시 조회
 * @returns { cached: 캐시된 강사 목록, missingIds: 캐시에 없는 ID 목록 }
 */
export async function getCachedInstructors(
  userIds: number[],
): Promise<{ cached: CachedInstructor[]; missingIds: number[] }> {
  const redis = getRedis();
  if (!redis) return { cached: [], missingIds: userIds };

  try {
    const keys = userIds.map((id) => CACHE_KEYS.instructor(id));
    const results = await redis.mget<(string | null)[]>(...keys);

    const cached: CachedInstructor[] = [];
    const missingIds: number[] = [];

    results.forEach((result, index) => {
      if (result) {
        const parsed = typeof result === 'string' ? JSON.parse(result) : result;
        cached.push(parsed);
      } else {
        missingIds.push(userIds[index]);
      }
    });

    logger.debug(`[Cache] 강사 조회: ${cached.length} HIT, ${missingIds.length} MISS`);
    return { cached, missingIds };
  } catch (error) {
    logger.error('[Cache] 강사 일괄 조회 실패:', error);
    return { cached: [], missingIds: userIds };
  }
}

/**
 * 강사 캐시 무효화
 */
export async function invalidateInstructor(userId: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = CACHE_KEYS.instructor(userId);
    await redis.del(key);
    logger.debug(`[Cache] 강사 무효화: ${key}`);
  } catch (error) {
    logger.error('[Cache] 강사 무효화 실패:', error);
  }
}

// =============================================================================
// 부대 캐싱
// =============================================================================

interface CachedUnit {
  id: number;
  name: string;
  region: string | null;
  wideArea: string | null;
  trainingPeriods: unknown[];
  [key: string]: unknown;
}

/**
 * 부대 데이터 캐시 저장 (개별)
 */
export async function cacheUnit(unit: CachedUnit): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = CACHE_KEYS.unit(unit.id);
    // TTL=0이면 만료 없이 저장
    if (CACHE_TTL.unit > 0) {
      await redis.set(key, JSON.stringify(unit), { ex: CACHE_TTL.unit });
    } else {
      await redis.set(key, JSON.stringify(unit));
    }
    logger.debug(`[Cache] 부대 저장: ${key}`);
  } catch (error) {
    logger.error('[Cache] 부대 저장 실패:', error);
  }
}

/**
 * 부대 데이터 일괄 캐시 저장
 */
export async function cacheUnits(units: CachedUnit[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const pipeline = redis.pipeline();
    for (const unit of units) {
      const key = CACHE_KEYS.unit(unit.id);
      // TTL=0이면 만료 없이 저장
      if (CACHE_TTL.unit > 0) {
        pipeline.set(key, JSON.stringify(unit), { ex: CACHE_TTL.unit });
      } else {
        pipeline.set(key, JSON.stringify(unit));
      }
    }
    await pipeline.exec();
    logger.debug(`[Cache] 부대 ${units.length}개 일괄 저장`);
  } catch (error) {
    logger.error('[Cache] 부대 일괄 저장 실패:', error);
  }
}

/**
 * 부대 데이터 캐시 조회 (개별)
 */
export async function getCachedUnit(unitId: number): Promise<CachedUnit | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const key = CACHE_KEYS.unit(unitId);
    const cached = await redis.get<string>(key);
    if (!cached) return null;
    return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch (error) {
    logger.error('[Cache] 부대 조회 실패:', error);
    return null;
  }
}

/**
 * 부대 데이터 일괄 캐시 조회
 */
export async function getCachedUnits(
  unitIds: number[],
): Promise<{ cached: CachedUnit[]; missingIds: number[] }> {
  const redis = getRedis();
  if (!redis) return { cached: [], missingIds: unitIds };

  try {
    const keys = unitIds.map((id) => CACHE_KEYS.unit(id));
    const results = await redis.mget<(string | null)[]>(...keys);

    const cached: CachedUnit[] = [];
    const missingIds: number[] = [];

    results.forEach((result, index) => {
      if (result) {
        const parsed = typeof result === 'string' ? JSON.parse(result) : result;
        cached.push(parsed);
      } else {
        missingIds.push(unitIds[index]);
      }
    });

    logger.debug(`[Cache] 부대 조회: ${cached.length} HIT, ${missingIds.length} MISS`);
    return { cached, missingIds };
  } catch (error) {
    logger.error('[Cache] 부대 일괄 조회 실패:', error);
    return { cached: [], missingIds: unitIds };
  }
}

/**
 * 부대 캐시 무효화
 */
export async function invalidateUnit(unitId: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = CACHE_KEYS.unit(unitId);
    await redis.del(key);
    logger.debug(`[Cache] 부대 무효화: ${key}`);
  } catch (error) {
    logger.error('[Cache] 부대 무효화 실패:', error);
  }
}

// =============================================================================
// 메타데이터 캐싱 (팀, 덕목 등)
// =============================================================================

export async function getCachedMetadata<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const cached = await redis.get<string>(key);
    if (!cached) return null;
    return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch (error) {
    logger.error(`[Cache] 메타데이터 조회 실패: ${key}`, error);
    return null;
  }
}

export async function cacheMetadata<T>(
  key: string,
  data: T,
  ttl = CACHE_TTL.metadata,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(data), { ex: ttl });
    logger.debug(`[Cache] 메타데이터 저장: ${key}`);
  } catch (error) {
    logger.error(`[Cache] 메타데이터 저장 실패: ${key}`, error);
  }
}

export async function invalidateMetadata(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(key);
    logger.debug(`[Cache] 메타데이터 무효화: ${key}`);
  } catch (error) {
    logger.error(`[Cache] 메타데이터 무효화 실패: ${key}`, error);
  }
}

// =============================================================================
// 리프레시 토큰 캐싱
// =============================================================================

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7일 (초)

interface CachedRefreshToken {
  userId: number;
  deviceId: string | null;
  expiresAt: string;
}

/**
 * 리프레시 토큰 캐시 저장
 */
export async function cacheRefreshToken(
  tokenHash: string,
  data: { userId: number; deviceId: string | null; expiresAt: Date },
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = `refresh:${tokenHash}`;
    const cacheData: CachedRefreshToken = {
      userId: data.userId,
      deviceId: data.deviceId,
      expiresAt: data.expiresAt.toISOString(),
    };
    await redis.set(key, JSON.stringify(cacheData), { ex: REFRESH_TOKEN_TTL });
    logger.debug(`[Cache] 리프레시 토큰 저장`);
  } catch (error) {
    logger.error('[Cache] 리프레시 토큰 저장 실패:', error);
  }
}

/**
 * 리프레시 토큰 캐시 조회
 */
export async function getCachedRefreshToken(tokenHash: string): Promise<CachedRefreshToken | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const key = `refresh:${tokenHash}`;
    const cached = await redis.get<string>(key);
    if (!cached) return null;
    return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch (error) {
    logger.error('[Cache] 리프레시 토큰 조회 실패:', error);
    return null;
  }
}

/**
 * 리프레시 토큰 캐시 무효화
 */
export async function invalidateRefreshToken(tokenHash: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = `refresh:${tokenHash}`;
    await redis.del(key);
    logger.debug(`[Cache] 리프레시 토큰 무효화`);
  } catch (error) {
    logger.error('[Cache] 리프레시 토큰 무효화 실패:', error);
  }
}

// =============================================================================
// 레거시 호환 (이전 세션 기반 캐싱)
// =============================================================================

// 기존 함수들 유지 (점진적 마이그레이션)
export async function cacheAssignmentCandidates(): Promise<void> {
  // 더 이상 사용하지 않음 - 엔티티 기반으로 대체
  logger.warn('[Cache] cacheAssignmentCandidates는 deprecated. 엔티티 기반 캐싱 사용 권장.');
}

export async function getCachedAssignmentCandidates(): Promise<null> {
  logger.warn('[Cache] getCachedAssignmentCandidates는 deprecated. 엔티티 기반 캐싱 사용 권장.');
  return null;
}

export async function invalidateAssignmentCandidates(): Promise<void> {
  logger.warn('[Cache] invalidateAssignmentCandidates는 deprecated.');
}
