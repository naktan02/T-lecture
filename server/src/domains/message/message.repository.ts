// src/domains/message/message.repository.ts
import prisma from '../../libs/prisma';

interface NoticeData {
  title: string;
  body: string;
}

interface MessageCreateData {
  type: 'Temporary' | 'Confirmed';
  title?: string;
  body: string;
  userId: number;
  assignmentIds?: number[];
}

class MessageRepository {
  // 공지사항 생성
  async createNotice(data: NoticeData) {
    return await prisma.message.create({
      data: {
        type: 'Notice',
        title: data.title,
        body: data.body,
        status: 'Sent',
        createdAt: new Date(),
      },
    });
  }

  // 모든 공지사항 조회
  async findAllNotices() {
    return await prisma.message.findMany({
      where: { type: 'Notice' },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 임시 메시지 발송 대상 조회 (날짜 범위 필터링)
  async findTargetsForTemporaryMessage(startDate?: string, endDate?: string) {
    return await prisma.instructorUnitAssignment.findMany({
      where: {
        state: 'Pending',
        messageAssignments: {
          none: {
            message: { type: 'Temporary' },
          },
        },
        // 날짜 범위 필터링
        ...(startDate || endDate
          ? {
              UnitSchedule: {
                date: {
                  ...(startDate ? { gte: new Date(startDate) } : {}),
                  ...(endDate ? { lte: new Date(endDate) } : {}),
                },
              },
            }
          : {}),
      },
      include: {
        User: {
          include: {
            instructor: {
              include: {
                virtues: {
                  include: { virtue: true },
                },
              },
            },
          },
        },
        UnitSchedule: {
          include: {
            unit: {
              include: { trainingLocations: true },
            },
            assignments: {
              where: { state: 'Pending' },
              include: { User: { include: { instructor: true } } },
            },
          },
        },
      },
      orderBy: {
        UnitSchedule: { date: 'asc' },
      },
    });
  }

  // 확정 메시지 발송 대상 조회 (부대 단위 재발송 지원)
  // 1. 메시지 미발송자가 있는 부대 찾기
  // 2. 해당 부대의 기존 Confirmed 메시지 연결 삭제
  // 3. 해당 부대의 모든 Accepted 강사 반환
  async findTargetsForConfirmedMessage() {
    // 1단계: 미발송자가 있는 부대의 unitId 목록 조회
    const unsentAssignments = await prisma.instructorUnitAssignment.findMany({
      where: {
        state: 'Accepted',
        classification: 'Confirmed',
        messageAssignments: {
          none: { message: { type: 'Confirmed' } },
        },
      },
      select: {
        UnitSchedule: { select: { unitId: true } },
      },
    });

    const unitIdsNeedingResend = [...new Set(unsentAssignments.map((a) => a.UnitSchedule.unitId))];

    if (unitIdsNeedingResend.length === 0) {
      return [];
    }

    // 2단계: 해당 부대들의 기존 Confirmed 메시지 연결 삭제 (재발송을 위해)
    await prisma.messageAssignment.deleteMany({
      where: {
        assignment: {
          state: 'Accepted',
          classification: 'Confirmed',
          UnitSchedule: { unitId: { in: unitIdsNeedingResend } },
        },
        message: { type: 'Confirmed' },
      },
    });

    // 3단계: 해당 부대의 모든 Accepted 강사 반환
    return await prisma.instructorUnitAssignment.findMany({
      where: {
        state: 'Accepted',
        classification: 'Confirmed',
        UnitSchedule: { unitId: { in: unitIdsNeedingResend } },
      },
      include: {
        User: {
          include: {
            instructor: {
              include: {
                virtues: {
                  include: { virtue: true },
                },
              },
            },
          },
        },
        UnitSchedule: {
          include: {
            unit: {
              include: {
                trainingLocations: true,
                schedules: {
                  orderBy: { date: 'asc' },
                  include: {
                    assignments: {
                      where: { state: 'Accepted' },
                      include: { User: true },
                    },
                  },
                },
              },
            },
            assignments: {
              where: { state: 'Accepted' },
              include: { User: true },
            },
          },
        },
      },
    });
  }

  // 임시, 확정 메시지 생성
  async createMessagesBulk(messageDataList: MessageCreateData[]) {
    return await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const data of messageDataList) {
        // 메시지 본체 생성
        const message = await tx.message.create({
          data: {
            type: data.type,
            title: data.title ?? null,
            body: data.body,
            status: 'Sent',
            createdAt: new Date(),
          },
        });

        // 2) 수신자(Receipt) 연결
        await tx.messageReceipt.create({
          data: {
            messageId: message.id,
            userId: data.userId,
          },
        });

        // 3) 배정(Assignment) 연결
        if (data.assignmentIds && data.assignmentIds.length > 0) {
          await tx.messageAssignment.createMany({
            data: data.assignmentIds.map((unitScheduleId) => ({
              messageId: message.id,
              userId: data.userId,
              unitScheduleId: unitScheduleId,
            })),
          });
        }
        count++;
      }
      return count;
    });
  }

  // 내 메시지 목록 조회 (배정 정보 포함)
  async findMyMessages(userId: number) {
    return await prisma.messageReceipt.findMany({
      where: { userId: Number(userId) },
      include: {
        message: {
          include: {
            assignments: {
              where: { userId: Number(userId) },
              include: {
                assignment: {
                  select: {
                    unitScheduleId: true,
                    state: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { message: { createdAt: 'desc' } },
    });
  }

  // 메시지 읽음 처리
  async markAsRead(userId: number, messageId: number) {
    return await prisma.messageReceipt.update({
      where: {
        userId_messageId: {
          userId: Number(userId),
          messageId: Number(messageId),
        },
      },
      data: { readAt: new Date() },
    });
  }
}

export default new MessageRepository();

// CommonJS 호환
module.exports = new MessageRepository();
