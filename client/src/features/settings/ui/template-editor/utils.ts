// features/settings/ui/template-editor/utils.ts
// HTML ↔ Token 변환 유틸리티

import type { VariableRegistry } from './types';
import { CATEGORY_COLORS, FORMAT_STYLE, BLOCK_STYLE } from './styles';

/**
 * 템플릿 문자열 → HTML 변환
 */
export function templateToHtml(template: string, registry: VariableRegistry): string {
  // 포맷 변수 먼저 처리 (format= 내부에 } 포함 가능)
  let result = template.replace(
    /\{\{(\w+(?:\.\w+)?):format=([\s\S]*?)\}\}(?=[^}]|$)/g,
    (_, key, format) => {
      const info = registry.get(registry.normalizeKey(key));
      const label = info?.label ?? key;
      const icon = info?.icon ?? '🏷️';
      const category = info?.category || 'default';
      const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;

      const style = `display:inline-flex;align-items:center;gap:${BLOCK_STYLE.gap}px;padding:${BLOCK_STYLE.padding};border-radius:${BLOCK_STYLE.borderRadius}px;border:${FORMAT_STYLE.borderWidth} ${FORMAT_STYLE.borderStyle} ${colors.border};background:${colors.bg};color:${colors.text};margin:0 1px;user-select:none;cursor:pointer;font-size:${BLOCK_STYLE.fontSize}px;font-weight:500;vertical-align:middle;`;

      return `<span contenteditable="false" draggable="true" class="var-block" data-variable="${key}" data-category="${category}" data-format="${encodeURIComponent(format)}" style="${style}"><span style="font-size:${BLOCK_STYLE.iconSize}px;">${icon}</span> ${label}<span style="font-size:8px;opacity:0.7;">(포맷)</span><button type="button" class="var-delete" style="margin-left:1px;width:${BLOCK_STYLE.deleteButtonSize}px;height:${BLOCK_STYLE.deleteButtonSize}px;border-radius:50%;border:none;background:${colors.border};color:#fff;cursor:pointer;font-size:7px;line-height:1;opacity:0.8;">×</button></span>`;
    },
  );

  // 일반 변수 처리
  result = result.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
    const info = registry.get(registry.normalizeKey(key));
    const label = info?.label ?? key;
    const icon = info?.icon ?? '🏷️';
    const category = info?.category || 'default';
    const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;

    const style = `display:inline-flex;align-items:center;gap:${BLOCK_STYLE.gap}px;padding:${BLOCK_STYLE.padding};border-radius:${BLOCK_STYLE.borderRadius}px;border:1px solid ${colors.border};background:${colors.bg};color:${colors.text};margin:0 1px;user-select:none;cursor:grab;font-size:${BLOCK_STYLE.fontSize}px;font-weight:500;vertical-align:middle;`;

    return `<span contenteditable="false" draggable="true" class="var-block" data-variable="${key}" data-category="${category}" style="${style}"><span style="font-size:${BLOCK_STYLE.iconSize}px;">${icon}</span> ${label}<button type="button" class="var-delete" style="margin-left:1px;width:${BLOCK_STYLE.deleteButtonSize}px;height:${BLOCK_STYLE.deleteButtonSize}px;border-radius:50%;border:none;background:${colors.border};color:#fff;cursor:pointer;font-size:7px;line-height:1;opacity:0.8;">×</button></span>`;
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
      out.push('\n');
      return;
    }

    // ✅ 빈 DIV 또는 <div><br></div> → 개행 추가
    if (el.tagName === 'DIV' || el.tagName === 'P') {
      // 빈 div 또는 br만 있는 div
      if (el.childNodes.length === 0) {
        out.push('\n');
        return;
      }
      if (el.childNodes.length === 1) {
        const only = el.childNodes[0];
        if (only.nodeType === Node.ELEMENT_NODE && (only as HTMLElement).tagName === 'BR') {
          out.push('\n');
          return;
        }
      }
    }

    // 일반 요소: 자식 순회
    el.childNodes.forEach(walk);

    // 블록 요소 끝에서는 개행(중복 방지)
    if (el.tagName === 'DIV' || el.tagName === 'P') pushNL();
  };

  div.childNodes.forEach(walk);

  // 끝 개행 유지 (빈 줄 보존)
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
