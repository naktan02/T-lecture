// src/domains/metadata/metadata.routes.js
const express = require('express');
const router = express.Router();
const metadataController = require('./metadata.controller');
const { auth, requireRole } = require('../../common/middlewares');

// 1. 강사 가입용 메타데이터 (통합)
// GET /api/v1/metadata/instructor
router.get('/instructor', metadataController.getInstructorMeta);

// 2. 팀 목록 조회
// GET /api/v1/metadata/teams
router.get('/teams', metadataController.getTeams);

// 3. 덕목 목록 조회
// GET /api/v1/metadata/virtues
router.get('/virtues', metadataController.getVirtues);

// 4. 메시지 템플릿 목록 조회 (관리자 전용 추천)
// GET /api/v1/metadata/templates
router.get(
    '/templates', 
    auth, 
    requireRole('ADMIN'), // 템플릿 내용은 관리자만 볼 수 있게 제한
    metadataController.getMessageTemplates
);

// 1. 팀 수정 (PUT /api/v1/metadata/teams/:id)
router.put(
    '/teams/:id',
    auth,
    requireRole('ADMIN'),
    metadataController.updateTeam
);

// 2. 덕목 수정 (PUT /api/v1/metadata/virtues/:id)
router.put(
    '/virtues/:id',
    auth,
    requireRole('ADMIN'),
    metadataController.updateVirtue
);

// 3. 템플릿 수정 (PUT /api/v1/metadata/templates/:key)
// 예: /api/v1/metadata/templates/TEMPORARY
router.put(
    '/templates/:key',
    auth,
    requireRole('ADMIN'),
    metadataController.updateTemplate
);

module.exports = router;