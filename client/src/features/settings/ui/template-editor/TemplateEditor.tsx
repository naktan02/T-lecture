// features/settings/ui/template-editor/TemplateEditor.tsx
// 하이브리드 템플릿 에디터 - contentEditable + Token 데이터

import type { VariableRegistry, Token, VariableDef } from './types';
import { parseTemplateToTokens } from './parse';
import { renderPreview } from './sample';
import { useTemplateEditor } from './useTemplateEditor';
import { VariablePanel } from './VariablePanel';
import { EDITOR_STYLE, PANEL_STYLE } from './styles';

type Props = {
  value: string;
  onChange: (next: string) => void;
  registry: VariableRegistry;
  className?: string;
  onEditFormat?: (index: number, token: Token & { type: 'format' }) => void;
  onInsertFormat?: (varDef: VariableDef, callback: (format: string) => void) => void;
};

export function TemplateEditor({
  value,
  onChange,
  registry,
  className,
  onEditFormat,
  onInsertFormat,
}: Props) {
  const {
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
  } = useTemplateEditor({
    value,
    onChange,
    registry,
    onEditFormat,
    onInsertFormat,
  });

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 상단: 에디터 + 패널 */}
      <div style={{ display: 'grid', gridTemplateColumns: `1fr ${PANEL_STYLE.width}px`, gap: 12 }}>
        {/* 편집 영역 */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncToTemplate}
          onClick={handleEditorClick}
          onMouseDown={handleEditorMouseDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            minHeight: EDITOR_STYLE.minHeight,
            padding: EDITOR_STYLE.padding,
            border: dragOver ? '2px dashed #3b82f6' : '1px solid #e5e7eb',
            borderRadius: EDITOR_STYLE.borderRadius,
            background: '#fff',
            outline: 'none',
            lineHeight: EDITOR_STYLE.lineHeight,
            fontSize: EDITOR_STYLE.fontSize,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            transition: 'border 0.2s',
          }}
        />

        {/* 변수 패널 */}
        <VariablePanel
          variables={variables}
          categories={categories}
          activeTab={activeTab}
          usedKeys={usedKeys}
          onTabChange={setActiveTab}
          onDragStart={handlePanelDragStart}
          onClick={handlePanelClick}
          normalizeKey={registry.normalizeKey}
        />
      </div>

      {/* 팁 */}
      <div style={{ fontSize: 11, color: '#9ca3af' }}>
        💡 드래그 또는 클릭하여 삽입 · 포맷 변수는 클릭 시 설정 팝업
      </div>

      {/* 미리보기 */}
      <div
        style={{
          padding: 12,
          borderRadius: 10,
          background: '#f0f9ff',
          border: '1px solid #0ea5e9',
        }}
      >
        <div style={{ fontSize: 12, color: '#0369a1', marginBottom: 8, fontWeight: 600 }}>
          📋 미리보기 (샘플 데이터 적용)
        </div>
        <div style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.6, fontSize: 13 }}>
          {renderPreview(parseTemplateToTokens(value))}
        </div>
      </div>
    </div>
  );
}
