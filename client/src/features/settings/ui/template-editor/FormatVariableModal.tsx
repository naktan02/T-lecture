// client/src/features/settings/ui/template-editor/FormatVariableModal.tsx
import { useState, useRef, useEffect, ReactElement, DragEvent } from 'react';
import { VariableDefinition } from './variableConfig';

interface FormatVariableModalProps {
  variable: VariableDefinition;
  initialFormat?: string;
  onConfirm: (format: string) => void;
  onCancel: () => void;
}

// 플레이스홀더 한글 라벨
const PLACEHOLDER_LABELS: Record<string, { label: string; icon: string }> = {
  index: { label: '순번', icon: '🔢' },
  name: { label: '이름', icon: '👤' },
  phone: { label: '전화번호', icon: '📱' },
  category: { label: '분류', icon: '🏷️' },
  virtues: { label: '가능과목', icon: '📚' },
  location: { label: '장소', icon: '📍' },
};

/**
 * 포맷 변수 입력 모달 - 블록 코딩 스타일
 */
export const FormatVariableModal = ({
  variable,
  initialFormat = '',
  onConfirm,
  onCancel,
}: FormatVariableModalProps): ReactElement => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [formatValue, setFormatValue] = useState(
    initialFormat || '{index}. {name}({category}) / {phone} / {virtues}',
  );

  const placeholders = variable.formatPlaceholders || [];

  // 텍스트를 HTML로 변환 (플레이스홀더를 블록으로)
  const textToHtml = (text: string): string => {
    if (!text) return '';
    return text.replace(/\{(\w+)\}/g, (_, key) => {
      const info = PLACEHOLDER_LABELS[key];
      if (info) {
        return `<span contenteditable="false" data-placeholder="${key}" class="format-placeholder-block">${info.icon} ${info.label}<button type="button" class="format-delete-btn">×</button></span>`;
      }
      return `<span contenteditable="false" data-placeholder="${key}" class="format-placeholder-block">🏷️ ${key}<button type="button" class="format-delete-btn">×</button></span>`;
    });
  };

  // HTML을 텍스트로 변환
  const htmlToText = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const blocks = tempDiv.querySelectorAll('[data-placeholder]');
    blocks.forEach((block) => {
      const key = block.getAttribute('data-placeholder');
      if (key) block.replaceWith(`{${key}}`);
    });

    return tempDiv.textContent || '';
  };

  // 에디터 초기화
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      editorRef.current.innerHTML = textToHtml(formatValue);
    }
    isInternalChange.current = false;
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      setFormatValue(htmlToText(editorRef.current.innerHTML));
    }
  };

  // 삭제 버튼 또는 블록 선택 후 Delete
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('format-delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      target.closest('[data-placeholder]')?.remove();
      handleInput();
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
        )?.closest('[data-placeholder]');

        if (parentBlock && editorRef.current?.contains(parentBlock)) {
          e.preventDefault();
          parentBlock.remove();
          handleInput();
        }
      }
    }
  };

  // 드래그 시작
  const handleDragStart = (e: DragEvent<HTMLDivElement>, placeholder: string) => {
    e.dataTransfer.setData('text/plain', placeholder);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // 드롭
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const placeholder = e.dataTransfer.getData('text/plain');
    if (!placeholder || !PLACEHOLDER_LABELS[placeholder]) return;

    const info = PLACEHOLDER_LABELS[placeholder];

    // 드롭 위치 계산
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
      const block = document.createElement('span');
      block.setAttribute('contenteditable', 'false');
      block.setAttribute('data-placeholder', placeholder);
      block.className = 'format-placeholder-block';
      block.innerHTML = `${info.icon} ${info.label}<button type="button" class="format-delete-btn">×</button>`;

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
      insertPlaceholderAtEnd(placeholder);
    }
  };

  // 클릭으로 삽입
  const handlePlaceholderClick = (placeholder: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const info = PLACEHOLDER_LABELS[placeholder];
    if (!info) return;

    const selection = window.getSelection();
    if (selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        const block = document.createElement('span');
        block.setAttribute('contenteditable', 'false');
        block.setAttribute('data-placeholder', placeholder);
        block.className = 'format-placeholder-block';
        block.innerHTML = `${info.icon} ${info.label}<button type="button" class="format-delete-btn">×</button>`;

        range.deleteContents();
        range.insertNode(block);
        range.setStartAfter(block);
        selection.removeAllRanges();
        selection.addRange(range);

        handleInput();
        return;
      }
    }
    insertPlaceholderAtEnd(placeholder);
  };

  const insertPlaceholderAtEnd = (placeholder: string) => {
    const info = PLACEHOLDER_LABELS[placeholder];
    if (!info || !editorRef.current) return;

    const block = document.createElement('span');
    block.setAttribute('contenteditable', 'false');
    block.setAttribute('data-placeholder', placeholder);
    block.className = 'format-placeholder-block';
    block.innerHTML = `${info.icon} ${info.label}<button type="button" class="format-delete-btn">×</button>`;

    editorRef.current.appendChild(block);
    handleInput();
  };

  const handleConfirm = () => {
    if (formatValue.trim()) {
      onConfirm(formatValue.trim());
    }
  };

  // 미리보기
  const renderPreview = (): string => {
    const sampleData = [
      {
        index: '1',
        name: '도혜승',
        phone: '010-6254-1209',
        category: '부강사',
        virtues: '협력, 정의',
        location: '교육관',
      },
      {
        index: '2',
        name: '김철수',
        phone: '010-9876-5432',
        category: '보조강사',
        virtues: '리더십',
        location: '체육관',
      },
    ];

    return sampleData
      .map((data) => {
        let line = formatValue;
        Object.entries(data).forEach(([key, value]) => {
          line = line.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        });
        return line;
      })
      .join('\n');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* 스타일 */}
        <style>{`
          .format-placeholder-block {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            padding: 1px 8px;
            margin: 0 2px;
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            color: #92400e;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            user-select: none;
            cursor: grab;
            border: 1px solid #fbbf24;
            vertical-align: baseline;
          }
          .format-placeholder-block:hover {
            background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
          }
          .format-delete-btn {
            display: none;
            width: 14px;
            height: 14px;
            margin-left: 2px;
            padding: 0;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 10px;
            line-height: 1;
            cursor: pointer;
            align-items: center;
            justify-content: center;
          }
          .format-placeholder-block:hover .format-delete-btn {
            display: inline-flex;
          }
          .format-editor {
            min-height: 60px;
            max-height: 120px;
            overflow-y: auto;
            line-height: 2;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .format-editor:focus {
            outline: none;
          }
          .format-editor:empty::before {
            content: '항목을 조합하여 포맷을 만드세요...';
            color: #9ca3af;
          }
          .placeholder-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            background: #fef3c7;
            color: #92400e;
            border: 1px dashed #fbbf24;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: grab;
            transition: all 0.15s;
          }
          .placeholder-btn:hover {
            background: #fde68a;
            border-style: solid;
            transform: translateY(-1px);
          }
          .placeholder-btn:active {
            cursor: grabbing;
          }
        `}</style>

        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span>{variable.icon}</span>
            <span>{variable.label} 포맷 설정</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            아래 항목들을 조합하여 각 동료의 정보가 어떻게 표시될지 설정하세요
          </p>
        </div>

        {/* 본문 */}
        <div className="px-5 py-4 space-y-4">
          {/* 사용 가능한 항목들 */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              사용 가능한 항목 (드래그 또는 클릭)
            </label>
            <div className="flex flex-wrap gap-2">
              {placeholders.map((ph) => {
                const info = PLACEHOLDER_LABELS[ph];
                if (!info) return null;
                return (
                  <div
                    key={ph}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ph)}
                    onClick={() => handlePlaceholderClick(ph)}
                    className="placeholder-btn"
                  >
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 포맷 편집 영역 */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">포맷 편집</label>
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="format-editor w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm bg-white"
              suppressContentEditableWarning
            />
            <p className="text-xs text-gray-400 mt-1">
              💡 블록 위에서 X 버튼 또는 Delete 키로 삭제
            </p>
          </div>

          {/* 미리보기 */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">미리보기</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap min-h-[50px]">
              {renderPreview() || '(포맷을 만들어주세요)'}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
