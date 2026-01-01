import { ReactElement, Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Inquiry } from '../api/inquiryApi';

interface InquiryAnswerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: Inquiry | null;
  onAnswer: (id: number, answer: string) => Promise<void>;
}

export const InquiryAnswerDrawer = ({
  isOpen,
  onClose,
  inquiry,
  onAnswer,
}: InquiryAnswerDrawerProps): ReactElement => {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    if (!inquiry || !answer.trim()) {
      alert('답변 내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAnswer(inquiry.id, answer.trim());
      setAnswer('');
      onClose();
    } catch {
      alert('답변 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setAnswer('');
      onClose();
    }
  };

  if (!inquiry) return <></>;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-lg">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                      <Dialog.Title className="text-lg font-semibold text-gray-900">
                        문의 상세 / 답변
                      </Dialog.Title>
                      <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>

                    {/* 본문 */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {/* 상태 & 작성자 */}
                      <div className="flex items-center justify-between">
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
                        <span className="text-sm text-gray-500">
                          작성자: {inquiry.author.name || '-'}
                        </span>
                      </div>

                      {/* 제목 */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{inquiry.title}</h3>
                        <p className="text-sm text-gray-500">
                          작성일: {formatDate(inquiry.createdAt)}
                        </p>
                      </div>

                      {/* 문의 내용 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          문의 내용
                        </label>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <div
                            className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: inquiry.content }}
                          />
                        </div>
                      </div>

                      {/* 기존 답변 or 답변 작성 */}
                      {inquiry.status === 'Answered' && inquiry.answer ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-600" />
                            등록된 답변
                          </label>
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
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            답변 작성
                          </label>
                          <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="답변 내용을 입력하세요"
                            disabled={isSubmitting}
                            rows={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:bg-gray-100"
                          />
                        </div>
                      )}
                    </div>

                    {/* 푸터 */}
                    <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        닫기
                      </button>
                      {inquiry.status === 'Waiting' && (
                        <button
                          onClick={handleSubmit}
                          disabled={isSubmitting || !answer.trim()}
                          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? '등록 중...' : '답변 등록'}
                        </button>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
