// client/src/shared/ui/ContentWrapper.tsx
import React from 'react';
import { useViewportHeightTier } from '../hooks/useViewportHeightTier';

interface ContentWrapperProps {
  children: React.ReactNode;
  noPadding?: boolean;
  scrollable?: boolean;
}

/**
 * 페이지의 본문 영역을 잡아주는 공통 레이아웃
 * @param noPadding - 패딩 제거 여부 (지도 등 꽉 찬 화면용)
 * @param scrollable - 윈도우 스크롤 허용 여부 (기본값: true)
 * - true: 일반 웹페이지처럼 내용이 많으면 스크롤 생김 (UserMain, Admin 등)
 * - false: 스크롤 없음. 자식 컴포넌트가 알아서 스크롤 처리 (AssignmentWorkspace)
 */
export const ContentWrapper: React.FC<ContentWrapperProps> = ({
  children,
  noPadding = false,
  scrollable = true,
}) => {
  const { isShortViewport, isVeryShortViewport } = useViewportHeightTier();
  const horizontalPaddingClass = isVeryShortViewport
    ? 'px-2 sm:px-3'
    : isShortViewport
      ? 'px-3 md:px-4'
      : 'px-4';
  const verticalPaddingClass = noPadding
    ? ''
    : isVeryShortViewport
      ? 'py-3 md:py-4'
      : isShortViewport
        ? 'py-4 md:py-5'
        : 'py-6';

  return (
    <div
      className={`flex flex-col bg-gray-50 ${
        scrollable
          ? 'min-h-[calc(100dvh-var(--header-height))]'
          : 'h-[calc(100dvh-var(--header-height))]'
      }`}
    >
      <main
        className={`
                    flex-1 min-h-0 w-full max-w-7xl mx-auto flex flex-col
                    ${horizontalPaddingClass}
                    ${verticalPaddingClass}
                    ${scrollable ? '' : 'overflow-hidden'}
                `}
      >
        {children}
      </main>
    </div>
  );
};
