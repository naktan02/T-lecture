// server/src/common/constants/constants.ts
export const PROMOTION_CRITERIA = {
  MIN_LECTURE_HOURS: 50,
} as const;

export type PromotionCriteria = typeof PROMOTION_CRITERIA;