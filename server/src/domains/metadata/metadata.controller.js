// src/domains/metadata/metadata.controller.js
const metadataService = require('./metadata.service');

exports.getInstructorMeta = async (req, res) => {
    try {
        const data = await metadataService.getInstructorMeta();
        res.status(200).json(data);
    } catch (error) {
        console.error('[GET /metadata/instructor] ERROR:', error);
        res.status(500).json({ error: '메타데이터 조회 중 오류가 발생했습니다.' });
    }
};
