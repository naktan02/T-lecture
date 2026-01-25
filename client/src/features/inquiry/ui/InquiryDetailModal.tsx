import { ReactElement, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Inquiry } from '../api/inquiryApi';

interface InquiryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: Inquiry | null;
  onDelete?: (id: number) => void;
}

export const InquiryDetailModal = ({
  isOpen,
  onClose,
  inquiry,
  onDelete,
}: InquiryDetailModalProps): ReactElement => {
  if (!inquiry) return <></>;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    문의 상세
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* 본문 */}
                <div className="p-5 space-y-5">
                  {/* 상태 */}
                  <div>
                    {inquiry.status === 'Waiting' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        <ClockIcon className="w-4 h-4" />
                        답변 대기중
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                        <CheckCircleIcon className="w-4 h-4" />
                        답변 완료
                      </span>
                    )}
                  </div>

                  {/* 제목 */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{inquiry.title}</h3>
                    <p className="text-sm text-gray-500">작성일: {formatDate(inquiry.createdAt)}</p>
                  </div>

                  {/* 내용 */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div
                      className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: inquiry.content }}
                    />
                  </div>

                  {/* 답변 */}
                  {inquiry.status === 'Answered' && inquiry.answer && (
                    <div className="border-t border-gray-200 pt-5">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        관리자 답변
                      </h4>
                      <div className="bg-green-50 rounded-xl p-4">
                        <div
                          className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: inquiry.answer }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        답변자: {inquiry.answeredBy?.name || '-'} | 답변일:{' '}
                        {formatDate(inquiry.answeredAt)}
                      </p>
                    </div>
                  )}
                </div>

                {/* 푸터 */}
                <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                  {inquiry.status === 'Waiting' && onDelete && (
                    <button
                      onClick={() => onDelete(inquiry.id)}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      문의 취소
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
