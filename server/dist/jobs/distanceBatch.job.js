"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/jobs/distanceBatch.job.ts
const node_cron_1 = __importDefault(require("node-cron"));
const distance_service_1 = __importDefault(require("../domains/distance/distance.service"));
const logger_1 = __importDefault(require("../config/logger"));
/**
 * 매일 새벽 3시에 거리 배치 실행
 */
node_cron_1.default.schedule('0 3 * * *', async () => {
    try {
        logger_1.default.info('[DistanceBatch] start');
        const result = await distance_service_1.default.calculateDistancesBySchedulePriority(200);
        logger_1.default.info(`[DistanceBatch] done: ${JSON.stringify(result)}`);
    }
    catch (err) {
        logger_1.default.error(`[DistanceBatch] error: ${err instanceof Error ? err.message : err}`);
    }
});
