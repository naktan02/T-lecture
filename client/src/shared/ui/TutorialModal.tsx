import { useState, useEffect, useCallback } from 'react';

export interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** 이미지가 들어있는 폴더 경로 (예: /images/tutorial/user/) */
  imageDir: string;
}

/** 이미지 로드 가능 여부를 Promise로 반환 */
const canLoadImage = (src: string): Promise<boolean> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });

export const TutorialModal = ({ isOpen, onClose, title, imageDir }: TutorialModalProps) => {
  const [images, setImages] = useState<string[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 모달이 열릴 때마다 이미지 자동 감지
  useEffect(() => {
    if (!isOpen) return;

    setCurrentIndex(0);
    setImages([]);
    setIsDetecting(true);

    const detectImages = async () => {
      const found: string[] = [];
      const base = imageDir.endsWith('/') ? imageDir : `${imageDir}/`;
      const extensions = ['.png', '.jpg', '.jpeg'];

      for (let i = 1; i <= 50; i++) {
        let foundAny = false;
        for (const ext of extensions) {
          const path = `${base}${i}${ext}`;
          const ok = await canLoadImage(path);
          if (ok) {
            found.push(path);
            foundAny = true;
            break;
          }
        }
        if (!foundAny) break;
      }

      setImages(found);
      setIsDetecting(false);
    };

    detectImages();
  }, [isOpen, imageDir]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, images.length - 1));
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // 키보드 네비게이션
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal — 창 95% 크기 */}
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

        {/* Image Area */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-gray-50 min-h-0">
          {isDetecting ? (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin" />
              <p className="text-sm">이미지 로딩 중...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-8">
              <span className="text-5xl mb-4">🖼️</span>
              <p className="text-sm font-bold text-gray-600">등록된 튜토리얼 이미지가 없습니다.</p>
              <p className="text-xs text-gray-400 mt-2">
                아래 경로에 이미지(pnt, jpg, jpeg)를 추가하면 자동으로 표시됩니다.
              </p>
              <code className="mt-2 text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 break-all">
                client/public{imageDir}1.png (또는 .jpg, .jpeg)
              </code>
            </div>
          ) : (
            <img
              key={currentIndex}
              src={images[currentIndex]}
              alt={`${title} 튜토리얼 ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />
          )}

          {/* Prev / Next Arrows */}
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

        {/* Footer dots */}
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
