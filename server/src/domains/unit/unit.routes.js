// server/src/domains/unit/unit.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

const unitController = require('./unit.controller');
const { auth, requireRole } = require('../../common/middlewares');

const upload = multer({ storage: multer.memoryStorage() });

// 모든 부대 관련 API는 관리자(ADMIN) 권한 필요
router.use(auth, requireRole('ADMIN'));

// [조회 및 등록]
router.get('/', unitController.getUnitList);
router.post('/', unitController.registerSingleUnit);
router.post('/upload/excel', upload.single('file'), unitController.uploadExcelAndRegisterUnits); // 엑셀 파일

// [상세 및 수정]
router.get('/:id', unitController.getUnitDetail);
router.patch('/:id/basic', unitController.updateBasicInfo);
router.patch('/:id/officer', unitController.updateOfficerInfo);

// [하위 리소스]
router.post('/:id/schedules', unitController.addSchedule);
router.delete('/:id/schedules/:scheduleId', unitController.removeSchedule);

// [삭제]
router.delete('/:id', unitController.deleteUnit);

module.exports = router;
