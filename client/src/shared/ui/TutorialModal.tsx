import { useState, useEffect, useCallback } from 'react';

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

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, images.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen) return null;

  const handleImageError = (index: number) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal — takes up 95% of viewport */}
      <div
        className="relative z-10 flex flex-col bg-white rounded-2xl shadow-2xl"
        style={{ width: '95vw', height: '95vh', maxWidth: '1600px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <h2 className="text-base md:text-lg font-bold text-gray-800">{title} 사용법</h2>
          </div>
          <div className="flex items-center gap-3">
            {images.length > 1 && (
              <span className="text-sm text-gray-400 font-medium">
                {currentIndex + 1} / {images.length}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Image Area — fills all remaining space */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-gray-50 min-h-0">
          {images.length === 0 ? (
            <p className="text-gray-400 text-sm">등록된 튜토리얼 이미지가 없습니다.</p>
          ) : imageErrors[currentIndex] ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <span className="text-5xl mb-4">🖼️</span>
              <p className="text-sm font-bold text-gray-600">이미지를 찾을 수 없습니다.</p>
              <p className="text-xs text-gray-400 mt-2">경로: <code className="bg-gray-200 px-1 py-0.5 rounded break-all">{images[currentIndex]}</code></p>
              <p className="text-xs text-gray-400 mt-1">해당 경로에 이미지를 추가해주세요.</p>
            </div>
          ) : (
            <img
              key={currentIndex}
              src={images[currentIndex]}
              alt={`${title} 튜토리얼 ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain select-none"
              onError={() => handleImageError(currentIndex)}
              draggable={false}
            />
          )}

          {/* Prev Arrow */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-white/90 shadow-lg rounded-full text-gray-700 hover:text-green-600 hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {/* Next Arrow */}
              <button
                onClick={handleNext}
                disabled={currentIndex === images.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-white/90 shadow-lg rounded-full text-gray-700 hover:text-green-600 hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Footer — dot indicators */}
        {images.length > 1 && (
          <div className="shrink-0 flex items-center justify-center gap-2 py-3 border-t border-gray-100 bg-white">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`rounded-full transition-all ${
                  currentIndex === idx
                    ? 'w-4 h-2.5 bg-green-500'
                    : 'w-2.5 h-2.5 bg-gray-200 hover:bg-gray-300'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
