// src/domains/notice/notice.service.ts
import noticeRepository from './notice.repository';
import AppError from '../../common/errors/AppError';

interface NoticeCreateData {
  title: string;
  content: string;
  isPinned?: boolean;
  // 타겟팅 옵션
  targetType?: 'ALL' | 'TEAM' | 'INDIVIDUAL';
  targetTeamIds?: number[];
  targetUserIds?: number[];
}

interface NoticeGetParams {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  userId?: number; // 필터링을 위한 유저 ID
}

class NoticeService {
  // 공지사항 생성
  async create(data: NoticeCreateData, authorId: number) {
    if (!data.title || !data.content) {
      throw new AppError('제목과 내용을 모두 입력해주세요.', 400, 'VALIDATION_ERROR');
    }

    const targetSetting = {
      targetType: data.targetType || 'ALL',
      targetTeamIds: data.targetTeamIds || [],
      targetUserIds: data.targetUserIds || [],
    };

    const notice = await noticeRepository.create({
      title: data.title,
      content: data.content,
      authorId,
      isPinned: data.isPinned,
      targetSetting,
    });

    // 타겟팅에 따른 수신자 생성
    const targetType = data.targetType || 'ALL';
    let userIds: number[] = [];

    if (targetType === 'ALL') {
      userIds = await noticeRepository.findAllApprovedUserIds();
    } else if (targetType === 'TEAM' && data.targetTeamIds?.length) {
      userIds = await noticeRepository.findUserIdsByTeamIds(data.targetTeamIds);
    } else if (targetType === 'INDIVIDUAL' && data.targetUserIds?.length) {
      userIds = data.targetUserIds;
    }

    if (userIds.length > 0) {
      await noticeRepository.createReceipts(notice.id, userIds);
    }

    const author = await noticeRepository.findAuthorById(authorId);
    return this.formatNotice(notice, author?.name || null);
  }

  // 공지사항 목록 조회 (관리자용 - 전체 목록)
  async getAll(params: NoticeGetParams = {}) {
    const { page = 1, limit = 10, search, sortField, sortOrder } = params;
    const skip = (page - 1) * limit;

    let orderBy: any; // Prisma type import needed or uses any
    // To handle Prisma types cleanly without importing everywhere, 'any' is safe here if repo handles it.
    // Repo expects Prisma.NoticeOrderByWithRelationInput.
    // I can construct object.

    if (sortField && sortOrder) {
      if (sortField === 'title') orderBy = { title: sortOrder };
      else if (sortField === 'viewCount') orderBy = { viewCount: sortOrder };
      else if (sortField === 'createdAt' || sortField === 'date')
        orderBy = { createdAt: sortOrder };
      else if (sortField === 'author') orderBy = { author: { name: sortOrder } };
    }

    const { notices, total } = await noticeRepository.findAll({
      skip,
      take: limit,
      search,
      orderBy,
      userId: params.userId,
    });

    // 작성자 이름 일괄 조회
    const authorIds = [...new Set(notices.map((n) => n.authorId).filter(Boolean))] as number[];
    const authorsMap = new Map<number, string | null>();
    for (const authorId of authorIds) {
      const author = await noticeRepository.findAuthorById(authorId);
      authorsMap.set(authorId, author?.name || null);
    }

    return {
      notices: notices.map((n) =>
        this.formatNotice(n, n.authorId ? authorsMap.get(n.authorId) || null : null),
      ),
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  // 공지사항 단건 조회
  async getOne(id: number) {
    const notice = await this.getNoticeHelper(id);
    // 조회수 증가 비동기 처리
    noticeRepository.increaseViewCount(id).catch(() => {});

    const author = notice.authorId ? await noticeRepository.findAuthorById(notice.authorId) : null;
    return this.formatNotice(notice, author?.name || null);
  }

  // 공지사항 수정
  // 공지사항 수정
  async update(id: number, data: NoticeCreateData) {
    const existing = await this.getNoticeHelper(id);
    
    // 대상 설정 데이터 구성
    const targetSetting = {
      targetType: data.targetType || 'ALL',
      targetTeamIds: data.targetTeamIds || [],
      targetUserIds: data.targetUserIds || [],
    };

    const updated = await noticeRepository.update(id, {
      title: data.title,
      content: data.content,
      isPinned: data.isPinned,
      targetSetting,
    });

    // 수신자 동기화 (설정이 변경되었을 수 있으므로 기존 삭제 후 재생성)
    await noticeRepository.deleteReceipts(id);

    let userIds: number[] = [];
    const targetType = data.targetType || 'ALL';

    if (targetType === 'ALL') {
      userIds = await noticeRepository.findAllApprovedUserIds();
    } else if (targetType === 'TEAM' && data.targetTeamIds?.length) {
      userIds = await noticeRepository.findUserIdsByTeamIds(data.targetTeamIds);
    } else if (targetType === 'INDIVIDUAL' && data.targetUserIds?.length) {
      userIds = data.targetUserIds;
    }

    if (userIds.length > 0) {
      await noticeRepository.createReceipts(id, userIds);
    }

    const author = updated.authorId
      ? await noticeRepository.findAuthorById(updated.authorId)
      : null;
    return this.formatNotice(updated, author?.name || null);
  }

  // 공지사항 삭제
  async delete(id: number) {
    await this.getNoticeHelper(id);
    return await noticeRepository.delete(id);
  }

  // 공지사항 고정 토글
  async togglePin(id: number) {
    await this.getNoticeHelper(id);
    const toggled = await noticeRepository.togglePin(id);
    if (!toggled) throw new AppError('공지사항을 찾을 수 없습니다.', 404, 'NOTICE_NOT_FOUND');
    const author = toggled.authorId
      ? await noticeRepository.findAuthorById(toggled.authorId)
      : null;
    return this.formatNotice(toggled, author?.name || null);
  }

  // Helper: 공지사항 존재 확인
  private async getNoticeHelper(id: number) {
    const notice = await noticeRepository.findById(id);
    if (!notice) {
      throw new AppError('공지사항을 찾을 수 없습니다.', 404, 'NOTICE_NOT_FOUND');
    }
    return notice;
  }

  // Helper: 공지사항 응답 포맷
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatNotice(notice: any, authorName: string | null) {
    return {
      id: notice.id,
      title: notice.title,
      content: notice.body,
      createdAt: notice.createdAt,
      updatedAt: notice.updatedAt,
      viewCount: notice.viewCount,
      isPinned: notice.isPinned,
      targetSetting: notice.targetSetting,
      author: { name: authorName },
    };
  }
}

export default new NoticeService();
