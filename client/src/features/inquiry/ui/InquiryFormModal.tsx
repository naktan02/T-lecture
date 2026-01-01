import { ReactElement, Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface InquiryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string }) => Promise<void>;
}

export const InquiryFormModal = ({
  isOpen,
  onClose,
  onSubmit,
}: InquiryFormModalProps): ReactElement => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), content: content.trim() });
      setTitle('');
      setContent('');
      onClose();
    } catch {
      alert('문의 작성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setContent('');
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
                    문의하기
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* 본문 */}
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">제목</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="문의 제목을 입력하세요"
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">내용</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="문의 내용을 입력하세요"
                      disabled={isSubmitting}
                      rows={6}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {/* 푸터 */}
                <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !title.trim() || !content.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '작성 중...' : '작성하기'}
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
