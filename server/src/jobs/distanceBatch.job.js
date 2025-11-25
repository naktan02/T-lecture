// server/src/jobs/distanceBatch.job.js
const cron = require('node-cron');
const distanceService = require('../domains/distance/distance.service');

/**
 * 매일 새벽 3시에 거리 배치 실행
 */
cron.schedule('0 3 * * *', async () => {
    try {
        console.log('[DistanceBatch] start');
        const result = await distanceService.calculateDistancesBySchedulePriority(
        200,
        );
        console.log('[DistanceBatch] done:', result);
    } catch (err) {
        console.error('[DistanceBatch] error:', err);
    }
});
