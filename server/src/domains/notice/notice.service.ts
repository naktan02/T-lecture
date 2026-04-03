import AppError from '../../common/errors/AppError';
import prisma from '../../libs/prisma';
import {
  NOTICE_ATTACHMENT_ALLOWED_EXTENSIONS,
  NOTICE_ATTACHMENT_MAX_FILES,
  NOTICE_ATTACHMENT_MAX_TOTAL_BYTES,
  createNoticeAttachmentExpiry,
} from './notice-attachment.constants';
import {
  createNoticeAttachmentDownloadToken,
  verifyNoticeAttachmentDownloadToken,
} from './notice-download-token';
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

interface NoticeUpsertData {
  title?: string;
  content?: string;
  isPinned?: boolean;
  targetType?: 'ALL' | 'TEAM' | 'INDIVIDUAL';
  targetTeamIds?: number[];
  targetUserIds?: number[];
  removeAttachmentIds?: number[];
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

interface UploadedNoticeFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

type NoticeRecord = NonNullable<Awaited<ReturnType<typeof noticeRepository.findById>>>;
type NoticeAttachmentRecord = Awaited<
  ReturnType<typeof noticeRepository.findAttachmentMetadataByNoticeId>
>[number];
type NoticeAttachmentAccessRecord = NonNullable<
  Awaited<ReturnType<typeof noticeRepository.findAttachmentAccessById>>
>;
type NoticeAttachmentDownloadRecord = NonNullable<
  Awaited<ReturnType<typeof noticeRepository.findAttachmentById>>
>;
type NoticeWithOptionalReceipts = NoticeRecord & {
  receipts?: Array<{ readAt: Date | null }>;
};
type NoticeTransactionClient = Pick<typeof prisma, 'notice' | 'noticeAttachment' | 'noticeReceipt'>;

class NoticeService {
  async create(data: NoticeUpsertData, authorId: number, files: UploadedNoticeFile[] = []) {
    if (!data.title || !data.content) {
      throw new AppError('제목과 내용을 모두 입력해 주세요.', 400, 'VALIDATION_ERROR');
    }

    this.validateNewAttachments(files);

    const targetSetting = this.buildTargetSetting(data);
    const isPinned = data.isPinned === true;
    const userIds = await this.resolveTargetUserIds(targetSetting);

    const noticeId = await prisma.$transaction(async (tx) => {
      const notice = await tx.notice.create({
        data: {
          title: data.title!,
          body: data.content!,
          authorId,
          isPinned,
          targetSetting,
        },
        select: { id: true },
      });

      await noticeRepository.createReceipts(notice.id, userIds, tx);
      await this.createAttachments(tx, notice.id, files, isPinned);

      return notice.id;
    });

    return await this.getFormattedNoticeOrThrow(noticeId);
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
      notices: notices.map((notice) => this.formatNotice(notice)),
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

    await noticeRepository.increaseViewCount(id);

    if (userId && !isAdmin) {
      await noticeRepository.markAsRead(userId, id);
    }

    const updatedNotice =
      userId && !isAdmin
        ? await noticeRepository.findByIdForUser(id, userId)
        : await noticeRepository.findById(id);

    if (!updatedNotice) {
      throw new AppError('공지사항을 찾을 수 없습니다.', 404, 'NOTICE_NOT_FOUND');
    }

    return this.formatNotice(updatedNotice);
  }

  async update(id: number, data: NoticeUpsertData, files: UploadedNoticeFile[] = []) {
    const existingNotice = await noticeRepository.findById(id);
    if (!existingNotice) {
      throw new AppError('공지사항을 찾을 수 없습니다.', 404, 'NOTICE_NOT_FOUND');
    }

    const nextIsPinned = data.isPinned ?? existingNotice.isPinned;
    const currentTargetSetting = this.normalizeTargetSetting(existingNotice.targetSetting);
    const removeAttachmentIds = Array.from(new Set(data.removeAttachmentIds || []));
    const keptAttachments = existingNotice.attachments.filter(
      (attachment) => !removeAttachmentIds.includes(attachment.id),
    );

    this.validateAttachmentCombination(keptAttachments, files);

    const targetSetting = this.buildTargetSetting({
      targetType: data.targetType ?? currentTargetSetting.targetType,
      targetTeamIds: data.targetTeamIds ?? currentTargetSetting.targetTeamIds,
      targetUserIds: data.targetUserIds ?? currentTargetSetting.targetUserIds,
    });
    const userIds = await this.resolveTargetUserIds(targetSetting);

    await prisma.$transaction(async (tx) => {
      await tx.notice.update({
        where: { id },
        data: {
          title: data.title ?? existingNotice.title,
          body: data.content ?? existingNotice.body,
          isPinned: nextIsPinned,
          targetSetting,
        },
      });

      if (removeAttachmentIds.length > 0) {
        await tx.noticeAttachment.deleteMany({
          where: {
            noticeId: id,
            id: { in: removeAttachmentIds },
          },
        });
      }

      if (existingNotice.isPinned !== nextIsPinned) {
        await tx.noticeAttachment.updateMany({
          where: { noticeId: id },
          data: {
            expiresAt: nextIsPinned ? null : createNoticeAttachmentExpiry(),
          },
        });
      }

      await this.createAttachments(tx, id, files, nextIsPinned);
      await noticeRepository.deleteReceipts(id, tx);
      await noticeRepository.createReceipts(id, userIds, tx);
    });

    return await this.getFormattedNoticeOrThrow(id);
  }

  async delete(id: number) {
    const notice = await noticeRepository.findById(id);
    if (!notice) {
      throw new AppError('공지사항을 찾을 수 없습니다.', 404, 'NOTICE_NOT_FOUND');
    }

    return await noticeRepository.delete(id);
  }

  async togglePin(id: number) {
    const notice = await noticeRepository.findById(id);
    if (!notice) {
      throw new AppError('공지사항을 찾을 수 없습니다.', 404, 'NOTICE_NOT_FOUND');
    }

    const nextIsPinned = !notice.isPinned;

    await prisma.$transaction(async (tx) => {
      await tx.notice.update({
        where: { id },
        data: { isPinned: nextIsPinned },
      });

      await tx.noticeAttachment.updateMany({
        where: { noticeId: id },
        data: {
          expiresAt: nextIsPinned ? null : createNoticeAttachmentExpiry(),
        },
      });
    });

    return await this.getFormattedNoticeOrThrow(id);
  }

  async issueAttachmentDownloadTicket(attachmentId: number, userId: number, isAdmin = false) {
    await this.getDownloadableAttachmentMetadata(attachmentId, userId, isAdmin);

    const { token, expiresAt } = createNoticeAttachmentDownloadToken({
      attachmentId,
      userId,
      isAdmin,
    });

    return { token, expiresAt };
  }

  async downloadAttachment(attachmentId: number, userId?: number, isAdmin = false) {
    const attachment = await this.getDownloadableAttachmentData(attachmentId, userId, isAdmin);

    return {
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      data: attachment.data,
    };
  }

  async downloadAttachmentByToken(attachmentId: number, token: string) {
    const payload = verifyNoticeAttachmentDownloadToken(token);

    if (payload.attachmentId !== attachmentId) {
      throw new AppError('다운로드 토큰 대상이 올바르지 않습니다.', 400, 'INVALID_DOWNLOAD_TOKEN');
    }

    return await this.downloadAttachment(payload.attachmentId, payload.userId, payload.isAdmin);
  }

  async cleanupExpiredAttachments() {
    return await noticeRepository.deleteExpiredAttachments(new Date());
  }

  private async getFormattedNoticeOrThrow(id: number) {
    const notice = await noticeRepository.findById(id);
    if (!notice) {
      throw new AppError('공지사항을 찾을 수 없습니다.', 404, 'NOTICE_NOT_FOUND');
    }

    return this.formatNotice(notice);
  }

  private buildTargetSetting(data: NoticeUpsertData): NoticeTargetSetting {
    return {
      targetType: data.targetType || 'ALL',
      targetTeamIds: data.targetTeamIds || [],
      targetUserIds: data.targetUserIds || [],
    };
  }

  private normalizeTargetSetting(value: unknown): NoticeTargetSetting {
    if (!value || typeof value !== 'object') {
      return this.buildTargetSetting({});
    }

    const targetSetting = value as Partial<NoticeTargetSetting>;

    return this.buildTargetSetting({
      targetType:
        targetSetting.targetType === 'ALL' ||
        targetSetting.targetType === 'TEAM' ||
        targetSetting.targetType === 'INDIVIDUAL'
          ? targetSetting.targetType
          : undefined,
      targetTeamIds: Array.isArray(targetSetting.targetTeamIds)
        ? targetSetting.targetTeamIds.filter((item): item is number => Number.isInteger(item))
        : undefined,
      targetUserIds: Array.isArray(targetSetting.targetUserIds)
        ? targetSetting.targetUserIds.filter((item): item is number => Number.isInteger(item))
        : undefined,
    });
  }

  private async resolveTargetUserIds(targetSetting: NoticeTargetSetting) {
    if (targetSetting.targetType === 'ALL') {
      return await noticeRepository.findAllApprovedUserIds();
    }

    if (targetSetting.targetType === 'TEAM' && targetSetting.targetTeamIds.length > 0) {
      return await noticeRepository.findUserIdsByTeamIds(targetSetting.targetTeamIds);
    }

    if (targetSetting.targetType === 'INDIVIDUAL' && targetSetting.targetUserIds.length > 0) {
      return targetSetting.targetUserIds;
    }

    return [];
  }

  private validateNewAttachments(files: UploadedNoticeFile[]) {
    if (files.length > NOTICE_ATTACHMENT_MAX_FILES) {
      throw new AppError(
        '첨부파일 수가 너무 많습니다. 파일 수를 줄여주세요.',
        400,
        'NOTICE_ATTACHMENT_TOO_MANY_FILES',
      );
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > NOTICE_ATTACHMENT_MAX_TOTAL_BYTES) {
      throw new AppError(
        `첨부파일 총합은 ${this.formatBytes(NOTICE_ATTACHMENT_MAX_TOTAL_BYTES)} 이하여야 합니다.`,
        400,
        'NOTICE_ATTACHMENT_TOTAL_TOO_LARGE',
      );
    }

    for (const file of files) {
      this.validateAttachmentType(file.originalname);
    }
  }

  private validateAttachmentCombination(
    existingAttachments: Array<Pick<NoticeAttachmentRecord, 'id' | 'size'>>,
    newFiles: UploadedNoticeFile[],
  ) {
    this.validateNewAttachments(newFiles);

    if (existingAttachments.length + newFiles.length > NOTICE_ATTACHMENT_MAX_FILES) {
      throw new AppError(
        '첨부파일 수가 너무 많습니다. 파일 수를 줄여주세요.',
        400,
        'NOTICE_ATTACHMENT_TOO_MANY_FILES',
      );
    }

    const currentBytes =
      existingAttachments.reduce((sum, attachment) => sum + attachment.size, 0) +
      newFiles.reduce((sum, file) => sum + file.size, 0);

    if (currentBytes > NOTICE_ATTACHMENT_MAX_TOTAL_BYTES) {
      throw new AppError(
        `첨부파일 총합은 ${this.formatBytes(NOTICE_ATTACHMENT_MAX_TOTAL_BYTES)} 이하여야 합니다.`,
        400,
        'NOTICE_ATTACHMENT_TOTAL_TOO_LARGE',
      );
    }
  }

  private validateAttachmentType(fileName: string) {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (!extension || !NOTICE_ATTACHMENT_ALLOWED_EXTENSIONS.has(extension)) {
      throw new AppError(
        '허용되지 않은 첨부파일 형식입니다.',
        400,
        'NOTICE_ATTACHMENT_INVALID_TYPE',
      );
    }
  }

  private async createAttachments(
    tx: NoticeTransactionClient,
    noticeId: number,
    files: UploadedNoticeFile[],
    isPinned: boolean,
  ) {
    if (files.length === 0) {
      return;
    }

    for (const file of files) {
      await tx.noticeAttachment.create({
        data: {
          noticeId,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          data: Uint8Array.from(file.buffer),
          expiresAt: isPinned ? null : createNoticeAttachmentExpiry(),
        },
      });
    }
  }

  private formatNotice(notice: NoticeWithOptionalReceipts) {
    const readAt = this.extractReadAt(notice);

    return {
      id: notice.id,
      title: notice.title,
      content: notice.body,
      createdAt: notice.createdAt,
      updatedAt: notice.updatedAt,
      viewCount: notice.viewCount,
      isPinned: notice.isPinned,
      targetSetting: notice.targetSetting,
      author: { name: notice.author?.name || null },
      attachments: notice.attachments.map((attachment) =>
        this.formatAttachment(attachment, notice.isPinned),
      ),
      ...(typeof readAt !== 'undefined'
        ? {
            readAt,
            isRead: readAt !== null,
          }
        : {}),
    };
  }

  private extractReadAt(notice: NoticeWithOptionalReceipts) {
    if (!Array.isArray(notice.receipts) || notice.receipts.length === 0) {
      return undefined;
    }

    return notice.receipts[0]?.readAt ?? null;
  }

  private formatAttachment(attachment: NoticeAttachmentRecord, noticeIsPinned: boolean) {
    const expiresAt = noticeIsPinned ? null : attachment.expiresAt;

    return {
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      createdAt: attachment.createdAt,
      expiresAt,
      isExpired: this.isAttachmentExpired(false, expiresAt),
      isImage: attachment.mimeType.startsWith('image/'),
    };
  }

  private isAttachmentExpired(noticeIsPinned: boolean, expiresAt: Date | null) {
    if (noticeIsPinned || !expiresAt) {
      return false;
    }

    return expiresAt.getTime() <= Date.now();
  }

  private formatBytes(value: number) {
    const mb = value / (1024 * 1024);
    return `${mb.toFixed(mb % 1 === 0 ? 0 : 1)}MB`;
  }

  private async getDownloadableAttachmentMetadata(
    attachmentId: number,
    userId?: number,
    isAdmin = false,
  ): Promise<NoticeAttachmentAccessRecord> {
    const attachment =
      userId && !isAdmin
        ? await noticeRepository.findAttachmentAccessByIdForUser(attachmentId, userId)
        : await noticeRepository.findAttachmentAccessById(attachmentId);

    if (!attachment) {
      throw new AppError('첨부파일을 찾을 수 없습니다.', 404, 'NOTICE_ATTACHMENT_NOT_FOUND');
    }

    if (this.isAttachmentExpired(attachment.notice.isPinned, attachment.expiresAt)) {
      throw new AppError(
        '첨부파일 다운로드 기간이 만료되었습니다.',
        410,
        'NOTICE_ATTACHMENT_EXPIRED',
      );
    }

    return attachment;
  }

  private async getDownloadableAttachmentData(
    attachmentId: number,
    userId?: number,
    isAdmin = false,
  ): Promise<NoticeAttachmentDownloadRecord> {
    await this.getDownloadableAttachmentMetadata(attachmentId, userId, isAdmin);

    const attachment =
      userId && !isAdmin
        ? await noticeRepository.findAttachmentByIdForUser(attachmentId, userId)
        : await noticeRepository.findAttachmentById(attachmentId);

    if (!attachment) {
      throw new AppError('첨부파일을 찾을 수 없습니다.', 404, 'NOTICE_ATTACHMENT_NOT_FOUND');
    }

    return attachment;
  }
}

export default new NoticeService();
