import { Fragment, ReactElement, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { showError } from '../../../shared/utils/toast';
import { Notice, noticeApi } from '../api/noticeApi';

interface NoticeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: Notice | null;
}

const formatBytes = (size: number) => {
  const mb = size / (1024 * 1024);
  return `${mb.toFixed(mb >= 1 ? 1 : 2)}MB`;
};

export const NoticeDetailModal = ({
  isOpen,
  onClose,
  notice,
}: NoticeDetailModalProps): ReactElement => {
  const [downloadingAttachmentIds, setDownloadingAttachmentIds] = useState<number[]>([]);

  if (!notice) {
    return <></>;
  }

  const attachments = notice.attachments ?? [];

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-3 text-left sm:mt-5">
                  <Dialog.Title
                    as="h3"
                    className="border-b pb-4 text-xl font-semibold leading-6 text-gray-900"
                  >
                    {notice.title}
                  </Dialog.Title>
                  <div className="mt-4 flex gap-4 border-b pb-4 text-sm text-gray-500">
                    <span>작성자: {notice.author.name || '관리자'}</span>
                    <span>작성일: {new Date(notice.createdAt).toLocaleDateString()}</span>
                    <span>조회수: {notice.viewCount}</span>
                  </div>
                  <div className="mt-4 min-h-[200px] whitespace-pre-wrap">
                    <p className="text-sm text-gray-700">{notice.content}</p>
                  </div>

                  {attachments.length > 0 && (
                    <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-800">첨부파일</h4>
                        {notice.isPinned && (
                          <span className="text-xs text-amber-600">
                            상단 고정 중이라 첨부 만료가 유예됩니다.
                          </span>
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        {attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-800">
                                {attachment.originalName}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                                <span>{formatBytes(attachment.size)}</span>
                                {attachment.isImage && <span>이미지</span>}
                                {attachment.isExpired ? (
                                  <span className="text-red-500">다운로드 만료</span>
                                ) : attachment.expiresAt ? (
                                  <span>
                                    다운로드 가능:{' '}
                                    {new Date(attachment.expiresAt).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span>상단 고정 중</span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={
                                attachment.isExpired ||
                                downloadingAttachmentIds.includes(attachment.id)
                              }
                              onClick={async () => {
                                setDownloadingAttachmentIds((prev) =>
                                  prev.includes(attachment.id) ? prev : [...prev, attachment.id],
                                );

                                try {
                                  await noticeApi.downloadAttachment(
                                    attachment.id,
                                    attachment.originalName,
                                  );
                                } catch (error) {
                                  showError(
                                    error instanceof Error
                                      ? error.message
                                      : '첨부파일 다운로드에 실패했습니다.',
                                  );
                                } finally {
                                  setDownloadingAttachmentIds((prev) =>
                                    prev.filter((id) => id !== attachment.id),
                                  );
                                }
                              }}
                              className="ml-3 rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                              {downloadingAttachmentIds.includes(attachment.id)
                                ? '다운로드 중...'
                                : '다운로드'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-5 sm:mt-6">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    onClick={onClose}
                  >
                    닫기
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
