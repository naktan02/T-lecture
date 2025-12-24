// client/src/features/settings/ui/TemplateBlockEditor.tsx
// Template editor with Scratch-style panel and format variable support

import { useState, useRef, useEffect, ReactElement, DragEvent } from 'react';
import {
  VariablePanel,
  MobileVariablePanel,
  FormatVariableModal,
  findVariableByKey,
  parseFormatVariable,
  renderFormatVariableSample,
  SAMPLE_DATA,
  normalizeKey,
  VariableDefinition,
} from './template-editor';
import './template-editor/editorStyles.css';

interface TemplateBlockEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const TemplateBlockEditor = ({
  value,
  onChange,
}: TemplateBlockEditorProps): ReactElement => {
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [dragOverEditor, setDragOverEditor] = useState(false);
  const [formatModalVar, setFormatModalVar] = useState<VariableDefinition | null>(null);
  const [editingFormatKey, setEditingFormatKey] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // 텍스트를 HTML로 변환
  const textToHtml = (text: string): string => {
    if (!text) return '';

    const lines = text.split('\n');
    return lines
      .map((line) => {
        const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // 변수 패턴: {{key}} 또는 {{key:format=...}}
        return escaped.replace(/\{\{([^}]+)\}\}/g, (_, rawContent) => {
          const { key, format } = parseFormatVariable(rawContent);
          const normalizedKey = normalizeKey(key);
          const varInfo = findVariableByKey(normalizedKey);

          if (varInfo) {
            const displayKey = format ? `${normalizedKey}:format=${format}` : normalizedKey;
            const label = format
              ? `${varInfo.icon} ${varInfo.label} (포맷)`
              : `${varInfo.icon} ${varInfo.label}`;

            return `<span contenteditable="false" data-variable="${displayKey}" class="variable-block ${format ? 'format-block' : ''}" draggable="true"><span>${label}</span><button type="button" class="delete-btn" title="삭제">×</button></span>`;
          }

          return `<span contenteditable="false" data-variable="${rawContent}" class="variable-block" draggable="true"><span>🏷️ ${rawContent}</span><button type="button" class="delete-btn" title="삭제">×</button></span>`;
        });
      })
      .join('<br>');
  };

  // HTML을 텍스트로 변환
  const htmlToText = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const variableBlocks = tempDiv.querySelectorAll('[data-variable]');
    variableBlocks.forEach((block) => {
      const key = block.getAttribute('data-variable');
      if (key) block.replaceWith(`{{${key}}}`);
    });

    let text = tempDiv.innerHTML;
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<div>/gi, '\n');
    text = text.replace(/<\/div>/gi, '');
    text = text.replace(/<p>/gi, '\n');
    text = text.replace(/<\/p>/gi, '');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&amp;/g, '&');

    tempDiv.innerHTML = text;
    return tempDiv.textContent || '';
  };

  // 에디터 초기화
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      editorRef.current.innerHTML = textToHtml(value);
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(htmlToText(editorRef.current.innerHTML));
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // 삭제 버튼
    if (target.classList.contains('delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      target.closest('[data-variable]')?.remove();
      handleInput();
      return;
    }

    // 포맷 블록 더블클릭으로 수정
    const block = target.closest('[data-variable]') as HTMLElement;
    if (block && e.detail === 2) {
      const varKey = block.getAttribute('data-variable') || '';
      const { key } = parseFormatVariable(varKey);
      const varInfo = findVariableByKey(key);

      if (varInfo?.isFormatVariable) {
        setEditingFormatKey(varKey);
        setFormatModalVar({ ...varInfo, key: varKey });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection?.rangeCount) {
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        const parentBlock = (
          node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
        )?.closest('[data-variable]');

        if (parentBlock && editorRef.current?.contains(parentBlock)) {
          e.preventDefault();
          parentBlock.remove();
          handleInput();
        }
      }
    }
  };

  const handlePanelDragStart = (e: DragEvent<HTMLDivElement>, variableKey: string) => {
    e.dataTransfer.setData('text/plain', variableKey);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleEditorDragStart = (e: DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.hasAttribute('data-variable')) {
      target.classList.add('dragging');
      e.dataTransfer.setData('text/plain', target.getAttribute('data-variable') || '');
      e.dataTransfer.setData('application/x-variable-move', 'true');
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleEditorDragEnd = (e: DragEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).classList.remove('dragging');
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/x-variable-move')
      ? 'move'
      : 'copy';
    setDragOverEditor(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!editorRef.current?.contains(e.relatedTarget as Node)) {
      setDragOverEditor(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverEditor(false);

    const variableKey = e.dataTransfer.getData('text/plain');
    const isMove = e.dataTransfer.getData('application/x-variable-move') === 'true';

    if (!variableKey) return;

    const { key } = parseFormatVariable(variableKey);
    const varInfo = findVariableByKey(key);
    if (!varInfo) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = document as any;
    let caretPos: { node: Node; offset: number } | null = null;
    if (doc.caretPositionFromPoint) {
      const pos = doc.caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) caretPos = { node: pos.offsetNode, offset: pos.offset };
    } else if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) caretPos = { node: range.startContainer, offset: range.startOffset };
    }

    if (caretPos && editorRef.current?.contains(caretPos.node)) {
      if (isMove) {
        editorRef.current.querySelector(`[data-variable="${variableKey}"].dragging`)?.remove();
      }

      const label = varInfo.isFormatVariable
        ? `${varInfo.icon} ${varInfo.label} (포맷)`
        : `${varInfo.icon} ${varInfo.label}`;

      const block = document.createElement('span');
      block.setAttribute('contenteditable', 'false');
      block.setAttribute('data-variable', variableKey);
      block.setAttribute('draggable', 'true');
      block.className = `variable-block ${varInfo.isFormatVariable ? 'format-block' : ''}`;
      block.innerHTML = `<span>${label}</span><button type="button" class="delete-btn" title="삭제">×</button>`;

      const range = document.createRange();
      range.setStart(caretPos.node, caretPos.offset);
      range.collapse(true);
      range.insertNode(block);

      const selection = window.getSelection();
      range.setStartAfter(block);
      selection?.removeAllRanges();
      selection?.addRange(range);

      handleInput();
    } else {
      insertVariableAtEnd(variableKey);
    }
  };

  const insertVariableAtEnd = (variableKey: string) => {
    const { key } = parseFormatVariable(variableKey);
    const varInfo = findVariableByKey(key);
    if (!varInfo || !editorRef.current) return;

    const label = varInfo.isFormatVariable
      ? `${varInfo.icon} ${varInfo.label} (포맷)`
      : `${varInfo.icon} ${varInfo.label}`;

    const block = document.createElement('span');
    block.setAttribute('contenteditable', 'false');
    block.setAttribute('data-variable', variableKey);
    block.setAttribute('draggable', 'true');
    block.className = `variable-block ${varInfo.isFormatVariable ? 'format-block' : ''}`;
    block.innerHTML = `<span>${label}</span><button type="button" class="delete-btn" title="삭제">×</button>`;

    editorRef.current.appendChild(block);
    handleInput();

    editorRef.current.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const handleVariableClick = (variableKey: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const varInfo = findVariableByKey(variableKey);
    if (!varInfo) return;

    const label = `${varInfo.icon} ${varInfo.label}`;

    const selection = window.getSelection();
    if (selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        const block = document.createElement('span');
        block.setAttribute('contenteditable', 'false');
        block.setAttribute('data-variable', variableKey);
        block.setAttribute('draggable', 'true');
        block.className = 'variable-block';
        block.innerHTML = `<span>${label}</span><button type="button" class="delete-btn" title="삭제">×</button>`;

        range.deleteContents();
        range.insertNode(block);
        range.setStartAfter(block);
        selection.removeAllRanges();
        selection.addRange(range);

        handleInput();
        return;
      }
    }
    insertVariableAtEnd(variableKey);
  };

  // 포맷 변수 클릭 → 모달 열기
  const handleFormatVariableClick = (variable: VariableDefinition) => {
    setFormatModalVar(variable);
    setEditingFormatKey(null);
  };

  // 포맷 확정
  const handleFormatConfirm = (format: string) => {
    if (!formatModalVar) return;

    const fullKey = `${formatModalVar.key.split(':')[0]}:format=${format}`;

    if (editingFormatKey && editorRef.current) {
      // 기존 블록 수정
      const existingBlock = editorRef.current.querySelector(
        `[data-variable="${editingFormatKey}"]`,
      );
      if (existingBlock) {
        existingBlock.setAttribute('data-variable', fullKey);
      }
      handleInput();
    } else {
      // 새 블록 삽입
      insertVariableAtEnd(fullKey);
    }

    setFormatModalVar(null);
    setEditingFormatKey(null);
  };

  const getUsedVariables = (): string[] => {
    const matches = value.match(/\{\{([^}]+)\}\}/g) || [];
    return [
      ...new Set(
        matches.map((m) => {
          const content = m.replace(/\{\{|\}\}/g, '');
          const { key } = parseFormatVariable(content);
          return normalizeKey(key);
        }),
      ),
    ];
  };

  const generatePreview = (): string => {
    return value.replace(/\{\{([^}]+)\}\}/g, (_, rawContent) => {
      const { key, format } = parseFormatVariable(rawContent);
      const normalizedKey = normalizeKey(key);

      if (format) {
        return renderFormatVariableSample(format);
      }

      return SAMPLE_DATA[normalizedKey] || `[${normalizedKey}]`;
    });
  };

  const usedVariables = getUsedVariables();

  return (
    <div className="space-y-4">
      {/* 포맷 모달 */}
      {formatModalVar && (
        <FormatVariableModal
          variable={formatModalVar}
          initialFormat={editingFormatKey ? parseFormatVariable(editingFormatKey).format || '' : ''}
          onConfirm={handleFormatConfirm}
          onCancel={() => {
            setFormatModalVar(null);
            setEditingFormatKey(null);
          }}
        />
      )}

      {/* 메인 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* 편집 영역 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">메시지 편집</label>
            <span className="text-xs text-gray-400">{value.length}자</span>
          </div>
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragStart={handleEditorDragStart}
            onDragEnd={handleEditorDragEnd}
            className={`editor-area w-full p-4 border-2 rounded-lg text-sm bg-white ${
              dragOverEditor
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
            data-placeholder="메시지를 입력하세요. 오른쪽에서 변수를 선택하여 삽입하세요."
            suppressContentEditableWarning
          />

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg flex items-center gap-2">
            <span className="text-blue-500">💡</span>
            <span>
              블록 <strong>드래그</strong>로 위치 변경 · <strong>더블클릭</strong>으로 포맷 수정 ·{' '}
              <strong>X</strong> 또는 <strong>Delete</strong>로 삭제
            </span>
          </div>
        </div>

        {/* 변수 패널 - 데스크톱 */}
        <div className="hidden lg:block">
          <VariablePanel
            usedVariables={usedVariables}
            onVariableClick={handleVariableClick}
            onDragStart={handlePanelDragStart}
            onFormatVariableClick={handleFormatVariableClick}
          />
        </div>
      </div>

      {/* 변수 패널 - 모바일 */}
      <MobileVariablePanel
        isOpen={showMobilePanel}
        onToggle={() => setShowMobilePanel(!showMobilePanel)}
        usedVariables={usedVariables}
        onVariableClick={handleVariableClick}
        onDragStart={handlePanelDragStart}
        onFormatVariableClick={handleFormatVariableClick}
      />

      {/* 미리보기 */}
      <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
        <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
          <span>📱 미리보기</span>
          <span className="text-gray-400">(샘플 데이터 적용)</span>
        </div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-4 rounded-lg border border-gray-200 shadow-inner min-h-[80px]">
          {generatePreview() || '(내용이 없습니다)'}
        </div>
      </div>
    </div>
  );
};
