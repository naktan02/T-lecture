// src/domains/inquiry/inquiry.service.ts
import inquiryRepository from './inquiry.repository';
import AppError from '../../common/errors/AppError';

interface InquiryGetParams {
  page?: number;
  limit?: number;
  authorId?: number;
  status?: 'Waiting' | 'Answered';
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

class InquiryService {
  // 문의사항 생성
  async create(data: { title: string; content: string }, authorId: number) {
    if (!data.title || !data.content) {
      throw new AppError('제목과 내용을 모두 입력해주세요.', 400, 'VALIDATION_ERROR');
    }
    const inquiry = await inquiryRepository.create({
      title: data.title,
      content: data.content,
      authorId,
    });

    const author = await inquiryRepository.findUserById(authorId);
    return this.formatInquiry(inquiry, author?.name || null, null);
  }

  // 문의사항 목록 조회
  async getAll(params: InquiryGetParams = {}) {
    const { page = 1, limit = 10, authorId, status, search, sortField, sortOrder } = params;
    const skip = (page - 1) * limit;

    let orderBy: any;
    if (sortField && sortOrder) {
      if (sortField === 'title') orderBy = { title: sortOrder };
      else if (sortField === 'status') orderBy = { status: sortOrder };
      else if (sortField === 'createdAt' || sortField === 'date')
        orderBy = { createdAt: sortOrder };
      else if (sortField === 'author') orderBy = { author: { name: sortOrder } };
    }

    const { inquiries, total, waitingCount } = await inquiryRepository.findAll({
      skip,
      take: limit,
      authorId,
      status,
      search,
      orderBy,
    });

    // Repository에서 이미 author, answeredByUser를 include하므로 별도 조회 불필요
    return {
      inquiries: inquiries.map((i: any) =>
        this.formatInquiry(i, i.author?.name || null, i.answeredByUser?.name || null),
      ),
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        waitingCount,
      },
    };
  }

  // 문의사항 단건 조회
  async getOne(id: number, userId?: number, isAdmin?: boolean) {
    const inquiry = await this.getInquiryHelper(id);

    // 본인 문의 또는 관리자만 조회 가능
    if (!isAdmin && inquiry.authorId !== userId) {
      throw new AppError('문의사항을 조회할 권한이 없습니다.', 403, 'FORBIDDEN');
    }

    const author = inquiry.authorId ? await inquiryRepository.findUserById(inquiry.authorId) : null;
    const answerer = inquiry.answeredBy
      ? await inquiryRepository.findUserById(inquiry.answeredBy)
      : null;
    return this.formatInquiry(inquiry, author?.name || null, answerer?.name || null);
  }

  // 문의사항 답변 작성 (관리자)
  async answer(id: number, answer: string, answeredBy: number) {
    if (!answer) {
      throw new AppError('답변 내용을 입력해주세요.', 400, 'VALIDATION_ERROR');
    }
    await this.getInquiryHelper(id);
    const updated = await inquiryRepository.answer(id, { answer, answeredBy });

    const author = updated.authorId ? await inquiryRepository.findUserById(updated.authorId) : null;
    const answerer = await inquiryRepository.findUserById(answeredBy);
    return this.formatInquiry(updated, author?.name || null, answerer?.name || null);
  }

  // 문의사항 삭제
  async delete(id: number, userId: number, isAdmin: boolean) {
    const inquiry = await this.getInquiryHelper(id);

    // 본인 문의 또는 관리자만 삭제 가능
    if (!isAdmin && inquiry.authorId !== userId) {
      throw new AppError('문의사항을 삭제할 권한이 없습니다.', 403, 'FORBIDDEN');
    }

    // 관리자가 아닌 경우, 답변이 완료된 문의는 삭제 불가
    if (!isAdmin && inquiry.status === 'Answered') {
      throw new AppError('이미 답변이 완료된 문의사항은 취소할 수 없습니다.', 400, 'BAD_REQUEST');
    }

    return await inquiryRepository.delete(id);
  }

  // Helper: 문의사항 존재 확인
  private async getInquiryHelper(id: number) {
    const inquiry = await inquiryRepository.findById(id);
    if (!inquiry) {
      throw new AppError('문의사항을 찾을 수 없습니다.', 404, 'INQUIRY_NOT_FOUND');
    }
    return inquiry;
  }

  // Helper: 문의사항 응답 포맷
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatInquiry(inquiry: any, authorName: string | null, answererName: string | null) {
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
