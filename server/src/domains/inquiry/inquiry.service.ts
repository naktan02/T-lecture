import AppError from '../../common/errors/AppError';
import inquiryRepository from './inquiry.repository';

type SortOrder = 'asc' | 'desc';

interface InquiryOrderBy {
  title?: SortOrder;
  status?: SortOrder;
  createdAt?: SortOrder;
  author?: { name: SortOrder };
}

interface InquiryGetParams {
  page?: number;
  limit?: number;
  authorId?: number;
  status?: 'Waiting' | 'Answered';
  search?: string;
  sortField?: string;
  sortOrder?: SortOrder;
}

interface InquiryFormatInput {
  id: number;
  title: string;
  body: string;
  createdAt: Date;
  status: 'Waiting' | 'Answered';
  answer: string | null;
  answeredAt: Date | null;
  authorId: number;
  answeredBy?: number | null;
  author?: {
    name: string | null;
  };
  answeredByUser?: {
    name: string | null;
  } | null;
}

class InquiryService {
  async create(data: { title: string; content: string }, authorId: number) {
    const title = data.title?.trim();
    const content = data.content?.trim();

    if (!title || !content) {
      throw new AppError('제목과 내용은 모두 입력해 주세요.', 400, 'VALIDATION_ERROR');
    }

    const inquiry = await inquiryRepository.create({
      title,
      content,
      authorId,
    });

    const author = await inquiryRepository.findUserById(authorId);
    return this.formatInquiry(inquiry, author?.name || null, null);
  }

  async getAll(params: InquiryGetParams = {}) {
    const { page = 1, limit = 10, authorId, status, search, sortField, sortOrder } = params;
    const skip = (page - 1) * limit;
    let orderBy: InquiryOrderBy | undefined;

    if (sortField && sortOrder) {
      if (sortField === 'title') {
        orderBy = { title: sortOrder };
      } else if (sortField === 'status') {
        orderBy = { status: sortOrder };
      } else if (sortField === 'createdAt' || sortField === 'date') {
        orderBy = { createdAt: sortOrder };
      } else if (sortField === 'author') {
        orderBy = { author: { name: sortOrder } };
      }
    }

    const { inquiries, total, waitingCount } = await inquiryRepository.findAll({
      skip,
      take: limit,
      authorId,
      status,
      search,
      orderBy,
    });

    return {
      inquiries: inquiries.map((inquiry) =>
        this.formatInquiry(
          inquiry,
          inquiry.author?.name || null,
          inquiry.answeredByUser?.name || null,
        ),
      ),
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        waitingCount,
      },
    };
  }

  async getOne(id: number, userId?: number, isAdmin = false) {
    const inquiry = await this.getInquiryHelper(id);

    if (!isAdmin && inquiry.authorId !== userId) {
      throw new AppError('문의사항을 조회할 권한이 없습니다.', 403, 'FORBIDDEN');
    }

    if (!isAdmin && userId && inquiry.status === 'Answered') {
      await inquiryRepository.markAnswerAsRead(id, userId);
    }

    const author = inquiry.authorId ? await inquiryRepository.findUserById(inquiry.authorId) : null;
    const answerer = inquiry.answeredBy
      ? await inquiryRepository.findUserById(inquiry.answeredBy)
      : null;

    return this.formatInquiry(inquiry, author?.name || null, answerer?.name || null);
  }

  async answer(id: number, answer: string, answeredBy: number) {
    const trimmedAnswer = answer?.trim();

    if (!trimmedAnswer) {
      throw new AppError('답변 내용을 입력해 주세요.', 400, 'VALIDATION_ERROR');
    }

    await this.getInquiryHelper(id);
    const updated = await inquiryRepository.answer(id, {
      answer: trimmedAnswer,
      answeredBy,
    });

    const author = updated.authorId ? await inquiryRepository.findUserById(updated.authorId) : null;
    const answerer = await inquiryRepository.findUserById(answeredBy);
    return this.formatInquiry(updated, author?.name || null, answerer?.name || null);
  }

  async delete(id: number, userId: number, isAdmin: boolean) {
    const inquiry = await this.getInquiryHelper(id);

    if (!isAdmin && inquiry.authorId !== userId) {
      throw new AppError('문의사항을 삭제할 권한이 없습니다.', 403, 'FORBIDDEN');
    }

    if (!isAdmin && inquiry.status === 'Answered') {
      throw new AppError('이미 답변이 완료된 문의사항은 취소할 수 없습니다.', 400, 'BAD_REQUEST');
    }

    return await inquiryRepository.delete(id);
  }

  private async getInquiryHelper(id: number) {
    const inquiry = await inquiryRepository.findById(id);
    if (!inquiry) {
      throw new AppError('문의사항을 찾을 수 없습니다.', 404, 'INQUIRY_NOT_FOUND');
    }

    return inquiry;
  }

  private formatInquiry(
    inquiry: InquiryFormatInput,
    authorName: string | null,
    answererName: string | null,
  ) {
    return {
      id: inquiry.id,
      title: inquiry.title,
      content: inquiry.body,
      createdAt: inquiry.createdAt,
      status: inquiry.status,
      author: { name: authorName },
      answer: inquiry.answer,
      answeredAt: inquiry.answeredAt,
      answeredBy: { name: answererName },
    };
  }
}

export default new InquiryService();
