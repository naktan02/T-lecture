// src/shared/ui/template-editor/styles.ts
// 템플릿 에디터 스타일 상수

/**
 * 카테고리별 색상 팔레트
 */
export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  unit: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' }, // 파랑
  period: { bg: '#ffedd5', border: '#f97316', text: '#c2410c' }, // 주황
  location: { bg: '#d1fae5', border: '#10b981', text: '#047857' }, // 초록
  self: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' }, // 보라
  instructor: { bg: '#fce7f3', border: '#ec4899', text: '#be185d' }, // 핑크
  default: { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' }, // 회색 (기본)
};

/**
 * 포맷 변수 스타일 (점선 테두리)
 */
export const FORMAT_STYLE = {
  borderStyle: 'dashed',
  borderWidth: '2px',
};

/**
 * 에디터 기본 스타일
 */
export const EDITOR_STYLE = {
  minHeight: 250,
  padding: 14,
  borderRadius: 10,
  lineHeight: 2,
  fontSize: 14,
};

/**
 * 패널 스타일
 */
export const PANEL_STYLE = {
  width: 340,
  borderRadius: 10,
};

/**
 * 변수 블록 스타일
 */
export const BLOCK_STYLE = {
  padding: '1px 6px',
  borderRadius: 10,
  fontSize: 11,
  iconSize: 12,
  deleteButtonSize: 12,
  gap: 2,
};
