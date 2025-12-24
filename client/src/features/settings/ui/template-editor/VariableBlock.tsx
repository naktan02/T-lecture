// client/src/features/settings/ui/template-editor/VariableBlock.tsx
import { ReactElement, DragEvent, MouseEvent } from 'react';
import { VariableDefinition } from './variableConfig';

interface VariableBlockProps {
  variable: VariableDefinition;
  showDeleteButton?: boolean;
  onDelete?: () => void;
  isDragging?: boolean;
  isSelected?: boolean;
}

/**
 * 변수 블록 컴포넌트 - 에디터 내 드래그 가능한 변수 블록
 */
export const VariableBlock = ({
  variable,
  showDeleteButton = true,
  onDelete,
  isDragging = false,
  isSelected = false,
}: VariableBlockProps): ReactElement => {
  const handleDelete = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.();
  };

  const handleDragStart = (e: DragEvent<HTMLSpanElement>) => {
    e.dataTransfer.setData('text/plain', variable.key);
    e.dataTransfer.setData('application/x-variable-move', 'true');
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <span
      contentEditable={false}
      data-variable={variable.key}
      draggable
      onDragStart={handleDragStart}
      className={`variable-block ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
    >
      <span>{variable.icon}</span>
      <span>{variable.label}</span>
      {showDeleteButton && onDelete && (
        <button
          type="button"
          className="delete-btn"
          onClick={handleDelete}
          onMouseDown={(e) => e.preventDefault()}
          title="삭제"
        >
          ×
        </button>
      )}
    </span>
  );
};

/**
 * HTML string 생성용 함수 - contentEditable 내부에서 사용
 */
export const createVariableBlockHTML = (variable: VariableDefinition): string => {
  return `<span contenteditable="false" data-variable="${variable.key}" class="variable-block" draggable="true"><span>${variable.icon}</span> <span>${variable.label}</span><button type="button" class="delete-btn" title="삭제">×</button></span>`;
};
