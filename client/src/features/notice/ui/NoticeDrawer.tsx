import { Fragment, ReactElement } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Notice } from '../api/noticeApi';
import { NoticeForm } from './NoticeForm';

interface NoticeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notice?: Notice | null; // If null, mode is Create
  onSave: (data: { title: string; content: string }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

export const NoticeDrawer = ({
  isOpen,
  onClose,
  notice,
  onSave,
  onDelete,
}: NoticeDrawerProps): ReactElement => {
  const isEditMode = !!notice;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <div className="fixed inset-0 overflow-hidden">
          {/* Backdrop with blur */}
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                    <div className="px-4 py-6 sm:px-6">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="text-base font-semibold leading-6 text-gray-900">
                          {isEditMode ? '공지사항 수정' : '공지사항 등록'}
                        </Dialog.Title>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            onClick={onClose}
                          >
                            <span className="absolute -inset-2.5" />
                            <span className="sr-only">Close panel</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="relative flex-1 px-4 py-6 sm:px-6">
                      <NoticeForm
                        initialData={
                          notice
                            ? {
                                title: notice.title,
                                content: notice.content,
                                isPinned: notice.isPinned,
                              }
                            : undefined
                        }
                        onSubmit={onSave}
                        onCancel={onClose}
                        isEditMode={isEditMode}
                      />

                      {isEditMode && onDelete && (
                        <div className="mt-8 pt-6 border-t border-gray-200">
                          <button
                            onClick={() => {
                              if (confirm('정말 삭제하시겠습니까?')) {
                                onDelete(notice.id);
                              }
                            }}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            삭제하기
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
