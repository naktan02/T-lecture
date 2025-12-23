// server/src/jobs/distanceBatch.job.ts
import cron from 'node-cron';
import distanceService from '../domains/distance/distance.service';
import logger from '../config/logger';

/**
 * 매일 새벽 3시에 거리 배치 실행
 */
cron.schedule('0 3 * * *', async () => {
  try {
    logger.info('[DistanceBatch] start');
    const result = await distanceService.calculateDistancesBySchedulePriority(200);
    logger.info(`[DistanceBatch] done: ${JSON.stringify(result)}`);
  } catch (err) {
    logger.error(`[DistanceBatch] error: ${err instanceof Error ? err.message : err}`);
  }
});
