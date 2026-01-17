// server/src/config/redis.ts
// Upstash Redis 클라이언트 설정

import { Redis } from '@upstash/redis';
import logger from './logger';

// 싱글톤 인스턴스
let redis: Redis | null = null;

/**
 * Redis 클라이언트 초기화
 * 환경변수가 없으면 null 반환 (캐싱 비활성화)
 */
export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.warn('[Redis] UPSTASH_REDIS_REST_URL 또는 TOKEN이 설정되지 않음. 캐싱 비활성화.');
    return null;
  }

  try {
    redis = new Redis({ url, token });
    logger.info('[Redis] Upstash Redis 연결 완료');
    return redis;
  } catch (error) {
    logger.error('[Redis] 연결 실패:', error);
    return null;
  }
}

/**
 * 캐시 키 생성 헬퍼
 */
export const CACHE_KEYS = {
  // 배정 후보 데이터 (사용자별)
  assignmentCandidates: (userId: number) => `candidates:${userId}`,
  // 메타데이터 (전역)
  teams: 'metadata:teams',
  virtues: 'metadata:virtues',
};

/**
 * 캐시 TTL (초)
 * - 0 = 무한 (무효화 로직이 완전히 구현됨)
 */
export const CACHE_TTL = {
  instructor: 0, // 무한 - 수정/삭제 시 무효화
  unit: 0, // 무한 - 수정/삭제 시 무효화
  metadata: 86400, // 24시간 - 팀, 덕목 등
};

export default getRedis;
