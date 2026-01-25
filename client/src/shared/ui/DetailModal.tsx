// client/src/shared/ui/DetailModal.tsx
import React, { ReactNode } from 'react';

interface ModalField {
  label: string;
  value: string | number | string[] | ReactNode | null | undefined;
  isLong?: boolean;
}

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fields?: ModalField[];
  zIndex?: number; // z-index 죀절용 (default: 50)
}

/**
 * Notion 스타일의 상세 정보 모달
 */
export const DetailModal: React.FC<DetailModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  fields = [],
  zIndex = 50,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity duration-300"
      style={{ zIndex }}
    >
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-fadeInScale transform transition-all flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-start shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body: 설정 기반 렌더링 */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            {fields.map((field, idx) => {
              // 1. 값이 없으면 렌더링 안 함 (0은 렌더링 함)
              if (field.value === null || field.value === undefined || field.value === '')
                return null;

              // 2. 값이 배열이면 문자열로 변환, 컴포넌트(React Element)면 그대로 유지
              let displayValue: ReactNode = field.value;
              if (Array.isArray(field.value)) {
                displayValue = field.value.join(', ');
              }

              return (
                <div
                  key={idx}
                  className={`flex border-b border-gray-50 pb-3 last:border-0 last:pb-0 
                                        ${field.isLong ? 'flex-col items-start gap-2' : 'flex-col sm:flex-row sm:items-center'}`}
                >
                  <span
                    className={`text-sm font-medium text-gray-500 w-32 shrink-0 ${field.isLong ? '' : 'pt-0.5'}`}
                  >
                    {field.label}
                  </span>
                  <div className="text-sm text-gray-800 font-medium break-words flex-1 w-full">
                    {displayValue}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm text-gray-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
