import prisma from '../../libs/prisma';

type SortOrder = 'asc' | 'desc';

interface InquiryOrderBy {
  title?: SortOrder;
  status?: SortOrder;
  createdAt?: SortOrder;
  author?: { name: SortOrder };
}

interface InquiryWhere {
  authorId?: number;
  status?: 'Waiting' | 'Answered';
  OR?: Array<{ title?: { contains: string }; body?: { contains: string } }>;
}

interface InquiryCreateData {
  title: string;
  content: string;
  authorId: number;
}

interface InquiryFindAllParams {
  skip: number;
  take: number;
  authorId?: number;
  status?: 'Waiting' | 'Answered';
  search?: string;
  orderBy?: InquiryOrderBy;
}

class InquiryRepository {
  async create(data: InquiryCreateData) {
    return await prisma.inquiry.create({
      data: {
        title: data.title,
        body: data.content,
        authorId: data.authorId,
        status: 'Waiting',
      },
    });
  }

  async findAll({ skip, take, authorId, status, search, orderBy }: InquiryFindAllParams) {
    const where: InquiryWhere = {};

    if (authorId) {
      where.authorId = authorId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [{ title: { contains: search } }, { body: { contains: search } }];
    }

    const waitingWhere: InquiryWhere = {
      ...(authorId ? { authorId } : {}),
      status: 'Waiting',
    };

    const [inquiries, total, waitingCount] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { createdAt: 'desc' },
        include: {
          author: {
            select: { name: true },
          },
          answeredByUser: {
            select: { name: true },
          },
        },
      }),
      prisma.inquiry.count({ where }),
      prisma.inquiry.count({ where: waitingWhere }),
    ]);

    return { inquiries, total, waitingCount };
  }

  async findById(id: number) {
    return await prisma.inquiry.findUnique({
      where: { id },
    });
  }

  async answer(id: number, data: { answer: string; answeredBy: number }) {
    return await prisma.inquiry.update({
      where: { id },
      data: {
        answer: data.answer,
        answeredBy: data.answeredBy,
        answeredAt: new Date(),
        answerReadAt: null,
        status: 'Answered',
      },
    });
  }

  async markAnswerAsRead(id: number, authorId: number) {
    return await prisma.inquiry.updateMany({
      where: {
        id,
        authorId,
        status: 'Answered',
      },
      data: {
        answerReadAt: new Date(),
      },
    });
  }

  async countUnreadAnswers(authorId: number) {
    return await prisma.inquiry.count({
      where: {
        authorId,
        status: 'Answered',
        answerReadAt: null,
      },
    });
  }

  async delete(id: number) {
    return await prisma.inquiry.delete({
      where: { id },
    });
  }

  async findUserById(userId: number) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
  }
}

export default new InquiryRepository();
