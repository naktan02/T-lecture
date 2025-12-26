// client/src/features/settings/ui/template-editor/EditorArea.tsx
import { useRef, useEffect, ReactElement, DragEvent, KeyboardEvent, MouseEvent } from 'react';
import { findVariableByKey, VariableDefinition } from './variableConfig';

interface EditorAreaProps {
  value: string;
  onChange: (value: string) => void;
  onInput: () => void;
  isInternalChange: React.MutableRefObject<boolean>;
}

/**
 * contentEditable 기반 편집 영역
 * - 변수 블록 드래그하여 위치 변경
 * - Delete/Backspace 키로 블록 삭제
 * - 드롭 위치에 정확히 삽입
 */
export const EditorArea = ({
  value,
  onChange,
  onInput,
  isInternalChange,
}: EditorAreaProps): ReactElement => {
  const editorRef = useRef<HTMLDivElement>(null);
  const dragOverRef = useRef(false);

  // 텍스트를 HTML로 변환 (변수를 블록으로 표시)
  const textToHtml = (text: string): string => {
    const lines = text.split('\n');
    return lines
      .map((line) => {
        return line.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
          const varInfo = findVariableByKey(key);
          if (varInfo) {
            return createBlockHtml(varInfo);
          }
          // 알 수 없는 변수
          return `<span contenteditable="false" data-variable="${key}" class="variable-block" draggable="true"><span>🏷️</span> <span>${key}</span><button type="button" class="delete-btn" title="삭제">×</button></span>`;
        });
      })
      .join('<br>');
  };

  // 블록 HTML 생성
  const createBlockHtml = (variable: VariableDefinition): string => {
    return `<span contenteditable="false" data-variable="${variable.key}" class="variable-block" draggable="true"><span>${variable.icon}</span> <span>${variable.label}</span><button type="button" class="delete-btn" title="삭제">×</button></span>`;
  };

  // HTML을 텍스트로 변환 (블록을 {{변수}}로)
  const htmlToText = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 변수 블록을 {{변수}}로 변환
    const variableBlocks = tempDiv.querySelectorAll('[data-variable]');
    variableBlocks.forEach((block) => {
      const key = block.getAttribute('data-variable');
      if (key) {
        block.replaceWith(`{{${key}}}`);
      }
    });

    // <br>을 줄바꿈으로 변환
    let text = tempDiv.innerHTML;
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<div>/gi, '\n');
    text = text.replace(/<\/div>/gi, '');
    text = text.replace(/<p>/gi, '\n');
    text = text.replace(/<\/p>/gi, '');

    // 나머지 HTML 태그 제거하고 텍스트만 추출
    tempDiv.innerHTML = text;
    return tempDiv.textContent || '';
  };

  // 초기값 설정
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      editorRef.current.innerHTML = textToHtml(value);
    }
    isInternalChange.current = false;
  }, [value]);

  // 에디터 내용 변경 처리
  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      const text = htmlToText(editorRef.current.innerHTML);
      onChange(text);
      onInput();
    }
  };

  // 삭제 버튼 클릭 처리
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const block = target.closest('[data-variable]');
      if (block) {
        block.remove();
        handleInput();
      }
    }
  };

  // 키보드 이벤트 처리 (Delete/Backspace로 블록 삭제)
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // 선택된 노드가 변수 블록인지 확인
        const node = range.startContainer;
        const parentBlock = (
          node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
        )?.closest('[data-variable]');

        if (parentBlock && editorRef.current?.contains(parentBlock)) {
          e.preventDefault();
          parentBlock.remove();
          handleInput();
          return;
        }

        // 커서 바로 앞/뒤의 블록 확인
        if (range.collapsed) {
          const container = range.startContainer;
          const offset = range.startOffset;

          if (e.key === 'Backspace' && offset === 0) {
            // 커서 앞의 이전 형제 확인
            const prevSibling =
              container.previousSibling || (container.parentNode as HTMLElement)?.previousSibling;
            if (prevSibling && (prevSibling as HTMLElement).hasAttribute?.('data-variable')) {
              e.preventDefault();
              prevSibling.remove();
              handleInput();
              return;
            }
          }
        }
      }
    }
  };

  // 드래그 오버
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.getData('application/x-variable-move')
      ? 'move'
      : 'copy';
    if (!dragOverRef.current) {
      dragOverRef.current = true;
      editorRef.current?.classList.add('drag-over');
    }
  };

  // 드래그 떠남
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // 자식 요소로 이동하는 경우 제외
    if (!editorRef.current?.contains(e.relatedTarget as Node)) {
      dragOverRef.current = false;
      editorRef.current?.classList.remove('drag-over');
    }
  };

  // 드롭 처리
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragOverRef.current = false;
    editorRef.current?.classList.remove('drag-over');

    const variableKey = e.dataTransfer.getData('text/plain');
    const isMove = e.dataTransfer.getData('application/x-variable-move') === 'true';

    if (!variableKey) return;

    const varInfo = findVariableByKey(variableKey);
    if (!varInfo) return;

    // 드롭 위치에 커서 이동
    const caretPosition = getCaretPositionFromPoint(e.clientX, e.clientY);

    if (caretPosition && editorRef.current?.contains(caretPosition.node)) {
      // 이동 시 원본 블록 삭제
      if (isMove) {
        const draggedBlock = editorRef.current.querySelector(
          `[data-variable="${variableKey}"].dragging`,
        );
        draggedBlock?.remove();
      }

      // 새 블록 생성
      const block = document.createElement('span');
      block.setAttribute('contenteditable', 'false');
      block.setAttribute('data-variable', varInfo.key);
      block.setAttribute('draggable', 'true');
      block.className = 'variable-block';
      block.innerHTML = `<span>${varInfo.icon}</span> <span>${varInfo.label}</span><button type="button" class="delete-btn" title="삭제">×</button>`;

      // Range를 사용하여 드롭 위치에 삽입
      const range = document.createRange();
      range.setStart(caretPosition.node, caretPosition.offset);
      range.collapse(true);
      range.insertNode(block);

      // 커서를 블록 뒤로 이동
      range.setStartAfter(block);
      range.setEndAfter(block);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      handleInput();
    } else {
      // 에디터 끝에 삽입
      insertVariableAtEnd(varInfo);
    }
  };

  // 좌표에서 캐럿 위치 계산
  const getCaretPositionFromPoint = (
    x: number,
    y: number,
  ): { node: Node; offset: number } | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = document as any;
    if (doc.caretPositionFromPoint) {
      const pos = doc.caretPositionFromPoint(x, y);
      if (pos) {
        return { node: pos.offsetNode, offset: pos.offset };
      }
    } else if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(x, y);
      if (range) {
        return { node: range.startContainer, offset: range.startOffset };
      }
    }
    return null;
  };

  // 끝에 변수 삽입
  const insertVariableAtEnd = (variable: VariableDefinition) => {
    if (!editorRef.current) return;

    const block = document.createElement('span');
    block.setAttribute('contenteditable', 'false');
    block.setAttribute('data-variable', variable.key);
    block.setAttribute('draggable', 'true');
    block.className = 'variable-block';
    block.innerHTML = `<span>${variable.icon}</span> <span>${variable.label}</span><button type="button" class="delete-btn" title="삭제">×</button>`;

    editorRef.current.appendChild(block);
    handleInput();

    // 포커스 이동
    editorRef.current.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  // 블록 드래그 시작 (에디터 내 이동용)
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.hasAttribute('data-variable')) {
      target.classList.add('dragging');
      e.dataTransfer.setData('text/plain', target.getAttribute('data-variable') || '');
      e.dataTransfer.setData('application/x-variable-move', 'true');
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
  };

  return (
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
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="editor-area w-full p-4 border-2 rounded-lg text-sm font-sans border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
        data-placeholder="메시지를 입력하세요. 오른쪽의 변수 블록을 드래그하여 원하는 위치에 놓으세요."
      />

      {/* 도움말 */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg flex items-center gap-2">
        <span className="text-blue-500">💡</span>
        <span>
          <strong>팁:</strong> 블록을 <strong>드래그</strong>하여 위치 변경, 블록 위{' '}
          <strong>X 버튼</strong> 또는 <strong>Delete 키</strong>로 삭제
        </span>
      </div>
    </div>
  );
};

/**
 * 외부에서 변수 클릭 시 커서 위치에 삽입하는 헬퍼
 */
export const insertVariableAtCursor = (
  editorRef: React.RefObject<HTMLDivElement>,
  variable: VariableDefinition,
  onInput: () => void,
): void => {
  if (!editorRef.current) return;

  editorRef.current.focus();

  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      const block = document.createElement('span');
      block.setAttribute('contenteditable', 'false');
      block.setAttribute('data-variable', variable.key);
      block.setAttribute('draggable', 'true');
      block.className = 'variable-block';
      block.innerHTML = `<span>${variable.icon}</span> <span>${variable.label}</span><button type="button" class="delete-btn" title="삭제">×</button>`;

      range.deleteContents();
      range.insertNode(block);
      range.setStartAfter(block);
      range.setEndAfter(block);
      selection.removeAllRanges();
      selection.addRange(range);

      onInput();
      return;
    }
  }

  // 선택 위치가 없으면 끝에 추가
  const block = document.createElement('span');
  block.setAttribute('contenteditable', 'false');
  block.setAttribute('data-variable', variable.key);
  block.setAttribute('draggable', 'true');
  block.className = 'variable-block';
  block.innerHTML = `<span>${variable.icon}</span> <span>${variable.label}</span><button type="button" class="delete-btn" title="삭제">×</button>`;

  editorRef.current.appendChild(block);
  onInput();

  editorRef.current.focus();
  const newSelection = window.getSelection();
  const newRange = document.createRange();
  newRange.selectNodeContents(editorRef.current);
  newRange.collapse(false);
  newSelection?.removeAllRanges();
  newSelection?.addRange(newRange);
};
