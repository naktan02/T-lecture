// server/src/domains/distance/controllers/distance.controller.js
const distanceService = require('../../../domains/distance/services/distance.service');
const kakaoUsageRepository = require('../../../domains/distance/repositories/kakaoUsage.repository');

exports.getDistance = async (req, res, next) => {
    try {
        const instructorId = Number(req.params.instructorId);
        const unitId = Number(req.params.unitId);
        const record = await distanceService.getDistance(instructorId, unitId);
        res.json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUnitsWithinDistance = async (req, res, next) => {
    try {
        const instructorId = Number(req.params.instructorId);
        const min = Number(req.query.min ?? 0);
        const max = Number(req.query.max ?? 999999);

        const units = await distanceService.getUnitsWithinDistance(
        instructorId,
        min,
        max,
        );
        res.json(units);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getTodayUsage = async (req, res, next) => {
    try {
        const usage = await kakaoUsageRepository.getOrCreateToday();

        const remainingRoute = MAX_ROUTE_PER_DAY - usage.routeCount;
        const remainingGeocode = MAX_GEOCODE_PER_DAY - usage.geocodeCount;

        res.json({
        date: usage.date,
        routeCount: usage.routeCount,
        geocodeCount: usage.geocodeCount,
        remainingRoute,
        remainingGeocode,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.runDailyBatchOnce = async (req, res, next) => {
    try {
        const limit = Number(req.body.limit ?? 200);
        const result = await distanceService.calculateDistancesBySchedulePriority(
        limit,
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
