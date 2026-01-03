// features/settings/ui/template-editor/VariableChip.tsx
// 재사용 가능한 변수 블록 컴포넌트

import { DragEvent } from 'react';
import type { VariableDef } from './types';
import { CATEGORY_COLORS, FORMAT_STYLE } from './styles';

type Props = {
  variable: VariableDef;
  isUsed?: boolean;
  onDragStart?: (e: DragEvent<HTMLButtonElement>, v: VariableDef) => void;
  onClick?: (v: VariableDef) => void;
};

export function VariableChip({ variable, isUsed, onDragStart, onClick }: Props) {
  const category = variable.category || 'default';
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
  const isFormat = !!variable.isFormat;

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => onDragStart?.(e, variable)}
      onClick={() => onClick?.(variable)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        border: `${isFormat ? FORMAT_STYLE.borderWidth : '1px'} ${isFormat ? FORMAT_STYLE.borderStyle : 'solid'} ${colors.border}`,
        borderRadius: 8,
        background: colors.bg,
        color: colors.text,
        cursor: 'grab',
        fontSize: 12,
        fontWeight: 500,
        textAlign: 'left',
        width: '100%',
        transition: 'all 0.15s',
      }}
      title={variable.key}
    >
      <span style={{ fontSize: 13 }}>{variable.icon}</span>
      <span style={{ flex: 1 }}>{variable.label}</span>
      {isFormat && <span style={{ fontSize: 10, opacity: 0.7 }}>(포맷)</span>}
      {isUsed && <span style={{ color: '#10b981', fontSize: 13 }}>✓</span>}
    </button>
  );
}
