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

  const out: string[] = [];
  const pushNL = () => {
    if (out.length === 0) return out.push('\n');
    if (out[out.length - 1] !== '\n') out.push('\n');
  };
  
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out.push(node.textContent ?? '');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;

    // ✅ 변수 블록(span.var-block) → 템플릿 토큰으로 직렬화
    if (el.classList.contains('var-block')) {
      const key = el.getAttribute('data-variable') || '';
      const format = el.getAttribute('data-format');
      if (format) out.push(`{{${key}:format=${decodeURIComponent(format)}}}`);
      else out.push(`{{${key}}}`);
      return;
    }

    // ✅ br → 개행 1번
    if (el.tagName === 'BR') {
      pushNL();
      return;
    }

    // ✅ Enter가 자주 만드는 <div><br></div> 는 개행 1번만
    if ((el.tagName === 'DIV' || el.tagName === 'P') && el.childNodes.length === 1) {
      const only = el.childNodes[0];
      if (only.nodeType === Node.ELEMENT_NODE && (only as HTMLElement).tagName === 'BR') {
        pushNL();
        return;
      }
    }

    // 일반 요소: 자식 순회
    el.childNodes.forEach(walk);

    // 블록 요소 끝에서는 개행(중복 방지)
    if (el.tagName === 'DIV' || el.tagName === 'P') pushNL();
  };

  div.childNodes.forEach(walk);

  // 끝 개행 1개 제거(원치 않는 “한 줄 더 내려감” 방지)
  if (out[out.length - 1] === '\n') out.pop();

  // 너무 많은 개행은 2개까지만(빈줄 유지)
  return out.join('').replace(/\n{3,}/g, '\n\n');
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
