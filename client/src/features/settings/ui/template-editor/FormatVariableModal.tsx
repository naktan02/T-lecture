// client/src/features/settings/ui/template-editor/FormatVariableModal.tsx
import { useState, useRef, useEffect, ReactElement, DragEvent } from 'react';
import { PLACEHOLDER_META } from './registry';

// 변수 정의 인터페이스 (로컬)
interface VariableDefinition {
  key: string;
  label: string;
  icon: string;
  isFormatVariable?: boolean;
  formatPlaceholders?: string[];
}

interface FormatVariableModalProps {
  variable: VariableDefinition;
  initialFormat?: string;
  onConfirm: (format: string) => void;
  onCancel: () => void;
}

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

  // 변수 타입에 따라 기본 포맷 결정
  const getDefaultFormat = (): string => {
    if (variable.key === 'self.schedules') {
      return '- {date} ({dayOfWeek}): {instructors}';
    }
    if (variable.key === 'locations') {
      return '[{placeName}] 인원: {actualCount}명';
    }
    return '{index}. {name}({category}) / {phone} / {virtues}';
  };

  const [formatValue, setFormatValue] = useState(initialFormat || getDefaultFormat());

  const placeholders = variable.formatPlaceholders || [];

  // 텍스트를 HTML로 변환 (플레이스홀더를 블록으로, 줄바꿈을 br로)
  const textToHtml = (text: string): string => {
    if (!text) return '';
    let html = text.replace(/\n/g, '<br>');
    html = html.replace(/\{(\w+)\}/g, (_, key) => {
      const info = PLACEHOLDER_META[key]; // registry에서 참조
      if (info) {
        return `<span contenteditable="false" data-placeholder="${key}" class="format-placeholder-block">${info.icon} ${info.label}<button type="button" class="format-delete-btn">×</button></span>`;
      }
      return `{${key}}`;
    });
    return html;
  };
  
  // DOM을 직접 순회해서 텍스트로 직렬화 (엔터 중복/마지막 깨짐 방지)
  const domToText = (root: HTMLElement): string => {
    const out: string[] = [];

    const pushNewlineOnce = () => {
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

      // placeholder block
      const ph = el.getAttribute('data-placeholder');
      if (ph) {
        out.push(`{${ph}}`);
        return;
      }

      const tag = el.tagName;

      // <br>
      if (tag === 'BR') {
        pushNewlineOnce();
        return;
      }
      // contentEditable Enter가 흔히 만드는 <div><br></div>는 "개행 1번"으로만 처리
      if ((tag === 'DIV' || tag === 'P') && el.childNodes.length === 1) {
        const only = el.childNodes[0] as Node;
        if (only.nodeType === Node.ELEMENT_NODE && (only as HTMLElement).tagName === 'BR') {
          pushNewlineOnce();
          return;
        }
      }

      // 일반 노드 순회
      el.childNodes.forEach(walk);

      // 블록 요소는 끝에서 개행 1번
      if (tag === 'DIV' || tag === 'P') pushNewlineOnce();
    };
    root.childNodes.forEach(walk);

    // 마지막이 개행이면 1개만 제거 (저장 시 "엔터가 하나 더 들어간 것처럼" 보이는 문제 방지)
    if (out[out.length - 1] === '\n') out.pop();

    return out.join('');
  };
  const getCurrentTextFromDom = (): string => {
    if (!editorRef.current) return formatValue;
    return domToText(editorRef.current);
  };
  // 에디터 초기화
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      const initialHtml = textToHtml(formatValue);
      editorRef.current.innerHTML = initialHtml;
    }
    isInternalChange.current = false;
  }, [formatValue]);

  const handleInput = () => {
    if (editorRef.current) {
      // 내부 변경 플래그를 먼저 세우고(경합 방지) DOM에서 텍스트로 직렬화
      isInternalChange.current = true;
      const text = domToText(editorRef.current);
      setFormatValue(text);
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
    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !editorRef.current) return;

      const range = sel.getRangeAt(0);
      // 편집기 밖이면 무시
      if (!editorRef.current.contains(range.commonAncestorContainer)) return;

      // 1) 현재 선택 영역 제거
      range.deleteContents();

      // 2) <br> 삽입
      const br = document.createElement('br');
      range.insertNode(br);

      // 3) 커서를 <br> 뒤로 이동
      range.setStartAfter(br);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);

      // 4) 브라우저가 DOM을 정리한 뒤 직렬화(타이밍 안정화)
      queueMicrotask(() => handleInput());
      return;
    }
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
    if (!placeholder || !PLACEHOLDER_META[placeholder]) return;

    const info = PLACEHOLDER_META[placeholder];

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

    const info = PLACEHOLDER_META[placeholder];
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
    const info = PLACEHOLDER_META[placeholder];
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
    const finalText = getCurrentTextFromDom();
    if (finalText) onConfirm(finalText);
  };

  // 미리보기
  const renderPreview = (): string => {
    // 일정용 샘플 데이터 (self.schedules)
    const hasDatePlaceholder =
      formatValue.includes('{date}') || formatValue.includes('{dayOfWeek}');

    if (hasDatePlaceholder) {
      const scheduleSampleData = [
        {
          name: '유혜경',
          date: '2024-11-17',
          dayOfWeek: '일',
          instructors: '도혜승(주), 유혜경(부), 김철수(보조)',
        },
        {
          name: '유혜경',
          date: '2024-11-18',
          dayOfWeek: '월',
          instructors: '도혜승(주), 유혜경(부), 박영희(실습)',
        },
        {
          name: '유혜경',
          date: '2024-11-19',
          dayOfWeek: '화',
          instructors: '유혜경(부), 김철수(보조)',
        },
      ];
      return scheduleSampleData
        .map((data) => {
          let line = formatValue;
          Object.entries(data).forEach(([key, value]) => {
            line = line.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
          });
          return line;
        })
        .join('\n');
    }

    // 장소 목록용 샘플 데이터
    const hasLocationPlaceholder =
      formatValue.includes('{placeName}') || formatValue.includes('{actualCount}');

    if (hasLocationPlaceholder) {
      const locationSampleData = [
        {
          index: '1',
          placeName: '교육관',
          actualCount: '75',
          hasInstructorLounge: 'O',
          hasWomenRestroom: 'O',
          allowsPhoneBeforeAfter: '가능',
          note: 'TV, 마이크 있음',
        },
        {
          index: '2',
          placeName: '체육관',
          actualCount: '48',
          hasInstructorLounge: 'X',
          hasWomenRestroom: 'O',
          allowsPhoneBeforeAfter: '불가',
          note: '',
        },
      ];
      return locationSampleData
        .map((data) => {
          let line = formatValue;
          Object.entries(data).forEach(([key, value]) => {
            line = line.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
          });
          return line;
        })
        .join('\n');
    }

    // 기본 샘플 데이터
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
                const info = PLACEHOLDER_META[ph];
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
