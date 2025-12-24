// src/domains/metadata/metadata.routes.ts
import express from 'express';
import * as metadataController from './metadata.controller';
import { auth, requireRole } from '../../common/middlewares';

const router = express.Router();

// 강사 가입용 메타데이터 (통합)
router.get('/instructor', metadataController.getInstructorMeta);

// 팀 목록 조회
router.get('/teams', metadataController.getTeams);

// 덕목 목록 조회
router.get('/virtues', metadataController.getVirtues);

// 메시지 템플릿 목록 조회 (관리자 전용 추천)
router.get('/templates', auth, requireRole('ADMIN'), metadataController.getMessageTemplates);

// 팀 생성
router.post('/teams', auth, requireRole('ADMIN'), metadataController.createTeam);

// 팀 수정
router.put('/teams/:id', auth, requireRole('ADMIN'), metadataController.updateTeam);

// 팀 삭제 (Soft Delete)
router.delete('/teams/:id', auth, requireRole('ADMIN'), metadataController.deleteTeam);

// 덕목 생성
router.post('/virtues', auth, requireRole('ADMIN'), metadataController.createVirtue);

// 덕목 수정
router.put('/virtues/:id', auth, requireRole('ADMIN'), metadataController.updateVirtue);

// 덕목 삭제 (Hard Delete)
router.delete('/virtues/:id', auth, requireRole('ADMIN'), metadataController.deleteVirtue);

// 템플릿 수정
router.put('/templates/:key', auth, requireRole('ADMIN'), metadataController.updateTemplate);

export default router;

// CommonJS 호환
module.exports = router;
