import prisma from '../../libs/prisma';

type NoticeTargetSetting = {
  targetType: 'ALL' | 'TEAM' | 'INDIVIDUAL';
  targetTeamIds: number[];
  targetUserIds: number[];
};

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

interface NoticeCreateData {
  title: string;
  content: string;
  authorId: number;
  isPinned?: boolean;
  targetSetting?: NoticeTargetSetting;
}

interface NoticeFindAllParams {
  skip: number;
  take: number;
  search?: string;
  orderBy?: NoticeOrderBy;
  userId?: number;
}

class NoticeRepository {
  async create(data: NoticeCreateData) {
    return await prisma.notice.create({
      data: {
        title: data.title,
        body: data.content,
        authorId: data.authorId,
        isPinned: data.isPinned ?? false,
        targetSetting: data.targetSetting,
      },
    });
  }

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
        include: {
          author: {
            select: { name: true },
          },
        },
      }),
      prisma.notice.count({ where }),
    ]);

    return { notices, total };
  }

  async findById(id: number) {
    return await prisma.notice.findUnique({
      where: { id },
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
    });
  }

  async update(
    id: number,
    data: {
      title?: string;
      content?: string;
      isPinned?: boolean;
      targetSetting?: NoticeTargetSetting;
    },
  ) {
    return await prisma.notice.update({
      where: { id },
      data: {
        title: data.title,
        body: data.content,
        isPinned: data.isPinned,
        targetSetting: data.targetSetting,
      },
    });
  }

  async deleteReceipts(noticeId: number) {
    await prisma.noticeReceipt.deleteMany({
      where: { noticeId },
    });
  }

  async delete(id: number) {
    return await prisma.notice.delete({
      where: { id },
    });
  }

  async increaseViewCount(id: number) {
    return await prisma.notice.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async togglePin(id: number) {
    const notice = await prisma.notice.findUnique({ where: { id } });
    if (!notice) {
      return null;
    }

    return await prisma.notice.update({
      where: { id },
      data: { isPinned: !notice.isPinned },
    });
  }

  async findAuthorById(authorId: number) {
    return await prisma.user.findUnique({
      where: { id: authorId },
      select: { name: true },
    });
  }

  async createReceipts(noticeId: number, userIds: number[]) {
    if (userIds.length === 0) {
      return;
    }

    await prisma.noticeReceipt.createMany({
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

  async findMyNotices(userId: number) {
    return await prisma.noticeReceipt.findMany({
      where: { userId },
      include: {
        notice: true,
      },
      orderBy: { notice: { createdAt: 'desc' } },
    });
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
}

export default new NoticeRepository();
