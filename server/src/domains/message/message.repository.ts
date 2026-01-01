// src/domains/message/message.repository.ts
import prisma from '../../libs/prisma';

interface MessageCreateData {
  type: 'Temporary' | 'Confirmed';
  body: string;
  userId: number;
  assignmentIds?: number[];
}

interface NoticeCreateData {
  title: string;
  content: string;
  authorId: number;
  isPinned?: boolean;
}

interface NoticeFindAllParams {
  skip: number;
  take: number;
  search?: string;
}

class MessageRepository {
  // ==========================================
  // 기존 메시지 관련 메서드
  // ==========================================

  // 임시 메시지 발송 대상 조회
  async findTargetsForTemporaryMessage() {
    return await prisma.instructorUnitAssignment.findMany({
      where: {
        state: 'Pending',
        messageAssignments: {
          none: {
            message: { type: 'Temporary' },
          },
        },
      },
      include: {
        User: true,
        UnitSchedule: {
          include: { unit: true },
        },
      },
      orderBy: {
        UnitSchedule: { date: 'asc' },
      },
    });
  }

  // 확정 메시지 발송 대상 조회
  async findTargetsForConfirmedMessage() {
    return await prisma.instructorUnitAssignment.findMany({
      where: {
        state: 'Accepted',
        messageAssignments: {
          none: {
            message: { type: 'Confirmed' },
          },
        },
      },
      include: {
        User: {
          include: { instructor: true },
        },
        UnitSchedule: {
          include: {
            unit: {
              include: { trainingLocations: true },
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

  // 내 메시지 목록 조회
  async findMyMessages(userId: number) {
    return await prisma.messageReceipt.findMany({
      where: { userId: Number(userId) },
      include: { message: true },
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

  // ==========================================
  // 공지사항 관련 메서드
  // ==========================================

  // 공지사항 생성
  async createNotice(data: NoticeCreateData) {
    return await prisma.message.create({
      data: {
        type: 'Notice',
        title: data.title,
        body: data.content,
        authorId: data.authorId,
        isPinned: data.isPinned ?? false,
        status: 'Sent',
      },
    });
  }

  // 공지사항 목록 조회
  async findAllNotices({ skip, take, search }: NoticeFindAllParams) {
    const where = {
      type: 'Notice' as const,
      ...(search && {
        OR: [{ title: { contains: search } }, { body: { contains: search } }],
      }),
    };

    const [notices, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.message.count({ where }),
    ]);
    return { notices, total };
  }

  // 공지사항 단건 조회
  async findNoticeById(id: number) {
    return await prisma.message.findFirst({
      where: { id, type: 'Notice' },
    });
  }

  // 공지사항 수정
  async updateNotice(id: number, data: { title?: string; content?: string; isPinned?: boolean }) {
    return await prisma.message.update({
      where: { id },
      data: {
        title: data.title,
        body: data.content,
        isPinned: data.isPinned,
      },
    });
  }

  // 공지사항 삭제
  async deleteNotice(id: number) {
    return await prisma.message.delete({
      where: { id },
    });
  }

  // 공지사항 조회수 증가
  async increaseViewCount(id: number) {
    return await prisma.message.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  // 공지사항 고정 토글
  async toggleNoticePin(id: number) {
    const notice = await prisma.message.findUnique({ where: { id } });
    if (!notice) return null;
    return await prisma.message.update({
      where: { id },
      data: { isPinned: !notice.isPinned },
    });
  }

  // 작성자 정보 조회 (별도 쿼리)
  async findAuthorById(authorId: number) {
    return await prisma.user.findUnique({
      where: { id: authorId },
      select: { name: true },
    });
  }
}

export default new MessageRepository();

// CommonJS 호환
module.exports = new MessageRepository();
