const assert = require('node:assert/strict');
const {
  normalizeNoticeAttachmentFilename,
} = require('../../src/domains/notice/notice-attachment-filename');

describe('normalizeNoticeAttachmentFilename', () => {
  it('repairs UTF-8 Korean filenames that were decoded as latin1', () => {
    const broken = 'AI-PORT ì ìì.pdf';

    assert.equal(normalizeNoticeAttachmentFilename(broken), 'AI-PORT 제안서.pdf');
  });

  it('leaves already-correct Korean filenames unchanged', () => {
    const original = '부서2 에이포트 복구안.pdf';

    assert.equal(normalizeNoticeAttachmentFilename(original), original);
  });

  it('leaves valid latin filenames unchanged', () => {
    const original = 'resume-final.pdf';

    assert.equal(normalizeNoticeAttachmentFilename(original), original);
  });
});
