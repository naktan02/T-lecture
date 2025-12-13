// src/domains/message/message.service.js
const messageRepository = require('./message.repository');

class MessageService {

    /**
     * [Admin] 임시 배정 메시지 일괄 발송
     * - 대상: Pending 상태이면서 아직 메시지 안 받은 사람
     */
    async sendTemporaryMessages() {
        // 1. 대상 조회 (Raw Data)
        const targets = await messageRepository.findTargetsForTemporaryMessage();
        if (targets.length === 0) return { count: 0, message: '발송할 대상이 없습니다.' };

        // 2. 사용자별로 배정 내역 그룹화 (한 사람이 여러 날짜 배정될 수 있음)
        // Map<userId, { user, assignments: [] }>
        const userMap = new Map();
        
        targets.forEach(assign => {
            const userId = assign.userId;
            if (!userMap.has(userId)) {
                userMap.set(userId, { user: assign.User, assignments: [] });
            }
            userMap.get(userId).assignments.push(assign);
        });

        const messagesToCreate = [];

        // 3. 메시지 본문 생성
        for (const [userId, data] of userMap) {
            const { user, assignments } = data;
            
            // 대표 부대 정보 (보통 같은 부대 연속 일정일 확률 높음, 첫 번째꺼 사용)
            const representative = assignments[0];
            const unit = representative.UnitSchedule.unit;
            
            // 날짜별 스케줄 정리 (예: 12월 11일 : 정정명국) -> 이 부분은 예시 텍스트가 필요하면 로직 추가
            // 여기서는 심플하게 날짜 리스트만 나열하거나, 상세 스케줄 텍스트화
            const scheduleText = assignments.map(a => {
                const dateStr = a.UnitSchedule.date.toISOString().split('T')[0];
                return `- ${dateStr} (${unit.name})`; 
            }).join('\n');

            const body = `
[임시 배정 알림]
${user.name} 강사님, 교육 일정이 임시 배정되었습니다.

- 부대명: ${unit.name}
- 지역: ${unit.region}
- 교육일정:
${scheduleText}

* 하단의 버튼을 통해 [수락] 또는 [거절]을 선택해주세요.
            `.trim();

            messagesToCreate.push({
                type: 'Temporary',
                body,
                userId: userId,
                assignmentIds: assignments.map(a => a.unitScheduleId)
            });
        }

        // 4. 저장 실행
        const count = await messageRepository.createMessagesBulk(messagesToCreate);
        return { count, message: `${count}건의 임시 메시지가 발송되었습니다.` };
    }

    /**
     * [Admin] 확정 배정 메시지 일괄 발송
     * - 대상: Accepted 상태이면서 아직 확정 메시지 안 받은 사람
     * - 리더(TeamLeader) 여부에 따라 내용 다름
     */
    async sendConfirmedMessages() {
        const targets = await messageRepository.findTargetsForConfirmedMessage();
        if (targets.length === 0) return { count: 0, message: '발송할 대상이 없습니다.' };

        const userMap = new Map();
        targets.forEach(assign => {
            const userId = assign.userId;
            if (!userMap.has(userId)) {
                userMap.set(userId, { user: assign.User, assignments: [] });
            }
            userMap.get(userId).assignments.push(assign);
        });

        const messagesToCreate = [];

        for (const [userId, data] of userMap) {
            const { user, assignments } = data;
            const representative = assignments[0];
            const unit = representative.UnitSchedule.unit;
            const unitSchedule = representative.UnitSchedule;

            const isLeader = user.instructor?.isTeamLeader; // 리더 여부 확인

            let body = `[확정 배정 알림]\n${user.name} 강사님, 배정이 확정되었습니다.\n\n`;
            body += `- 부대: ${unit.name}\n`;
            body += `- 주소: ${unit.addressDetail}\n`; // 상세주소 추가

            if (isLeader) {
                // [리더용 추가 정보]
                // 같이 가는 동료 강사 정보 추출
                const colleagues = unitSchedule.assignments
                    .filter(a => a.userId !== userId) // 본인 제외
                    .map(a => `${a.User.name} (${a.User.userphoneNumber})`)
                    .join(', ');

                // 하위 교육장소 정보
                const locations = unit.trainingLocations
                    .map(loc => `[${loc.originalPlace}] 인원: ${loc.plannedCount}명`)
                    .join('\n');

                body += `\n[동료 강사]\n${colleagues || '없음'}\n`;
                body += `\n[교육장소 정보]\n${locations}\n`;
                body += `\n책임 강사로서 인솔 부탁드립니다.`;
            } else {
                // [일반 강사용]
                body += `\n교육 장소로 늦지 않게 도착 부탁드립니다.`;
            }

            messagesToCreate.push({
                type: 'Confirmed',
                body,
                userId: userId,
                assignmentIds: assignments.map(a => a.unitScheduleId)
            });
        }

        const count = await messageRepository.createMessagesBulk(messagesToCreate);
        return { count, message: `${count}건의 확정 메시지가 발송되었습니다.` };
    }

    /**
     * [Instructor] 내 메시지 조회
     */
    async getMyMessages(userId) {
        const receipts = await messageRepository.findMyMessages(userId);
        
        // UI에 보여주기 편한 형태로 변환
        return receipts.map(r => ({
            messageId: r.message.id,
            type: r.message.type,
            status: r.message.status,
            body: r.message.body,
            receivedAt: r.message.createdAt,
            readAt: r.readAt,
            isRead: !!r.readAt
        }));
    }

    /**
     * [Instructor] 메시지 읽음 처리
     */
    async readMessage(userId, messageId) {
        await messageRepository.markAsRead(userId, messageId);
        return { success: true };
    }
}

module.exports = new MessageService();