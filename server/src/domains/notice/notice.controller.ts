import { Request, Response } from 'express';
import asyncHandler from '../../common/middlewares/asyncHandler';
import noticeService from './notice.service';

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  if (value === 'true' || value === '1' || value === 'on') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  return undefined;
};

const parseNumberArray = (value: unknown): number[] | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const source =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return value.split(',').map((item) => item.trim());
          }
        })()
      : value;

  if (!Array.isArray(source)) {
    return undefined;
  }

  return source.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0);
};

const parseTargetType = (value: unknown) => {
  if (value === 'ALL' || value === 'TEAM' || value === 'INDIVIDUAL') {
    return value;
  }

  return undefined;
};

const getUploadedFiles = (req: Request) =>
  Array.isArray(req.files) ? req.files : ([] as Express.Multer.File[]);

const sendNoticeAttachment = (
  res: Response,
  attachment: { mimeType: string; originalName: string; size: number; data: Uint8Array | Buffer },
) => {
  const binary = Buffer.isBuffer(attachment.data) ? attachment.data : Buffer.from(attachment.data);
  res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
  );
  res.setHeader('Content-Length', String(attachment.size));
  res.send(binary);
};

export const getNotices = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, sortField, sortOrder, viewAs } = req.query;
  const isInstructorView = viewAs === 'instructor';
  const userId = !req.user?.isAdmin || isInstructorView ? req.user?.id : undefined;

  const result = await noticeService.getAll({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: typeof search === 'string' ? search : undefined,
    sortField: typeof sortField === 'string' ? sortField : undefined,
    sortOrder:
      sortOrder === 'asc' || sortOrder === 'desc' ? (sortOrder as 'asc' | 'desc') : undefined,
    userId,
  });

  res.json(result);
});

export const getNotice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const isInstructorView = req.query.viewAs === 'instructor';
  const isAdmin = req.user?.isAdmin === true && !isInstructorView;

  const notice = await noticeService.getOne(Number(id), {
    userId: req.user?.id,
    isAdmin,
  });

  res.json(notice);
});

export const downloadNoticeAttachment = asyncHandler(async (req: Request, res: Response) => {
  const { attachmentId } = req.params;
  const attachment = await noticeService.downloadAttachment(
    Number(attachmentId),
    req.user?.id,
    req.user?.isAdmin === true,
  );

  sendNoticeAttachment(res, attachment);
});

export const getNoticeAttachmentDownloadTicket = asyncHandler(
  async (req: Request, res: Response) => {
    const { attachmentId } = req.params;
    const ticket = await noticeService.issueAttachmentDownloadTicket(
      Number(attachmentId),
      req.user!.id,
      req.user?.isAdmin === true,
    );

    const downloadPath = `/api/v1/notices/attachments/${attachmentId}/direct-download?token=${encodeURIComponent(ticket.token)}`;

    res.json({
      downloadPath,
      expiresAt: ticket.expiresAt,
    });
  },
);

export const directDownloadNoticeAttachment = asyncHandler(async (req: Request, res: Response) => {
  const { attachmentId } = req.params;
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const attachment = await noticeService.downloadAttachmentByToken(Number(attachmentId), token);

  sendNoticeAttachment(res, attachment);
});

export const createNotice = asyncHandler(async (req: Request, res: Response) => {
  const authorId = req.user!.id;
  const files = getUploadedFiles(req);

  const notice = await noticeService.create(
    {
      title: typeof req.body.title === 'string' ? req.body.title : undefined,
      content: typeof req.body.content === 'string' ? req.body.content : undefined,
      isPinned: parseBoolean(req.body.isPinned),
      targetType: parseTargetType(req.body.targetType),
      targetTeamIds: parseNumberArray(req.body.targetTeamIds),
      targetUserIds: parseNumberArray(req.body.targetUserIds),
    },
    authorId,
    files,
  );

  res.status(201).json(notice);
});

export const updateNotice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const files = getUploadedFiles(req);

  const notice = await noticeService.update(
    Number(id),
    {
      title: typeof req.body.title === 'string' ? req.body.title : undefined,
      content: typeof req.body.content === 'string' ? req.body.content : undefined,
      isPinned: parseBoolean(req.body.isPinned),
      targetType: parseTargetType(req.body.targetType),
      targetTeamIds: parseNumberArray(req.body.targetTeamIds),
      targetUserIds: parseNumberArray(req.body.targetUserIds),
      removeAttachmentIds: parseNumberArray(req.body.removeAttachmentIds),
    },
    files,
  );

  res.json(notice);
});

export const deleteNotice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await noticeService.delete(Number(id));
  res.status(204).send();
});

export const toggleNoticePin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const notice = await noticeService.togglePin(Number(id));
  res.json(notice);
});
