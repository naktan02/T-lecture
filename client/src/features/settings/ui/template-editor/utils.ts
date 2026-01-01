// features/settings/ui/template-editor/utils.ts
// HTML ↔ Token 변환 유틸리티

import type { VariableRegistry } from './types';
import { CATEGORY_COLORS, FORMAT_STYLE } from './styles';

/**
 * 템플릿 문자열 → HTML 변환
 */
export function templateToHtml(template: string, registry: VariableRegistry): string {
  const regex = /\{\{([\s\S]*?)\}\}/g;

  let result = template.replace(regex, (_, content) => {
    const idx = content.indexOf(':format=');
    let key = content.trim();
    let format = '';
    let isFormat = false;

    if (idx !== -1) {
      key = content.slice(0, idx).trim();
      format = content.slice(idx + ':format='.length);
      isFormat = true;
    }

    const info = registry.get(registry.normalizeKey(key));
    const label = info?.label ?? key;
    const icon = info?.icon ?? '🏷️';
    const category = info?.category || 'default';
    const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;

    const borderStyle = isFormat ? FORMAT_STYLE.borderStyle : 'solid';
    const borderWidth = isFormat ? FORMAT_STYLE.borderWidth : '1px';

    const style = `display:inline-flex;align-items:center;gap:2px;padding:1px 6px;border-radius:10px;border:${borderWidth} ${borderStyle} ${colors.border};background:${colors.bg};color:${colors.text};margin:0 1px;user-select:none;cursor:${isFormat ? 'pointer' : 'grab'};font-size:11px;font-weight:500;vertical-align:middle;`;

    const dataAttr = isFormat ? `data-format="${encodeURIComponent(format)}"` : '';
    const formatBadge = isFormat ? `<span style="font-size:9px;opacity:0.7;">(포맷)</span>` : '';

    return `<span contenteditable="false" draggable="true" class="var-block" data-variable="${key}" data-category="${category}" ${dataAttr} style="${style}">${icon} ${label}${formatBadge}<button type="button" class="var-delete" style="margin-left:2px;width:12px;height:12px;border-radius:50%;border:none;background:${colors.border};color:#fff;cursor:pointer;font-size:8px;line-height:1;opacity:0.8;">×</button></span>`;
  });

  result = result.replace(/\n/g, '<br>');
  return result;
}

/**
 * HTML → 템플릿 문자열 변환
 */
export function htmlToTemplate(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  div.querySelectorAll('.var-block').forEach((el) => {
    const key = el.getAttribute('data-variable') || '';
    const format = el.getAttribute('data-format');

    let replacement = '';
    if (format !== null) {
      replacement = `{{${key}:format=${decodeURIComponent(format)}}}`;
    } else {
      replacement = `{{${key}}}`;
    }
    el.replaceWith(replacement);
  });

  let text = div.innerHTML;
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/div><div>/gi, '\n');
  text = text.replace(/<div>/gi, '\n');
  text = text.replace(/<\/div>/gi, '');
  text = text.replace(/<\/p><p>/gi, '\n');
  text = text.replace(/<p>/gi, '');
  text = text.replace(/<\/p>/gi, '\n');

  const textDiv = document.createElement('div');
  textDiv.innerHTML = text;
  return (textDiv.textContent || '').replace(/\n{3,}/g, '\n\n'); // 불필요한 연속 줄바꿈 방지
}

/**
 * 드롭 위치에서 Range 가져오기 (크로스 브라우저)
 */
export function getRangeFromPoint(x: number, y: number): Range | null {
  // Chrome, Safari
  if (document.caretRangeFromPoint) {
    return document.caretRangeFromPoint(x, y);
  }

  // Firefox
  if ((document as any).caretPositionFromPoint) {
    const pos = (document as any).caretPositionFromPoint(x, y);
    if (pos) {
      const range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
      return range;
    }
  }

  return null;
}

/**
 * 변수 블록 HTML 생성
 */
export function createVariableHtml(
  key: string,
  label: string,
  icon: string,
  category: string,
  isFormat: boolean,
  format?: string,
): string {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
  const borderStyle = isFormat ? FORMAT_STYLE.borderStyle : 'solid';
  const borderWidth = isFormat ? FORMAT_STYLE.borderWidth : '1px';

  const style = `display:inline-flex;align-items:center;gap:2px;padding:1px 6px;border-radius:10px;border:${borderWidth} ${borderStyle} ${colors.border};background:${colors.bg};color:${colors.text};margin:0 1px;user-select:none;cursor:${isFormat ? 'pointer' : 'grab'};font-size:11px;font-weight:500;vertical-align:middle;`;

  const dataAttr = isFormat ? `data-format="${encodeURIComponent(format || '')}"` : '';
  const formatBadge = isFormat ? `<span style="font-size:9px;opacity:0.7;">(포맷)</span>` : '';

  return `<span contenteditable="false" draggable="true" class="var-block" data-variable="${key}" data-category="${category}" ${dataAttr} style="${style}">${icon} ${label}${formatBadge}<button type="button" class="var-delete" style="margin-left:2px;width:12px;height:12px;border-radius:50%;border:none;background:${colors.border};color:#fff;cursor:pointer;font-size:8px;line-height:1;opacity:0.8;">×</button></span>`;
}
