import noticeRepository from './notice.repository';
import AppError from '../../common/errors/AppError';

interface CreateNoticeData {
  title: string;
  content: string;
  isPinned?: boolean;
}

interface GetNoticesParams {
  page?: number;
  limit?: number;
  search?: string;
}

class NoticeService {
  async createNotice(data: CreateNoticeData, authorId: number) {
    if (!data.title || !data.content) {
      throw new AppError('제목과 내용을 모두 입력해주세요.', 400, 'VALIDATION_ERROR');
    }
    return await noticeRepository.createNotice({
      title: data.title,
      content: data.content,
      authorId,
      isPinned: data.isPinned,
    });
  }

  async getNotices(params: GetNoticesParams = {}) {
    const { page = 1, limit = 10, search } = params;
    const skip = (page - 1) * limit;
    const { notices, total } = await noticeRepository.findAllNotices({ skip, take: limit, search });
    return {
      notices,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getNoticeHelper(id: number) {
    const notice = await noticeRepository.findNoticeById(id);
    if (!notice) {
      throw new AppError('공지사항을 찾을 수 없습니다.', 404, 'NOTICE_NOT_FOUND');
    }
    return notice;
  }

  async getNotice(id: number) {
    const notice = await this.getNoticeHelper(id);
    // 조회수 증가 비동기 처리 (결과 기다리지 않음)
    noticeRepository.increaseViewCount(id).catch(console.error);
    return notice;
  }

  async updateNotice(id: number, data: { title?: string; content?: string; isPinned?: boolean }) {
    await this.getNoticeHelper(id);
    return await noticeRepository.updateNotice(id, data);
  }

  async deleteNotice(id: number) {
    await this.getNoticeHelper(id);
    return await noticeRepository.deleteNotice(id);
  }

  async togglePin(id: number) {
    await this.getNoticeHelper(id);
    return await noticeRepository.togglePin(id);
  }
}

export default new NoticeService();
