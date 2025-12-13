//server/src/domains/instructor/controllers/instructor.controller.js
const instructorService = require('./instructor.service');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const AppError = require('../../common/errors/AppError');

// [제거됨] getMe, updateMe -> User 도메인의 /users/me 사용

// 1. [기존] 근무 가능일 조회
exports.getAvailability = asyncHandler(async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) throw new AppError('연도(year)와 월(month) 파라미터가 필요합니다.', 400, 'VALIDATION_ERROR');
  
  const result = await instructorService.getAvailabilities(req.user.id, Number(year), Number(month));
  res.json(result);
});

// 2. [기존] 근무 가능일 수정
exports.updateAvailability = asyncHandler(async (req, res) => {
  const { year, month, dates } = req.body;
  if (!year || !month || !Array.isArray(dates)) throw new AppError('잘못된 요청 데이터입니다.', 400, 'VALIDATION_ERROR');
  
  const result = await instructorService.updateAvailabilities(req.user.id, Number(year), Number(month), dates);
  res.json(result);
});

// 3. [신규] 강사 통계 조회
exports.getMyStats = asyncHandler(async (req, res) => {
  const stats = await instructorService.getInstructorStats(req.user.id);
  res.json(stats);
});

// 4. [신규] 강의 가능 과목 수정
exports.updateVirtues = asyncHandler(async (req, res) => {
  const { virtueIds } = req.body; // ex: [1, 2]
  if (!Array.isArray(virtueIds)) throw new AppError('virtueIds는 배열이어야 합니다.', 400, 'VALIDATION_ERROR');
  
  const result = await instructorService.updateVirtues(req.user.id, virtueIds);
  res.json(result);
});

// 5. [변경] 승급 신청
exports.requestPromotion = asyncHandler(async (req, res) => {
  const { desiredLevel } = req.body; // 예: 'Main' (주강사)
  if (!desiredLevel) throw new AppError('희망하는 승급 등급(desiredLevel)을 입력해주세요.', 400, 'VALIDATION_ERROR');
  
  const result = await instructorService.requestPromotion(req.user.id, desiredLevel);
  res.json(result);
});