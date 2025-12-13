// server/src/domains/assignment/assignment.service.js
const assignmentRepository = require('./assignment.repository');
const unitRepository = require('../unit/unit.repository');
const instructorRepository = require('../instructor/instructor.repository');
const AppError = require('../../common/errors/AppError');

/**
 * 강사 배정 비즈니스 로직 전담 Service
 */
class AssignmentService {
    /**
     * 배정 후보 데이터 조회 (Raw Data 반환)
     * - DTO에서 UI 형태로 변환하도록 Raw만 반환
     */
    async getAssignmentCandidatesRaw(startDate, endDate) {
        const unitsRaw = await unitRepository.findWithSchedules(startDate, endDate);
        const instructorsRaw = await instructorRepository.findAvailableInPeriod(startDate, endDate);
        return { unitsRaw, instructorsRaw };
    }

    /**
     * 근무 이력 조회 (Confirmed + Past)
     */
    async getWorkHistory(instructorId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return await assignmentRepository.findAssignments(instructorId, {
        classification: 'Confirmed',
        state: 'Active',
        UnitSchedule: { date: { lt: today } },
        });
    }

    /**
     * 배정 목록 조회 (Active + Future)
     */
    async getUpcomingAssignments(instructorId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return await assignmentRepository.findAssignments(instructorId, {
        state: 'Active',
        UnitSchedule: { date: { gte: today } },
        });
    }

    /**
     * 임시 배정 응답 (수락/거절)
     */
    async respondToAssignment(instructorId, unitScheduleId, response) {
        const assignment = await assignmentRepository.findAssignmentByScheduleId(
        instructorId,
        unitScheduleId,
        );

        if (!assignment) {
        throw new AppError('해당 배정 정보를 찾을 수 없습니다.', 404, 'NOT_FOUND');
        }
        if (assignment.classification === 'Confirmed') {
        throw new AppError('이미 확정된 배정입니다.', 409, 'ALREADY_CONFIRMED');
        }
        if (assignment.state === 'Canceled') {
        throw new AppError('이미 취소된 배정입니다.', 409, 'ALREADY_CANCELED');
        }

        let updateData;
        if (response === 'ACCEPT') updateData = { classification: 'Confirmed' };
        else if (response === 'REJECT') updateData = { state: 'Canceled' };
        else throw new AppError('잘못된 응답입니다. (ACCEPT 또는 REJECT)', 400, 'VALIDATION_ERROR');

        await assignmentRepository.updateAssignment(instructorId, unitScheduleId, updateData);

        return {
        message: response === 'ACCEPT' ? '배정을 수락했습니다.' : '배정을 거절했습니다.',
        };
    }

    /**
     * 확정 배정 상세 조회
     */
    async getAssignmentDetail(instructorId, unitScheduleId) {
        const assignment = await assignmentRepository.findAssignmentByScheduleId(
        instructorId,
        unitScheduleId,
        );

        if (!assignment) {
        throw new AppError('배정 정보를 찾을 수 없습니다.', 404, 'NOT_FOUND');
        }

        if (assignment.classification !== 'Confirmed' || assignment.state !== 'Active') {
        throw new AppError('확정된 배정 일정만 상세 정보를 조회할 수 있습니다.', 403, 'FORBIDDEN');
        }

        return assignment;
    }

    async createAutoAssignments(startDate, endDate) {
        // 0) 입력 검증 (서비스에선 Date 객체라고 가정)
        // 컨트롤러에서 변환해서 넘겨주는 것을 권장하지만, 방어코드로 남겨둠
        if (startDate > endDate) {
        throw new AppError('시작일은 종료일보다 클 수 없습니다.', 400, 'VALIDATION_ERROR');
        }

        // 1) 데이터 준비 (Repository 교체)
        // 기존 unitRepository.findWithSchedules -> assignmentRepository.findUnitsWithAssignments
        const units = await assignmentRepository.findUnitsWithAssignments(startDate, endDate);
        const instructors = await instructorRepository.findAvailableInPeriod(startDate, endDate);

        // 데이터 검증
        if (!units || units.length === 0) {
        throw new AppError('해당 기간에 조회되는 부대 일정이 없습니다.', 404, 'NO_UNITS');
        }
        if (!instructors || instructors.length === 0) {
        throw new AppError('해당 기간에 배정 가능한 강사가 없습니다.', 404, 'NO_INSTRUCTORS');
        }

        // 2) 알고리즘 실행
        const matchResults = assignmentAlgorithm.execute(units, instructors);

        if (!matchResults || matchResults.length === 0) {
        // 정책: 결과 없으면 에러 (또는 빈 배열 반환)
        throw new AppError('배정 가능한 매칭 결과가 없습니다.', 404, 'NO_MATCHES');
        }

        // 3) DB 저장 (트랜잭션 + Repository 위임)
        const summary = { requested: matchResults.length, created: 0, skipped: 0 };

        await prisma.$transaction(async (tx) => {
        for (const match of matchResults) {
            try {
            // ★ Repository에 tx를 전달하여 역할 분리
            await assignmentRepository.createAssignment(
                {
                unitScheduleId: match.unitScheduleId,
                userId: match.instructorId,
                classification: 'Temporary',
                state: 'Active',
                ...(match.role ? { role: match.role } : {}), // role 컬럼 존재 시
                },
                tx
            );
            summary.created += 1;
            } catch (e) {
            // 중복 배정 시 skip (P2002)
            if (e.code === 'P2002') {
                summary.skipped += 1;
                continue;
            }
            throw e; // 그 외 에러는 전파
            }
        }
        });

        // 4) 최신 데이터 재조회 (Repository 교체)
        const updatedUnits = await assignmentRepository.findUnitsWithAssignments(startDate, endDate);

        // 5) 결과 반환
        return {
        summary,
        data: assignmentDTO.toHierarchicalResponse(updatedUnits),
        };
    }



}

module.exports = new AssignmentService();
