//server/src/domains/assignment/assignment.controller.js

const instructorService = require('./assignment.service');
// [근무 이력 조회]
exports.getWorkHistory = async (req, res) => {
    try {
        const history = await instructorService.getWorkHistory(req.user.id);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [배정 목록 조회]
exports.getAssignments = async (req, res) => {
    try {
        const assignments = await instructorService.getUpcomingAssignments(req.user.id);
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [임시 배정 응답]
exports.respondAssignment = async (req, res) => {
    try {
        const { unitScheduleId } = req.params;
        const { response } = req.body; // 'ACCEPT' or 'REJECT'
        
        if (!unitScheduleId || !response) throw new Error('필수 파라미터가 누락되었습니다.');

        const result = await instructorService.respondToAssignment(req.user.id, unitScheduleId, response);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// [확정 배정 상세 조회]
exports.getAssignmentDetail = async (req, res) => {
    try {
        const { unitScheduleId } = req.params;
        const detail = await instructorService.getAssignmentDetail(req.user.id, unitScheduleId);
        res.json(detail);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};