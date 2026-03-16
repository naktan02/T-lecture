import { useState, useEffect } from 'react';

export interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  images: string[];
}

export const TutorialModal = ({ isOpen, onClose, title, images }: TutorialModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setImageErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleImageError = (index: number) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <h2 className="text-lg font-bold text-gray-800">{title} 사용법</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body (Images) */}
        <div className="relative flex-1 p-6 overflow-hidden flex items-center justify-center bg-gray-50/50">
          {images.length === 0 ? (
            <div className="text-gray-400 text-center py-20">
              <p>등록된 튜토리얼 이미지가 없습니다.</p>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center min-h-[400px]">
              {imageErrors[currentIndex] ? (
                <div className="flex flex-col items-center justify-center p-12 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 w-full max-w-3xl aspect-[16/9]">
                  <span className="text-4xl mb-3">🖼️</span>
                  <p className="text-sm font-bold text-gray-600">이미지를 찾을 수 없습니다.</p>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    경로: <code className="bg-gray-200 px-1 py-0.5 rounded text-[10px] break-all">{images[currentIndex]}</code>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">해당 경로에 이미지를 추가해주세요.</p>
                </div>
              ) : (
                <img
                  src={images[currentIndex]}
                  alt={`${title} 튜토리얼 ${currentIndex + 1}`}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-sm border border-gray-200"
                  onError={() => handleImageError(currentIndex)}
                />
              )}
            </div>
          )}

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 shadow-md text-gray-700 rounded-full hover:bg-white hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === images.length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 shadow-md text-gray-700 rounded-full hover:bg-white hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Footer (Indicators) */}
        {images.length > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white shrink-0">
            <div className="text-sm font-medium text-gray-500">
              {currentIndex + 1} <span className="text-gray-300">/</span> {images.length}
            </div>
            <div className="flex items-center gap-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    currentIndex === idx ? 'bg-green-500' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            {/* 밸런스를 맞추기 위한 빈 영역 */}
            <div className="w-[40px]"></div>
          </div>
        )}
      </div>
    </div>
  );
};
