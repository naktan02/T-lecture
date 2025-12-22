// server/src/domains/unit/unit.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

const unitController = require('./unit.controller');
const { auth, requireRole } = require('../../common/middlewares');

const upload = multer({ storage: multer.memoryStorage() });

// 모든 부대 관련 API는 관리자(ADMIN) 권한 필요
router.use(auth, requireRole('ADMIN'));

// 부대 목록 조회
router.get('/', unitController.getUnitList);

// 부대 단건 등록
router.post('/', unitController.registerSingleUnit);

// 엑셀 파일 등록
router.post('/upload/excel', upload.single('file'), unitController.uploadExcelAndRegisterUnits);

// 부대 상세 조회
router.get('/:id', unitController.getUnitDetail);

// 부대 기본 정보 수정
router.patch('/:id/basic', unitController.updateBasicInfo);

// 부대 책임자 정보 수정
router.patch('/:id/officer', unitController.updateOfficerInfo);

// 부대 일정 추가
router.post('/:id/schedules', unitController.addSchedule);

// 부대 일정 삭제
router.delete('/:id/schedules/:scheduleId', unitController.removeSchedule);

// 부대 삭제
router.delete('/:id', unitController.deleteUnit);

module.exports = router;
