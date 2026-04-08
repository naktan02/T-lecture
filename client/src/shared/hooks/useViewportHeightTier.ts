import { useMediaQuery } from './useMediaQuery';

export interface ViewportHeightTier {
  isCompactViewport: boolean;
  isShortViewport: boolean;
  isVeryShortViewport: boolean;
}

export const useViewportHeightTier = (): ViewportHeightTier => {
  const isCompactViewport = useMediaQuery('(max-height: 1120px)');
  const isShortViewport = useMediaQuery('(max-height: 980px)');
  const isVeryShortViewport = useMediaQuery('(max-height: 860px)');

  return {
    isCompactViewport,
    isShortViewport,
    isVeryShortViewport,
  };
};
