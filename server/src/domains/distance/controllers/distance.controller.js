// server/src/modules/distance/controllers/distance.controller.js
const distanceService = require('../services/distance.service');

exports.calculateDistance = async (req, res) => {
    try {
        const { instructorId, unitId } = req.body;
        if (!instructorId || !unitId) {
        return res.status(400).json({ error: 'instructorId and unitId are required' });
        }

        const result = await distanceService.calculateAndSaveDistance(
        Number(instructorId),
        Number(unitId)
        );
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getDistance = async (req, res) => {
    try {
        const { instructorId, unitId } = req.params;
        const record = await distanceService.getDistance(Number(instructorId), Number(unitId));
        res.status(200).json(record);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};

exports.getUnitsWithinDistance = async (req, res) => {
    try {
        const { instructorId } = req.params;
        const { minDistance, maxDistance } = req.query;

        const distances = await distanceService.getUnitsWithinDistance(
        Number(instructorId),
        Number(minDistance),
        Number(maxDistance)
        );

        res.status(200).json({
        instructorId: Number(instructorId),
        minDistance: Number(minDistance),
        maxDistance: Number(maxDistance),
        count: distances.length,
        distances,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * 일일 배치 엔드포인트
 */
exports.calculateDailyDistances = async (req, res) => {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 200;
        const result = await distanceService.calculateDistancesBySchedulePriority(limit);
        res.status(200).json(result);
    } catch (error) {
        console.error('Daily distance batch error:', error);
        res.status(500).json({ error: error.message });
    }
};
