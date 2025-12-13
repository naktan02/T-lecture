// server/src/domains/assignment/assignment.controller.js
const assignmentService = require('./assignment.service');
const assignmentDTO = require('./assignment.dto');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const AppError = require('../../common/errors/AppError');
const logger = require('../../config/logger');

// [근무 이력 조회] (Confirmed + Past)
exports.getWorkHistory = asyncHandler(async (req, res) => {
  const history = await assignmentService.getWorkHistory(req.user.id);
  res.json(history);
});

// [배정 목록 조회] (Active + Future)
exports.getAssignments = asyncHandler(async (req, res) => {
  const assignments = await assignmentService.getUpcomingAssignments(req.user.id);
  res.json(assignments);
});

// [임시 배정 응답] (수락/거절)
exports.respondAssignment = asyncHandler(async (req, res) => {
  const { unitScheduleId } = req.params;
  const { response } = req.body || {};

  if (!unitScheduleId || !response) {
    throw new AppError('필수 파라미터가 누락되었습니다.', 400, 'VALIDATION_ERROR');
  }

  // ✅ 상태 변경 이벤트 로그만 남김 (에러 로그는 errorHandler가 담당)
  logger.info('[assignment.respond]', {
    userId: req.user.id,
    unitScheduleId,
    response,
  });

  const result = await assignmentService.respondToAssignment(
    req.user.id,
    unitScheduleId,
    response,
  );

  res.json(result);
});

// [배정 후보 데이터 조회] (부대 + 강사)
exports.getCandidates = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query || {};

  if (!startDate || !endDate) {
    throw new AppError('조회 기간이 필요합니다. (startDate, endDate)', 400, 'VALIDATION_ERROR');
  }

  // 1) 서비스: DB Raw 데이터만 조회
  const { unitsRaw, instructorsRaw } =
    await assignmentService.getAssignmentCandidatesRaw(startDate, endDate);

  // 2) DTO: 프론트/UI 맞춤 변환
  const responseData = assignmentDTO.toCandidateResponse(unitsRaw, instructorsRaw);

  res.json(responseData);
});

//자동 배정 실행
exports.autoAssign = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    throw new AppError('기간(startDate, endDate)이 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  // ★ Controller에서 Date 변환 수행
  const s = new Date(startDate);
  const e = new Date(endDate);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    throw new AppError('유효하지 않은 날짜 형식입니다.', 400, 'VALIDATION_ERROR');
  }

  logger.info('[assignment.autoAssign] Start', {
    userId: req.user.id,
    startDate,
    endDate,
  });

  const result = await assignmentService.createAutoAssignments(s, e);

  res.status(200).json(result);
});

// [배정 취소]
exports.cancelAssignmentByAdmin = asyncHandler(async (req, res) => {
    // Body에서 instructorId와 unitScheduleId를 받음
    const { unitScheduleId, instructorId } = req.body;

    if (!unitScheduleId || !instructorId) {
        throw new AppError('unitScheduleId와 instructorId가 필요합니다.', 400, 'VALIDATION_ERROR');
    }

    // Service 호출
    // req.user.id: 요청자(관리자) ID
    // req.user.role: 요청자 권한 (미들웨어에서 세팅되었다고 가정)
    const result = await assignmentService.cancelAssignment(
        req.user.id, 
        req.user.role || 'ADMIN', // role이 없다면 로직에 맞게 조정
        instructorId,             // 취소 당하는 강사 ID
        unitScheduleId            // 스케줄 ID
    );
    
    res.json(result);
});