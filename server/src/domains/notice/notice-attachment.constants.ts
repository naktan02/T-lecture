const DEFAULT_ATTACHMENT_TTL_DAYS = 7;

// Hidden hard cap to protect memory and DB usage even though UI only advertises total size.
export const NOTICE_ATTACHMENT_MAX_FILES = 10;
export const NOTICE_ATTACHMENT_MAX_TOTAL_BYTES = 5 * 1024 * 1024;
export const NOTICE_ATTACHMENT_ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'hwp',
  'hwpx',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'png',
  'jpg',
  'jpeg',
  'webp',
]);

export const NOTICE_ATTACHMENT_TTL_DAYS = Math.max(
  1,
  Number(process.env.NOTICE_ATTACHMENT_TTL_DAYS || DEFAULT_ATTACHMENT_TTL_DAYS),
);

export const createNoticeAttachmentExpiry = (baseDate = new Date()): Date => {
  const expiresAt = new Date(baseDate);
  expiresAt.setDate(expiresAt.getDate() + NOTICE_ATTACHMENT_TTL_DAYS);
  return expiresAt;
};
