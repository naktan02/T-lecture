// features/settings/ui/template-editor/VariablePanel.tsx
// 변수 패널 컴포넌트 (카테고리 탭 + 변수 목록)

import { DragEvent, useMemo } from 'react';
import type { VariableDef, VariableCategory } from './types';
import { CATEGORY_COLORS } from './styles';
import { VariableChip } from './VariableChip';

type Props = {
  variables: VariableDef[];
  categories: VariableCategory[];
  activeTab: string | null;
  usedKeys: Set<string>;
  onTabChange: (tabId: string) => void;
  onDragStart: (e: DragEvent<HTMLButtonElement>, v: VariableDef) => void;
  onClick: (v: VariableDef) => void;
  normalizeKey: (key: string) => string;
};

export function VariablePanel({
  variables,
  categories,
  activeTab,
  usedKeys,
  onTabChange,
  onDragStart,
  onClick,
  normalizeKey,
}: Props) {
  // 포맷 변수를 맨 위로
  const filteredVariables = useMemo(() => {
    if (!activeTab) return variables;
    const filtered = variables.filter((v) => v.category === activeTab);
    const formats = filtered.filter((v) => v.isFormat);
    const normals = filtered.filter((v) => !v.isFormat);
    return [...formats, ...normals];
  }, [variables, activeTab]);

  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = {};
    variables.forEach((v) => {
      if (v.category) {
        counts[v.category] = (counts[v.category] || 0) + 1;
      }
    });
    return counts;
  }, [variables]);

  const activeCat = categories.find((c) => c.id === activeTab);

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        background: '#fff',
        display: 'flex',
        overflow: 'hidden',
        height: 'fit-content',
      }}
    >
      {/* 변수 목록 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div
          style={{
            padding: '10px 12px',
            borderBottom: '1px solid #e5e7eb',
            background: activeCat ? `${activeCat.color}10` : '#f9fafb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: activeCat?.color || '#7c3aed',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📦 변수 블록
          </div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{usedKeys.size}개 사용중</div>
        </div>

        {/* 변수 리스트 */}
        <div style={{ padding: 10, overflowY: 'auto', maxHeight: 450, flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {filteredVariables.map((v) => (
              <VariableChip
                key={v.key}
                variable={v}
                isUsed={usedKeys.has(normalizeKey(v.key))}
                onDragStart={onDragStart}
                onClick={onClick}
              />
            ))}

            {filteredVariables.length === 0 && (
              <div style={{ color: '#9ca3af', textAlign: 'center', padding: 16, fontSize: 12 }}>
                이 카테고리에 변수가 없습니다
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 카테고리 세로 탭 - 둥근 박스 스타일 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: 8,
          borderLeft: '1px solid #e5e7eb',
          background: '#fafafa',
        }}
      >
        {categories.map((cat) => {
          const isActive = activeTab === cat.id;
          const colors = CATEGORY_COLORS[cat.id] || CATEGORY_COLORS.default;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onTabChange(cat.id)}
              style={{
                padding: '10px 8px',
                border: isActive ? `2px solid ${cat.color}` : '1px solid #e5e7eb',
                borderRadius: 10,
                background: isActive ? cat.color : '#fff',
                color: isActive ? '#fff' : colors.text,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                minWidth: 60,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 18 }}>{cat.icon}</span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{cat.label}</span>
              <span style={{ fontSize: 9, opacity: 0.8 }}>({categoryCount[cat.id] || 0})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
