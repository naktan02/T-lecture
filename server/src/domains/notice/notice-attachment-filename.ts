const suspiciousFilenameCharPattern = /[\u0080-\u009f\u00c0-\u00ff]/;

const countSuspiciousFilenameChars = (value: string) =>
  Array.from(value).filter((char) => suspiciousFilenameCharPattern.test(char)).length;

export const normalizeNoticeAttachmentFilename = (filename: string) => {
  if (!filename || !suspiciousFilenameCharPattern.test(filename)) {
    return filename;
  }

  const decoded = Buffer.from(filename, 'latin1').toString('utf8');

  if (!decoded || decoded.includes('\uFFFD')) {
    return filename;
  }

  return countSuspiciousFilenameChars(decoded) < countSuspiciousFilenameChars(filename)
    ? decoded
    : filename;
};
