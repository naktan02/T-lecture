import prisma from '../../libs/prisma';

interface FindAllParams {
  skip: number;
  take: number;
  search?: string;
}

export const noticeRepository = {
  createNotice: async (data: {
    title: string;
    content: string;
    authorId: number;
    isPinned?: boolean;
  }) => {
    return await prisma.notice.create({
      data: {
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        isPinned: data.isPinned ?? false,
      },
      include: { author: { select: { name: true } } },
    });
  },

  findAllNotices: async ({ skip, take, search }: FindAllParams) => {
    const where = search
      ? {
          OR: [{ title: { contains: search } }, { content: { contains: search } }],
        }
      : {};

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        where,
        skip,
        take,
        orderBy: [
          { isPinned: 'desc' }, // 고정된 공지 우선
          { createdAt: 'desc' }, // 최신순
        ],
        include: { author: { select: { name: true } } },
      }),
      prisma.notice.count({ where }),
    ]);
    return { notices, total };
  },

  findNoticeById: async (id: number) => {
    return await prisma.notice.findUnique({
      where: { id },
      include: { author: { select: { name: true } } },
    });
  },

  updateNotice: async (
    id: number,
    data: { title?: string; content?: string; isPinned?: boolean },
  ) => {
    return await prisma.notice.update({
      where: { id },
      data,
      include: { author: { select: { name: true } } },
    });
  },

  deleteNotice: async (id: number) => {
    return await prisma.notice.delete({
      where: { id },
    });
  },

  increaseViewCount: async (id: number) => {
    return await prisma.notice.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  },

  togglePin: async (id: number) => {
    const notice = await prisma.notice.findUnique({ where: { id } });
    if (!notice) return null;
    return await prisma.notice.update({
      where: { id },
      data: { isPinned: !notice.isPinned },
      include: { author: { select: { name: true } } },
    });
  },
};

export default noticeRepository;
