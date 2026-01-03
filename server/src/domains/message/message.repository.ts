// src/domains/message/message.repository.ts
import prisma from '../../libs/prisma';

interface MessageCreateData {
  type: 'Temporary' | 'Confirmed';
  title?: string;
  body: string;
  userId: number;
  assignmentIds?: number[];
}

class MessageRepository {
  // ==========================================
  // 배정 메시지 관련 메서드 (임시/확정)
  // ==========================================

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
  async findTargetsForConfirmedMessage() {
    // 1단계: Accepted 상태이면서 Confirmed 메시지 미발송인 배정의 unitId 목록 조회
    const unsentAssignments = await prisma.instructorUnitAssignment.findMany({
      where: {
        state: 'Accepted',
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
          UnitSchedule: { unitId: { in: unitIdsNeedingResend } },
        },
        message: { type: 'Confirmed' },
      },
    });

    // 3단계: 해당 부대의 모든 Accepted 강사 반환
    return await prisma.instructorUnitAssignment.findMany({
      where: {
        state: 'Accepted',
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
                      },
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

  // 내 메시지 목록 조회 (배정 정보 포함, 페이지네이션 지원)
  async findMyMessages(
    userId: number,
    options: {
      type?: 'Temporary' | 'Confirmed';
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { type, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const where = {
      userId: Number(userId),
      ...(type && { message: { type } }),
    };

    const [receipts, total] = await Promise.all([
      prisma.messageReceipt.findMany({
        where,
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
        skip,
        take: limit,
      }),
      prisma.messageReceipt.count({ where }),
    ]);

    return { receipts, total, page, limit };
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
