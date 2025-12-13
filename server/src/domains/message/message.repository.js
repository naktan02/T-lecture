// src/domains/message/message.repository.js
const prisma = require('../../libs/prisma');

class MessageRepository {
    /**
     * 1. 임시 메시지 발송 대상 조회
     * - 상태: Pending (임시 배정)
     * - 조건: 'Temporary' 타입의 메시지를 아직 받지 않은 배정 건
     */
    async findTargetsForTemporaryMessage() {
        return await prisma.instructorUnitAssignment.findMany({
        where: {
            state: 'Pending', // 임시 배정 상태
            // 이미 Temporary 메시지가 연결된 적이 없는 건만 조회
            messageAssignments: {
                none: {
                    message: { type: 'Temporary' }
                }
            }
        },
        include: {
            User: true, // 강사 정보
            UnitSchedule: {
            include: {
                unit: true, // 부대 정보
            },
            },
        },
        orderBy: {
            UnitSchedule: { date: 'asc' },
        },
        });
    }

    /**
     * 2. 확정 메시지 발송 대상 조회
     * - 상태: Accepted (수락됨)
     * - 조건: 'Confirmed' 타입의 메시지를 아직 받지 않은 배정 건
     */
    async findTargetsForConfirmedMessage() {
        return await prisma.instructorUnitAssignment.findMany({
        where: {
            state: 'Accepted', // 확정 상태
            messageAssignments: {
                none: {
                    message: { type: 'Confirmed' }
                }
            }
        },
        include: {
            User: {
                include: { instructor: true } // 리더 여부 확인용
            },
            UnitSchedule: {
            include: {
                unit: {
                    include: { trainingLocations: true } // 하위 교육장소 정보
                },
                // 동료 강사 정보 조회를 위해 해당 스케줄의 다른 배정 내역도 가져옴
                assignments: {
                    where: { state: 'Accepted' },
                    include: { User: true }
                }
            },
            },
        },
        });
    }

    /**
     * 3. 메시지 생성 (트랜잭션)
     * - Message 생성
     * - MessageReceipt (수신자) 생성
     * - MessageAssignment (배정 연결) 생성
     */
    async createMessagesBulk(messageDataList) {
        // messageDataList = [{ type, body, userId, assignmentIds: [] }, ...]
        
        return await prisma.$transaction(async (tx) => {
            let count = 0;
            for (const data of messageDataList) {
                // 1) 메시지 본체 생성
                const message = await tx.message.create({
                    data: {
                        type: data.type,
                        body: data.body,
                        status: 'Sent', // 바로 발송됨으로 처리
                        createdAt: new Date(),
                    }
                });

                // 2) 수신자(Receipt) 연결
                await tx.messageReceipt.create({
                    data: {
                        messageId: message.id,
                        userId: data.userId,
                    }
                });

                // 3) 배정(Assignment) 연결 (N:M)
                if (data.assignmentIds && data.assignmentIds.length > 0) {
                    await tx.messageAssignment.createMany({
                        data: data.assignmentIds.map(unitScheduleId => ({
                            messageId: message.id,
                            userId: data.userId,
                            unitScheduleId: unitScheduleId
                        }))
                    });
                }
                count++;
            }
            return count;
        });
    }

    /**
     * 4. 내 메시지 목록 조회
     */
    async findMyMessages(userId) {
        return await prisma.messageReceipt.findMany({
            where: { userId: Number(userId) },
            include: {
                message: true
            },
            orderBy: {
                message: { createdAt: 'desc' }
            }
        });
    }

    /**
     * 5. 메시지 읽음 처리
     */
    async markAsRead(userId, messageId) {
        return await prisma.messageReceipt.update({
            where: {
                userId_messageId: {
                    userId: Number(userId),
                    messageId: Number(messageId)
                }
            },
            data: { readAt: new Date() }
        });
    }
}

module.exports = new MessageRepository();