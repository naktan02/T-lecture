import AppError from '../../common/errors/AppError';
import noticeRepository from './notice.repository';

type NoticeTargetSetting = {
  targetType: 'ALL' | 'TEAM' | 'INDIVIDUAL';
  targetTeamIds: number[];
  targetUserIds: number[];
};

type SortOrder = 'asc' | 'desc';

interface NoticeOrderBy {
  title?: SortOrder;
  viewCount?: SortOrder;
  createdAt?: SortOrder;
  author?: { name: SortOrder };
}

interface NoticeCreateData {
  title: string;
  content: string;
  isPinned?: boolean;
  targetType?: 'ALL' | 'TEAM' | 'INDIVIDUAL';
  targetTeamIds?: number[];
  targetUserIds?: number[];
}

interface NoticeGetParams {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: string;
  sortOrder?: SortOrder;
  userId?: number;
  isAdmin?: boolean;
}

interface NoticeFormatInput {
  id: number;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
  isPinned: boolean;
  targetSetting: unknown;
  authorId?: number | null;
  author?: {
    name: string | null;
  };
}

class NoticeService {
  async create(data: NoticeCreateData, authorId: number) {
    if (!data.title || !data.content) {
      throw new AppError('제목과 내용은 모두 입력해 주세요.', 400, 'VALIDATION_ERROR');
    }

    const targetSetting: NoticeTargetSetting = {
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

  async getAll(params: NoticeGetParams = {}) {
    const { page = 1, limit = 10, search, sortField, sortOrder } = params;
    const skip = (page - 1) * limit;
    let orderBy: NoticeOrderBy | undefined;

    if (sortField && sortOrder) {
      if (sortField === 'title') {
        orderBy = { title: sortOrder };
      } else if (sortField === 'viewCount') {
        orderBy = { viewCount: sortOrder };
      } else if (sortField === 'createdAt' || sortField === 'date') {
        orderBy = { createdAt: sortOrder };
      } else if (sortField === 'author') {
        orderBy = { author: { name: sortOrder } };
      }
    }

    const { notices, total } = await noticeRepository.findAll({
      skip,
      take: limit,
      search,
      orderBy,
      userId: params.userId,
    });

    return {
      notices: notices.map((notice) => this.formatNotice(notice, notice.author?.name || null)),
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: number, params: Pick<NoticeGetParams, 'userId' | 'isAdmin'> = {}) {
    const { userId, isAdmin = false } = params;

    const notice =
      userId && !isAdmin
        ? await noticeRepository.findByIdForUser(id, userId)
        : await noticeRepository.findById(id);

    if (!notice) {
      throw new AppError('공지사항을 찾을 수 없습니다.', 404, 'NOTICE_NOT_FOUND');
    }

    const updatedNotice = await noticeRepository.increaseViewCount(id);

    if (userId && !isAdmin) {
      await noticeRepository.markAsRead(userId, id);
    }

    const author = updatedNotice.authorId
      ? await noticeRepository.findAuthorById(updatedNotice.authorId)
      : null;

    return this.formatNotice(updatedNotice, author?.name || null);
  }

  async update(id: number, data: NoticeCreateData) {
    await this.getNoticeHelper(id);

    const targetSetting: NoticeTargetSetting = {
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

  async delete(id: number) {
    await this.getNoticeHelper(id);
    return await noticeRepository.delete(id);
  }

  async togglePin(id: number) {
    await this.getNoticeHelper(id);
    const toggled = await noticeRepository.togglePin(id);

    if (!toggled) {
      throw new AppError('공지사항을 찾을 수 없습니다.', 404, 'NOTICE_NOT_FOUND');
    }

    const author = toggled.authorId
      ? await noticeRepository.findAuthorById(toggled.authorId)
      : null;
    return this.formatNotice(toggled, author?.name || null);
  }

  private async getNoticeHelper(id: number) {
    const notice = await noticeRepository.findById(id);
    if (!notice) {
      throw new AppError('공지사항을 찾을 수 없습니다.', 404, 'NOTICE_NOT_FOUND');
    }

    return notice;
  }

  private formatNotice(notice: NoticeFormatInput, authorName: string | null) {
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
