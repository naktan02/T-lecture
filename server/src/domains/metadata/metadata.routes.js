// src/domains/metadata/metadata.routes.js
const express = require('express');
const router = express.Router();
const metadataController = require('./metadata.controller');

// 강사 관련 메타데이터 (과목/팀/직책)
// GET /api/v1/metadata/instructor
router.get('/instructor', metadataController.getInstructorMeta);

module.exports = router;
