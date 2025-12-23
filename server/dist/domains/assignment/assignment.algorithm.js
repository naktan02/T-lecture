"use strict";
// src/domains/assignment/assignment.algorithm.ts
Object.defineProperty(exports, "__esModule", { value: true });
class AssignmentAlgorithm {
    /**
     * 자동 배정 알고리즘 실행
     */
    execute(units, instructors) {
        const assignments = [];
        const assignedSet = new Set(); // 중복 배정 방지용 (instructorId_date)
        // 1. 부대 스케줄 순회
        for (const unit of units) {
            // 해당 부대의 총 필요 인원 계산
            const totalRequired = unit.trainingLocations.reduce((sum, loc) => sum + (loc.instructorsNumbers || 0), 0);
            if (totalRequired === 0)
                continue;
            for (const schedule of unit.schedules) {
                const scheduleDateStr = schedule.date.toISOString().split('T')[0];
                let currentAssignedCount = 0;
                // 2. 강사 순회 및 매칭
                for (const instructor of instructors) {
                    if (currentAssignedCount >= totalRequired)
                        break;
                    const instructorId = instructor.userId;
                    const key = `${instructorId}_${scheduleDateStr}`;
                    if (assignedSet.has(key))
                        continue;
                    // 해당 날짜에 근무 가능한지 확인
                    const isAvailable = instructor.availabilities.some((a) => {
                        const availDateStr = a.availableOn.toISOString().split('T')[0];
                        return availDateStr === scheduleDateStr;
                    });
                    if (isAvailable) {
                        assignments.push({
                            unitScheduleId: schedule.id,
                            instructorId: instructorId,
                            role: 'Main',
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
exports.default = new AssignmentAlgorithm();
// CommonJS 호환
module.exports = new AssignmentAlgorithm();
