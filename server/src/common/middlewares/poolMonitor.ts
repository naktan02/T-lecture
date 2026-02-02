// server/src/common/middlewares/poolMonitor.ts
import { Request, Response, NextFunction } from 'express';
import { pool } from '../../libs/prisma';
import logger from '../../config/logger';
import { Sentry } from '../../config/sentry';

/**
 * DB 연결 풀 모니터링 미들웨어
 * - 대기 중인 요청이 많으면 경고 로그 전송
 * - 연결 풀이 거의 고갈되면 503 에러 반환
 * 
 * 임계값 설정 근거 (pool max: 20):
 * - 대기 7개 (35% 초과): 경고 - 부하 증가 감지
 * - 대기 12개 (60% 초과): 차단 - 서비스 보호 필요
 */
export const poolMonitor = (req: Request, res: Response, next: NextFunction): void => {
    const { totalCount, idleCount, waitingCount } = pool;
    const max = pool.options.max ?? 10;
    const warnThreshold = Math.max(1, Math.ceil(max * 0.5));
    const errorThreshold = Math.max(2, Math.ceil(max * 0.8));

    // 대기 중인 요청이 7개 이상이면 경고 (pool의 35% 초과)
    if (waitingCount >= warnThreshold) {
        logger.warn('[Pool Warning] High waiting count', {
            total: totalCount,
            idle: idleCount,
            waiting: waitingCount,
            max,
            warnThreshold,
            path: req.path,
            method: req.method,
        });

        // Sentry에 경고 전송
        Sentry.captureMessage(`DB Pool congestion: ${waitingCount} waiting`, 'warning');
    }

    // 연결 풀 심각하게 고갈 시 503 반환 (pool의 60% 초과)
    if (waitingCount >= errorThreshold) {
        logger.error('[Pool Exhausted] Rejecting request', {
            total: totalCount,
            idle: idleCount,
            waiting: waitingCount,
            max,
            errorThreshold,
            path: req.path,
            method: req.method,
        });

        res.status(503).json({
            error: '서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
            code: 'POOL_EXHAUSTED',
            statusCode: 503,
        });
        return;
    }

    next();
};

export default poolMonitor;
