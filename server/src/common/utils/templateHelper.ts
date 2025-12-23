// src/common/utils/templateHelper.ts

/**
 * 템플릿의 {{key}}를 data의 값으로 치환합니다.
 */
export const compileTemplate = (
  templateBody: string | null | undefined,
  data: Record<string, unknown>,
): string => {
  if (!templateBody) return '';
  return templateBody.replace(/{{(.*?)}}/g, (match, key) => {
    const trimmedKey = key.trim();
    return data[trimmedKey] !== undefined ? String(data[trimmedKey]) : match;
  });
};
