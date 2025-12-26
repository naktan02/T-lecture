// client/src/features/settings/ui/template-editor/VariablePanel.tsx
import { useState, ReactElement, DragEvent } from 'react';
import { VARIABLE_CATEGORIES, VariableDefinition } from './variableConfig';

interface VariablePanelProps {
  usedVariables: string[];
  onVariableClick: (variableKey: string) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, variableKey: string) => void;
  onFormatVariableClick?: (variable: VariableDefinition) => void;
}

/**
 * Scratch 스타일 변수 패널
 * - 오른쪽: 카테고리 탭
 * - 왼쪽: 선택된 카테고리의 변수 목록
 */
export const VariablePanel = ({
  usedVariables,
  onVariableClick,
  onDragStart,
  onFormatVariableClick,
}: VariablePanelProps): ReactElement => {
  const [selectedCategoryId, setSelectedCategoryId] = useState(VARIABLE_CATEGORIES[0]?.id || '');

  const selectedCategory = VARIABLE_CATEGORIES.find((c) => c.id === selectedCategoryId);

  const handleVariableAction = (variable: VariableDefinition) => {
    if (variable.isFormatVariable && onFormatVariableClick) {
      onFormatVariableClick(variable);
    } else {
      onVariableClick(variable.key);
    }
  };

  return (
    <div className="scratch-panel">
      {/* 헤더 */}
      <div className="scratch-header">
        <span>📦 변수 블록</span>
        <span className="scratch-count">{usedVariables.length}개 사용중</span>
      </div>

      <div className="scratch-body">
        {/* 왼쪽: 변수 목록 */}
        <div className="scratch-variables">
          {!selectedCategory ? (
            <div className="scratch-empty">카테고리를 선택하세요</div>
          ) : (
            selectedCategory.variables.map((v) => {
              const isUsed = usedVariables.some((used) => used.startsWith(v.key));
              return (
                <div
                  key={v.key}
                  draggable={!v.isFormatVariable}
                  onDragStart={(e) => !v.isFormatVariable && onDragStart(e, v.key)}
                  onClick={() => handleVariableAction(v)}
                  className={`scratch-variable ${isUsed ? 'used' : ''} ${v.isFormatVariable ? 'format-var' : ''}`}
                  style={{
                    backgroundColor: selectedCategory.color + '20',
                    borderColor: selectedCategory.color,
                  }}
                  title={v.description || v.label}
                >
                  <span className="scratch-variable-icon">{v.icon}</span>
                  <span className="scratch-variable-label">{v.label}</span>
                  {v.isFormatVariable && <span className="scratch-variable-badge">포맷</span>}
                  {isUsed && <span className="scratch-variable-check">✓</span>}
                </div>
              );
            })
          )}
        </div>

        {/* 오른쪽: 카테고리 탭 */}
        <div className="scratch-categories">
          {VARIABLE_CATEGORIES.map((cat) => {
            const isSelected = cat.id === selectedCategoryId;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`scratch-category-btn ${isSelected ? 'selected' : ''}`}
                style={{
                  backgroundColor: isSelected ? cat.color : 'transparent',
                  borderColor: cat.color,
                  color: isSelected ? 'white' : cat.color,
                }}
                title={cat.label}
              >
                <span className="scratch-category-icon">{cat.icon}</span>
                <span className="scratch-category-name">{cat.label}</span>
                <span className="scratch-category-count">({cat.variables.length})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 도움말 */}
      <div className="scratch-help">
        💡 <strong>드래그</strong> 또는 <strong>클릭</strong>하여 삽입 · 포맷 변수는 클릭 시 설정
        팝업
      </div>
    </div>
  );
};

/**
 * 모바일용 변수 패널
 */
interface MobileVariablePanelProps extends VariablePanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const MobileVariablePanel = ({
  isOpen,
  onToggle,
  usedVariables,
  onVariableClick,
  onDragStart,
  onFormatVariableClick,
}: MobileVariablePanelProps): ReactElement => {
  return (
    <div className="lg:hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition"
      >
        <span className="flex items-center gap-2">
          📦 변수 블록 {usedVariables.length > 0 && `(${usedVariables.length}개 사용중)`}
        </span>
        <span className={`transform transition ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="mt-2">
          <VariablePanel
            usedVariables={usedVariables}
            onVariableClick={onVariableClick}
            onDragStart={onDragStart}
            onFormatVariableClick={onFormatVariableClick}
          />
        </div>
      )}
    </div>
  );
};
