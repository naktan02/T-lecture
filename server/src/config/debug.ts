// server/src/config/debug.ts
// 모듈별 디버그 로깅 on/off 설정

/**
 * 각 모듈의 디버그 로깅 활성화 여부
 * - true: 해당 모듈의 logger.debug() 호출이 출력됨
 * - false: 해당 모듈의 디버그 로그 무시
 *
 * 사용법:
 * import { DEBUG } from '../../config/debug';
 * if (DEBUG.ASSIGNMENT) logger.debug('...');
 */
export const DEBUG = {
  // 배정 알고리즘 관련
  ASSIGNMENT: true,

  // 인증/권한 관련
  AUTH: false,

  // 스케줄러/크론 관련
  SCHEDULER: false,

  // API 요청/응답 관련
  API: false,

  // 데이터베이스 쿼리 관련
  DATABASE: false,
};

export default DEBUG;
