// features/settings/ui/template-editor/useTemplateEditor.ts
// 템플릿 에디터 상태 관리 훅

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VariableRegistry, VariableDef, Token } from './types';
import { parseTemplateToTokens } from './parse';
import { templateToHtml, htmlToTemplate, getRangeFromPoint, createVariableHtml } from './utils';

type UseTemplateEditorOptions = {
  value: string;
  onChange: (value: string) => void;
  registry: VariableRegistry;
  onEditFormat?: (index: number, token: Token & { type: 'format' }) => void;
  onInsertFormat?: (varDef: VariableDef, callback: (format: string) => void) => void;
};

export function useTemplateEditor({
  value,
  onChange,
  registry,
  onEditFormat,
  onInsertFormat,
}: UseTemplateEditorOptions) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draggedInternal, setDraggedInternal] = useState<HTMLElement | null>(null);

  const variables = useMemo(() => registry.list(), [registry]);
  const categories = useMemo(() => registry.categories?.() || [], [registry]);

  // 사용 중인 변수 키
  const usedKeys = useMemo(() => {
    const keys = new Set<string>();
    const regex = /\{\{([\s\S]*?)\}\}/g;
    let m;
    while ((m = regex.exec(value)) !== null) {
      const content = m[1];
      const idx = content.indexOf(':format=');
      const key = idx === -1 ? content.trim() : content.slice(0, idx).trim();
      keys.add(registry.normalizeKey(key));
    }
    return keys;
  }, [value, registry]);

  // 첫 카테고리 선택
  useEffect(() => {
    if (categories.length > 0 && !activeTab) {
      setActiveTab(categories[0].id);
    }
  }, [categories, activeTab]);

  // 내부에서 마지막으로 설정한 value 추적 (외부 변경 감지용)
  const lastInternalValue = useRef<string>(value);
  const isInitialized = useRef(false);

  // 에디터 초기화 및 외부 value 변경 시 동기화
  useEffect(() => {
    if (editorRef.current) {
      // 첫 로드 시 또는 외부에서 value가 변경된 경우 HTML 갱신
      if (!isInitialized.current || value !== lastInternalValue.current) {
        editorRef.current.innerHTML = templateToHtml(value, registry);
        lastInternalValue.current = value;
        isInitialized.current = true;
      }
    }
  }, [value, registry]);

  // HTML → 템플릿 동기화
  const syncToTemplate = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const template = htmlToTemplate(html);
      lastInternalValue.current = template; // 내부 변경 추적
      onChange(template);
    }
  }, [onChange]);

  // 커서 위치에 HTML 삽입
  const insertHtmlAtCursor = useCallback(
    (html: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        editor.innerHTML += html;
      } else {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const frag = document.createDocumentFragment();
        while (temp.firstChild) {
          frag.appendChild(temp.firstChild);
        }
        range.insertNode(frag);
        range.collapse(false);
      }
      syncToTemplate();
    },
    [syncToTemplate],
  );

  // 특정 위치에 HTML 삽입
  const insertHtmlAtPoint = useCallback(
    (html: string, x: number, y: number) => {
      const editor = editorRef.current;
      if (!editor) return;

      const range = getRangeFromPoint(x, y);
      if (range && editor.contains(range.startContainer)) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        insertHtmlAtCursor(html);
      } else {
        // fallback: 끝에 추가
        editor.innerHTML += html;
        syncToTemplate();
      }
    },
    [insertHtmlAtCursor, syncToTemplate],
  );

  // 변수 삽입
  const insertVariable = useCallback(
    (v: VariableDef, format?: string) => {
      const info = registry.get(registry.normalizeKey(v.key));
      const html = createVariableHtml(
        v.key,
        info?.label ?? v.key,
        info?.icon ?? '🏷️',
        info?.category || 'default',
        !!v.isFormat,
        format,
      );
      insertHtmlAtCursor(html);
    },
    [registry, insertHtmlAtCursor],
  );

  // 패널에서 클릭
  const handlePanelClick = useCallback(
    (v: VariableDef) => {
      // skipModal이 true면 포맷 변수라도 모달 없이 바로 삽입
      if (v.isFormat && v.skipModal) {
        insertVariable(v, v.defaultFormat);
        return;
      }

      if (v.isFormat && onInsertFormat) {
        onInsertFormat(v, (format) => {
          insertVariable(v, format);
        });
      } else {
        insertVariable(v);
      }
    },
    [onInsertFormat, insertVariable],
  );

  // 패널에서 드래그 시작 (제목 input에서도 받을 수 있도록 text/plain에 key 포함)
  const handlePanelDragStart = useCallback((e: React.DragEvent, v: VariableDef) => {
    e.dataTransfer.setData('application/json', JSON.stringify(v));
    e.dataTransfer.setData('text/plain', v.key); // 제목 input 등 일반 드롭 영역용
    e.dataTransfer.effectAllowed = 'copy';
    setDraggedInternal(null);
  }, []);

  // 에디터 내부 블록 드래그 시작
  const handleInternalDragStart = useCallback((e: React.DragEvent, el: HTMLElement) => {
    e.dataTransfer.setData('text/plain', 'internal');
    e.dataTransfer.effectAllowed = 'move';
    setDraggedInternal(el);
  }, []);
  // 드래그 커서 제거
  const removeDragCaret = useCallback(() => {
    const existing = document.querySelector('.drag-caret');
    if (existing) existing.remove();
  }, []);

  // 드래그 오버 - 드롭 위치에 커서 표시
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = draggedInternal ? 'move' : 'copy';
      setDragOver(true);

      // 드롭 위치에 시각적 커서 표시
      const editor = editorRef.current;
      if (!editor) return;

      removeDragCaret();

      const range = getRangeFromPoint(e.clientX, e.clientY);
      if (range && editor.contains(range.startContainer)) {
        const caret = document.createElement('span');
        caret.className = 'drag-caret';
        caret.style.cssText =
          'width:2px;height:16px;background:#3b82f6;display:inline-block;vertical-align:middle;animation:blink 1s infinite;margin:0 1px;';
        try {
          range.insertNode(caret);
        } catch (e) {
          // ignore
        }
      }
    },
    [draggedInternal, removeDragCaret],
  );

  // 드래그 리브
  const handleDragLeave = useCallback(() => {
    setDragOver(false);
    removeDragCaret();
  }, [removeDragCaret]);

  // 드롭
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      removeDragCaret();

      const editor = editorRef.current;
      if (!editor) return;

      // 내부 블록 이동
      if (draggedInternal) {
        const range = getRangeFromPoint(e.clientX, e.clientY);
        if (range && editor.contains(range.startContainer)) {
          draggedInternal.remove();
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          range.insertNode(draggedInternal);
        }
        setDraggedInternal(null);
        syncToTemplate();
        return;
      }

      // 외부에서 드롭
      try {
        const data = e.dataTransfer.getData('application/json');
        const v: VariableDef = JSON.parse(data);

        // skipModal이 true면 바로 삽입
        if (v.isFormat && v.skipModal) {
          const info = registry.get(registry.normalizeKey(v.key));
          const html = createVariableHtml(
            v.key,
            info?.label ?? v.key,
            info?.icon ?? '🏷️',
            info?.category || 'default',
            true,
            v.defaultFormat,
          );
          insertHtmlAtPoint(html, e.clientX, e.clientY);
          return;
        }

        if (v.isFormat && onInsertFormat) {
          onInsertFormat(v, (format) => {
            const info = registry.get(registry.normalizeKey(v.key));
            const html = createVariableHtml(
              v.key,
              info?.label ?? v.key,
              info?.icon ?? '🏷️',
              info?.category || 'default',
              true,
              format,
            );
            insertHtmlAtPoint(html, e.clientX, e.clientY);
          });
        } else {
          const info = registry.get(registry.normalizeKey(v.key));
          const html = createVariableHtml(
            v.key,
            info?.label ?? v.key,
            info?.icon ?? '🏷️',
            info?.category || 'default',
            !!v.isFormat,
          );
          insertHtmlAtPoint(html, e.clientX, e.clientY);
        }
      } catch {
        // ignore
      }
    },
    [draggedInternal, registry, onInsertFormat, syncToTemplate, insertHtmlAtPoint, removeDragCaret],
  );

  // 에디터 클릭 (삭제, 포맷 편집)
  const handleEditorClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      // 삭제 버튼
      if (target.classList.contains('var-delete')) {
        const block = target.closest('.var-block');
        if (block) {
          block.remove();
          syncToTemplate();
        }
        return;
      }

      // 포맷 블록 클릭
      const block = target.closest('.var-block') as HTMLElement;
      if (block && block.hasAttribute('data-format') && onEditFormat) {
        const key = block.getAttribute('data-variable') || '';
        const fmtAttr = block.getAttribute('data-format') || '';
        const clickedFormat = decodeURIComponent(fmtAttr);

        const tokens = parseTemplateToTokens(value);

        // ✅ 1순위: key + format 둘 다 일치하는 "정확한" 토큰을 찾는다
        let idx = tokens.findIndex(
          (t) => t.type === 'format' && t.key === key && t.format === clickedFormat,
        );

        // ✅ 2순위: 혹시 format이 미세하게 달라졌다면(공백/개행 등) key로 fallback
        if (idx === -1) {
          idx = tokens.findIndex((t) => t.type === 'format' && t.key === key);
        }

        if (idx !== -1) onEditFormat(idx, tokens[idx] as Token & { type: 'format' });
      }
    },
    [syncToTemplate, onEditFormat, value],
  );

  // 내부 블록 드래그 설정
  const handleEditorMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const block = target.closest('.var-block') as HTMLElement;
      if (block && !target.classList.contains('var-delete')) {
        block.setAttribute('draggable', 'true');
        block.ondragstart = (de) => {
          handleInternalDragStart(de as unknown as React.DragEvent, block);
        };
      }
    },
    [handleInternalDragStart],
  );

  return {
    editorRef,
    activeTab,
    setActiveTab,
    dragOver,
    variables,
    categories,
    usedKeys,
    syncToTemplate,
    handlePanelClick,
    handlePanelDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleEditorClick,
    handleEditorMouseDown,
  };
}
