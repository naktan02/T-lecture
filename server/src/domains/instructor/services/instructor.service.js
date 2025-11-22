// web/server/src/domains/instructor/services/instructor.service.js
const instructorRepository = require('../repositories/instructor.repository');

// [제거됨] getMyProfile -> User 도메인에서 담당

/**
 * 가능 일정 조회
 */
exports.getAvailabilities = async (instructorId, year, month) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const availabilities = await instructorRepository.findAvailabilities(instructorId, startDate, endDate);
  
  // "YYYY-MM-DD" 문자열 배열로 변환
  return availabilities.map(item => item.availableOn.toISOString().split('T')[0]);
};

/**
 * 가능 일정 수정 (제약 조건: 이미 배정된 날짜 제외 불가)
 */
exports.updateAvailabilities = async (instructorId, year, month, newDatesStr) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // 1. 해당 기간에 이미 배정된(Active) 날짜 조회
  const activeAssignmentDates = await instructorRepository.findActiveAssignmentsDate(instructorId, startDate, endDate);

  // 2. 유효성 검사: 배정된 날짜가 newDatesStr에 모두 포함되어 있는지 확인
  const assignedDatesSet = new Set(activeAssignmentDates.map(d => d.toISOString().split('T')[0]));
  const newDatesSet = new Set(newDatesStr);

  for (const assignedDate of assignedDatesSet) {
    if (!newDatesSet.has(assignedDate)) {
      throw new Error(`이미 배정이 확정된 날짜(${assignedDate})는 근무 가능일에서 제외할 수 없습니다.`);
    }
  }

  // 3. 업데이트 수행
  await instructorRepository.replaceAvailabilities(instructorId, startDate, endDate, newDatesStr);
  
  return { message: '근무 가능일이 저장되었습니다.' };
};

/**
 * 근무 이력 조회 (Confirmed + Past)
 */
exports.getWorkHistory = async (instructorId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await instructorRepository.findAssignments(instructorId, {
    classification: 'Confirmed', // 확정된 건만
    state: 'Active',             // 취소되지 않은 건
    UnitSchedule: {
      date: {
        lt: today, // 과거 일정
      },
    },
  });
};

/**
 * 배정 목록 조회 (Upcoming: Active + Future)
 */
exports.getUpcomingAssignments = async (instructorId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await instructorRepository.findAssignments(instructorId, {
    state: 'Active',
    UnitSchedule: {
      date: {
        gte: today, // 오늘 포함 미래
      },
    },
  });
};

/**
 * 임시 배정 응답 (수락/거절)
 */
exports.respondToAssignment = async (instructorId, unitScheduleId, response) => {
  // 1. 배정 건 존재 확인
  const assignment = await instructorRepository.findAssignmentByScheduleId(instructorId, unitScheduleId);
  if (!assignment) {
    throw new Error('해당 배정 정보를 찾을 수 없습니다.');
  }

  if (assignment.classification === 'Confirmed') {
    throw new Error('이미 확정된 배정입니다.');
  }
  if (assignment.state === 'Canceled') {
    throw new Error('이미 취소된 배정입니다.');
  }

  // 2. 응답 처리
  let updateData = {};
  if (response === 'ACCEPT') {
    updateData = { classification: 'Confirmed' };
  } else if (response === 'REJECT') {
    updateData = { state: 'Canceled' };
  } else {
    throw new Error('잘못된 응답입니다. (ACCEPT 또는 REJECT)');
  }

  await instructorRepository.updateAssignment(instructorId, unitScheduleId, updateData);

  return { message: response === 'ACCEPT' ? '배정을 수락했습니다.' : '배정을 거절했습니다.' };
};

/**
 * 확정 배정 상세 조회
 */
exports.getAssignmentDetail = async (instructorId, unitScheduleId) => {
  const assignment = await instructorRepository.findAssignmentByScheduleId(instructorId, unitScheduleId);

  if (!assignment) {
    throw new Error('배정 정보를 찾을 수 없습니다.');
  }

  // 확정된 일정만 상세 정보 노출
  if (assignment.classification !== 'Confirmed' || assignment.state !== 'Active') {
    throw new Error('확정된 배정 일정만 상세 정보를 조회할 수 있습니다.');
  }

  return assignment;
};