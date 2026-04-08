import { useMediaQuery } from './useMediaQuery';

export interface ViewportHeightTier {
  isShortViewport: boolean;
  isVeryShortViewport: boolean;
}

export const useViewportHeightTier = (): ViewportHeightTier => {
  const isShortViewport = useMediaQuery('(max-height: 980px)');
  const isVeryShortViewport = useMediaQuery('(max-height: 860px)');

  return {
    isShortViewport,
    isVeryShortViewport,
  };
};
