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

// 엑셀 양식 다운로드 (템플릿)
router.get('/template/excel', unitController.downloadExcelTemplate);

// ✅ 부대 일괄 삭제 (body에 { ids: [...] } 전달) - 반드시 /:id 앞에 위치해야 함
router.delete('/batch/delete', unitController.deleteMultipleUnits);

// 부대 상세 조회
router.get('/:id', unitController.getUnitDetail);

// 부대 기본 정보 수정
router.patch('/:id/basic', unitController.updateBasicInfo);

// 부대 책임자 정보 수정
router.patch('/:id/officer', unitController.updateOfficerInfo);

// 교육기간 추가
router.post('/:id/training-periods', unitController.createTrainingPeriod);

// 부대 + 교육기간 + 장소 전체 업데이트 (주소, 일정 제외)

router.put('/:id', unitController.updateUnitWithPeriods);

// 부대 주소만 수정 (좌표 재계산)
router.patch('/:id/address', unitController.updateUnitAddress);

// 부대 일정만 수정 (교육시작, 교육종료, 교육불가일자) - 레거시
// ===== TrainingPeriod 일정 관리 =====
// 교육기간 일정 수정 (시작일, 종료일, 불가일자)
router.patch('/training-periods/:periodId/schedule', unitController.updateTrainingPeriodSchedule);

// 교육기간 장소 수정
router.patch(
  '/training-periods/:periodId/schedule-locations',
  unitController.updateTrainingPeriodScheduleLocations,
);

// 교육기간 기본정보 수정 (근무시간, 담당관, 시설정보, 교육기간명)
router.patch('/training-periods/:periodId/info', unitController.updateTrainingPeriodInfo);

// 교육기간 삭제
router.delete('/training-periods/:periodId', unitController.deleteTrainingPeriod);

// 교육기간 일정 삭제 전 배정 확인
router.post('/training-periods/:periodId/schedule/check', unitController.checkScheduleAssignments);

// 교육일정 추가
router.post('/:id/schedules', unitController.addSchedule);

// 교육일정 삭제
router.delete('/:id/schedules/:scheduleId', unitController.removeSchedule);

// 부대 삭제
router.delete('/:id', unitController.deleteUnit);

export default router;

// CommonJS 호환
module.exports = router;
