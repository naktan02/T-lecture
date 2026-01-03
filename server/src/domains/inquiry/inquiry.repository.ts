// src/domains/inquiry/inquiry.repository.ts
import prisma from '../../libs/prisma';

interface InquiryCreateData {
  title: string;
  content: string;
  authorId: number;
}

interface InquiryFindAllParams {
  skip: number;
  take: number;
  authorId?: number; // 본인 문의만 조회 (강사용)
  status?: 'Waiting' | 'Answered';
  search?: string;
}

class InquiryRepository {
  // 문의사항 생성
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

  // 문의사항 목록 조회 (content 포함)
  async findAll({ skip, take, authorId, status, search }: InquiryFindAllParams) {
    const where = {
      ...(authorId && { authorId }),
      ...(status && { status }),
      ...(search && {
        OR: [{ title: { contains: search } }, { body: { contains: search } }],
      }),
    };

    // 전체 대기중 개수 (필터 적용 전)
    const waitingWhere = {
      ...(authorId && { authorId }),
      status: 'Waiting' as const,
    };

    const [inquiries, total, waitingCount] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }],
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

  // 문의사항 단건 조회
  async findById(id: number) {
    return await prisma.inquiry.findUnique({
      where: { id },
    });
  }

  // 문의사항 답변 작성
  async answer(id: number, data: { answer: string; answeredBy: number }) {
    return await prisma.inquiry.update({
      where: { id },
      data: {
        answer: data.answer,
        answeredBy: data.answeredBy,
        answeredAt: new Date(),
        status: 'Answered',
      },
    });
  }

  // 문의사항 삭제
  async delete(id: number) {
    return await prisma.inquiry.delete({
      where: { id },
    });
  }

  // 작성자/답변자 정보 조회
  async findUserById(userId: number) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
  }
}

export default new InquiryRepository();
