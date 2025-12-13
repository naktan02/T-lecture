// src/domains/assignment/assignment.algorithm.js

class AssignmentAlgorithm {
    /**
     * 자동 배정 알고리즘 실행
     * @param {Array} units - 부대 목록 (스케줄, 교육장소 포함)
     * @param {Array} instructors - 강사 목록 (가능일 포함)
     * @returns {Array} 배정 결과 [{ unitScheduleId, instructorId, role }]
     */
    execute(units, instructors) {
        const assignments = [];
        const assignedSet = new Set(); // 중복 배정 방지용 (instructorId_date)

        // 1. 부대 스케줄 순회
        for (const unit of units) {
        // 해당 부대의 총 필요 인원 계산 (모든 교육장소의 필요 인원 합)
        // 교육장소별 인원이 없으면 기본값 0 처리
        const totalRequired = unit.trainingLocations.reduce(
            (sum, loc) => sum + (loc.instructorsNumbers || 0),
            0
        );

        if (totalRequired === 0) continue; // 필요 인원 없으면 패스

        for (const schedule of unit.schedules) {
            const scheduleDateStr = schedule.date.toISOString().split('T')[0];
            let currentAssignedCount = 0;

            // 2. 강사 순회 및 매칭
            for (const instructor of instructors) {
            if (currentAssignedCount >= totalRequired) break; // 정원 참

            const instructorId = instructor.userId;
            const key = `${instructorId}_${scheduleDateStr}`;

            // 이미 다른 곳에 배정되었는지 확인
            if (assignedSet.has(key)) continue;

            // 해당 날짜에 근무 가능한지 확인
            const isAvailable = instructor.availabilities.some((a) => {
                const availDateStr = a.availableOn.toISOString().split('T')[0];
                return availDateStr === scheduleDateStr;
            });

            if (isAvailable) {
                // 매칭 성공
                assignments.push({
                unitScheduleId: schedule.id,
                instructorId: instructorId,
                role: 'Main', // 기본 역할 (추후 로직 고도화 가능)
                });

                assignedSet.add(key);
                currentAssignedCount++;
            }
            }
        }
        }

        return assignments;
    }
}

module.exports = new AssignmentAlgorithm();