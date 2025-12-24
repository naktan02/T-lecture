// server/src/domains/unit/unit.routes.ts
import express from 'express';
import multer from 'multer';
import * as unitController from './unit.controller';
import { auth, requireRole } from '../../common/middlewares';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 모든 부대 관련 API는 관리자(ADMIN) 권한 필요
router.use(auth, requireRole('ADMIN'));

// 부대 목록 조회
router.get('/', unitController.getUnitList);

// 부대 단건 등록
router.post('/', unitController.registerSingleUnit);

// 엑셀 파일 등록
router.post('/upload/excel', upload.single('file'), unitController.uploadExcelAndRegisterUnits);

// ✅ 부대 일괄 삭제 (body에 { ids: [...] } 전달) - 반드시 /:id 앞에 위치해야 함
router.delete('/batch/delete', unitController.deleteMultipleUnits);

// 부대 상세 조회
router.get('/:id', unitController.getUnitDetail);

// 부대 기본 정보 수정
router.patch('/:id/basic', unitController.updateBasicInfo);

// 부대 책임자 정보 수정
router.patch('/:id/officer', unitController.updateOfficerInfo);

// 부대 전체 정보 수정 (기본정보 + 교육장소 + 일정)
router.put('/:id', unitController.updateUnitFull);

// 부대 일정 추가
router.post('/:id/schedules', unitController.addSchedule);

// 부대 일정 삭제
router.delete('/:id/schedules/:scheduleId', unitController.removeSchedule);

// 부대 삭제
router.delete('/:id', unitController.deleteUnit);

export default router;

// CommonJS 호환
module.exports = router;
