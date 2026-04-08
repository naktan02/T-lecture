import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import AppError from '../../common/errors/AppError';

const NOTICE_ATTACHMENT_DOWNLOAD_SCOPE = 'notice-attachment-download';
const NOTICE_ATTACHMENT_DOWNLOAD_TTL_SECONDS = 60;

interface NoticeAttachmentDownloadTokenPayload {
  scope: typeof NOTICE_ATTACHMENT_DOWNLOAD_SCOPE;
  attachmentId: number;
  userId: number;
  isAdmin: boolean;
}

const getNoticeAttachmentDownloadSecret = () => {
  const dedicatedSecret = process.env.NOTICE_ATTACHMENT_DOWNLOAD_SECRET;
  if (dedicatedSecret) {
    return dedicatedSecret;
  }

  const baseSecret = process.env.JWT_SECRET;
  const secret = baseSecret
    ? crypto.createHmac('sha256', baseSecret).update(NOTICE_ATTACHMENT_DOWNLOAD_SCOPE).digest('hex')
    : undefined;

  if (!secret) {
    throw new AppError('서버 설정 오류: 다운로드 토큰 시크릿이 없습니다.', 500, 'CONFIG_ERROR');
  }

  return secret;
};

export const createNoticeAttachmentDownloadToken = (payload: {
  attachmentId: number;
  userId: number;
  isAdmin: boolean;
}) => {
  const secret = getNoticeAttachmentDownloadSecret();
  const expiresAt = new Date(Date.now() + NOTICE_ATTACHMENT_DOWNLOAD_TTL_SECONDS * 1000);
  const token = jwt.sign(
    {
      scope: NOTICE_ATTACHMENT_DOWNLOAD_SCOPE,
      attachmentId: payload.attachmentId,
      userId: payload.userId,
      isAdmin: payload.isAdmin,
    } satisfies NoticeAttachmentDownloadTokenPayload,
    secret,
    { expiresIn: NOTICE_ATTACHMENT_DOWNLOAD_TTL_SECONDS },
  );

  return { token, expiresAt };
};

export const verifyNoticeAttachmentDownloadToken = (
  token: string,
): NoticeAttachmentDownloadTokenPayload => {
  try {
    const secret = getNoticeAttachmentDownloadSecret();
    const payload = jwt.verify(token, secret) as Partial<NoticeAttachmentDownloadTokenPayload>;

    if (
      payload.scope !== NOTICE_ATTACHMENT_DOWNLOAD_SCOPE ||
      !Number.isInteger(payload.attachmentId) ||
      !Number.isInteger(payload.userId) ||
      typeof payload.isAdmin !== 'boolean'
    ) {
      throw new AppError('유효하지 않은 다운로드 토큰입니다.', 401, 'INVALID_DOWNLOAD_TOKEN');
    }

    return payload as NoticeAttachmentDownloadTokenPayload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      '유효하지 않거나 만료된 다운로드 토큰입니다.',
      401,
      'INVALID_DOWNLOAD_TOKEN',
    );
  }
};

export const NOTICE_ATTACHMENT_DOWNLOAD_TTL_MS = NOTICE_ATTACHMENT_DOWNLOAD_TTL_SECONDS * 1000;
