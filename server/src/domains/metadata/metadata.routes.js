// src/domains/metadata/metadata.routes.js
const express = require('express');
const router = express.Router();
const metadataController = require('./metadata.controller');
const { auth, requireRole } = require('../../common/middlewares');

// 강사 가입용 메타데이터 (통합)
router.get('/instructor', metadataController.getInstructorMeta);

// 팀 목록 조회
router.get('/teams', metadataController.getTeams);

// 덕목 목록 조회
router.get('/virtues', metadataController.getVirtues);

// 메시지 템플릿 목록 조회 (관리자 전용 추천)
router.get('/templates', auth, requireRole('ADMIN'), metadataController.getMessageTemplates);

// 팀 수정
router.put('/teams/:id', auth, requireRole('ADMIN'), metadataController.updateTeam);

// 덕목 수정
router.put('/virtues/:id', auth, requireRole('ADMIN'), metadataController.updateVirtue);

// 템플릿 수정
router.put('/templates/:key', auth, requireRole('ADMIN'), metadataController.updateTemplate);

module.exports = router;