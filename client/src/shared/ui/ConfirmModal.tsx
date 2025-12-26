// client/src/shared/ui/ConfirmModal.tsx
import { ReactNode, useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal = ({
  isOpen,
  title = '확인',
  message,
  confirmText = '확인',
  cancelText = '취소',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  // 모달 열릴 때 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const confirmButtonClass =
    confirmVariant === 'danger'
      ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
      : 'bg-green-500 hover:bg-green-600 focus:ring-green-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      {/* 모달 본체 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-2">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>

        {/* 본문 */}
        <div className="px-6 py-4">
          <div className="text-gray-600">{message}</div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-medium
                       hover:bg-gray-200 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={`flex-1 px-4 py-3 text-white rounded-xl font-medium
                       active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-offset-2
                       ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
