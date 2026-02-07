// src/shared/hooks/useMediaQuery.ts
// 반응형 미디어 쿼리 감지 훅

import { useState, useEffect } from 'react';

/**
 * 미디어 쿼리 매칭 여부를 반환하는 훅
 * @param query CSS 미디어 쿼리 문자열 (예: '(min-width: 768px)')
 * @returns 미디어 쿼리 매칭 여부
 *
 * @example
 * const isDesktop = useMediaQuery('(min-width: 768px)');
 * const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    // SSR 대응: window가 없을 경우 false 반환
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    // SSR 환경에서 실행 방지
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);

    // 초기값 동기화
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // 미디어 쿼리 변경 리스너
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // 이벤트 리스너 등록
    media.addEventListener('change', listener);

    // 클린업
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query, matches]);

  return matches;
};

// 자주 사용하는 프리셋
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');
export const useIsLargeDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useIsMobile = () => !useMediaQuery('(min-width: 768px)');
