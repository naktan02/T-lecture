import prisma from '../../libs/prisma';

type SortOrder = 'asc' | 'desc';

interface NoticeOrderBy {
  isPinned?: SortOrder;
  title?: SortOrder;
  viewCount?: SortOrder;
  createdAt?: SortOrder;
  author?: { name: SortOrder };
}

interface NoticeWhere {
  OR?: Array<{ title?: { contains: string }; body?: { contains: string } }>;
  receipts?: { some: { userId: number } };
}

interface NoticeFindAllParams {
  skip: number;
  take: number;
  search?: string;
  orderBy?: NoticeOrderBy;
  userId?: number;
}

type NoticeReceiptDbClient = Pick<typeof prisma, 'noticeReceipt'>;

const noticeAttachmentSelect = {
  id: true,
  originalName: true,
  mimeType: true,
  size: true,
  expiresAt: true,
  createdAt: true,
} as const;

const noticeDetailInclude = {
  author: {
    select: { name: true },
  },
  attachments: {
    select: noticeAttachmentSelect,
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

class NoticeRepository {
  async findAll({ skip, take, search, orderBy, userId }: NoticeFindAllParams) {
    const where: NoticeWhere = {};

    if (search) {
      where.OR = [{ title: { contains: search } }, { body: { contains: search } }];
    }

    if (userId) {
      where.receipts = {
        some: { userId },
      };
    }

    const sortRule: NoticeOrderBy[] = [{ isPinned: 'desc' }];
    if (orderBy) {
      sortRule.push(orderBy);
    } else {
      sortRule.push({ createdAt: 'desc' });
    }

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        where,
        skip,
        take,
        orderBy: sortRule,
        include: noticeDetailInclude,
      }),
      prisma.notice.count({ where }),
    ]);

    return { notices, total };
  }

  async findById(id: number) {
    return await prisma.notice.findUnique({
      where: { id },
      include: noticeDetailInclude,
    });
  }

  async findByIdForUser(id: number, userId: number) {
    return await prisma.notice.findFirst({
      where: {
        id,
        receipts: {
          some: { userId },
        },
      },
      include: noticeDetailInclude,
    });
  }

  async increaseViewCount(id: number) {
    await prisma.notice.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async deleteReceipts(noticeId: number, db: NoticeReceiptDbClient = prisma) {
    await db.noticeReceipt.deleteMany({
      where: { noticeId },
    });
  }

  async delete(id: number) {
    return await prisma.notice.delete({
      where: { id },
    });
  }

  async createReceipts(noticeId: number, userIds: number[], db: NoticeReceiptDbClient = prisma) {
    if (userIds.length === 0) {
      return;
    }

    await db.noticeReceipt.createMany({
      data: userIds.map((userId) => ({
        noticeId,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  async findAllApprovedUserIds(): Promise<number[]> {
    const users = await prisma.user.findMany({
      where: { status: 'APPROVED' },
      select: { id: true },
    });

    return users.map((user) => user.id);
  }

  async findUserIdsByTeamIds(teamIds: number[]): Promise<number[]> {
    const instructors = await prisma.instructor.findMany({
      where: { teamId: { in: teamIds } },
      select: { userId: true },
    });

    return instructors.map((instructor) => instructor.userId);
  }

  async markAsRead(userId: number, noticeId: number) {
    return await prisma.noticeReceipt.updateMany({
      where: {
        noticeId,
        userId,
      },
      data: { readAt: new Date() },
    });
  }

  async countUnread(userId: number) {
    return await prisma.noticeReceipt.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }

  async findAttachmentMetadataByNoticeId(noticeId: number) {
    return await prisma.noticeAttachment.findMany({
      where: { noticeId },
      select: noticeAttachmentSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAttachmentById(attachmentId: number) {
    return await prisma.noticeAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        notice: {
          select: {
            id: true,
            isPinned: true,
          },
        },
      },
    });
  }

  async findAttachmentByIdForUser(attachmentId: number, userId: number) {
    return await prisma.noticeAttachment.findFirst({
      where: {
        id: attachmentId,
        notice: {
          receipts: {
            some: { userId },
          },
        },
      },
      include: {
        notice: {
          select: {
            id: true,
            isPinned: true,
          },
        },
      },
    });
  }

  async deleteExpiredAttachments(now: Date) {
    const result = await prisma.noticeAttachment.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
        notice: {
          isPinned: false,
        },
      },
    });

    return result.count;
  }
}

export default new NoticeRepository();
