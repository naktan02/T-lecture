// client/src/features/settings/ui/TemplatesSection.tsx
import { useState, ReactElement, useCallback } from 'react';
import { useTemplates } from '../model/useSettings';
import { Button } from '../../../shared/ui';
import { MessageTemplate } from '../settingsApi';
import {
  TemplateEditor,
  variableConfig,
  variableCategories,
  formatPlaceholders,
  FormatVariableModal,
} from './template-editor';
import { parseTemplateToTokens, tokensToTemplate } from './template-editor/parse';
import type { VariableRegistry, Token, VariableDef } from './template-editor';

const TEMPLATE_LABELS: Record<string, { name: string; description: string }> = {
  TEMPORARY: {
    name: '임시 배정 메시지',
    description: '강사에게 임시 배정을 알리는 메시지',
  },
  CONFIRMED_LEADER: {
    name: '확정 배정 (팀장용)',
    description: '팀장에게 확정 배정을 알리는 메시지',
  },
  CONFIRMED_MEMBER: {
    name: '확정 배정 (팀원용)',
    description: '팀원에게 확정 배정을 알리는 메시지',
  },
};

function normalizeKey(key: string) {
  return key.trim();
}

// FormatVariableModal 변수 타입
interface LegacyVariableDefinition {
  key: string;
  label: string;
  icon: string;
  isFormatVariable?: boolean;
  formatPlaceholders?: string[];
}

export const TemplatesSection = (): ReactElement => {
  const { templates, isLoading, updateTemplate, isUpdating } = useTemplates();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  // 포맷 편집 모달 상태
  const [formatEditInfo, setFormatEditInfo] = useState<{
    index: number;
    token: Token & { type: 'format' };
    varDef: LegacyVariableDefinition;
  } | null>(null);

  // 포맷 삽입 모달 상태 (패널에서 클릭 시)
  const [formatInsertInfo, setFormatInsertInfo] = useState<{
    varDef: LegacyVariableDefinition;
    callback: (format: string) => void;
  } | null>(null);

  const registry: VariableRegistry = {
    list: () => variableConfig,
    get: (key) => variableConfig.find((v) => normalizeKey(v.key) === key),
    normalizeKey,
    categories: () => variableCategories,
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingKey(template.key);
    setEditTitle(template.title);
    setEditBody(template.body);
  };

  const handleSave = async () => {
    if (!editingKey) return;
    try {
      await updateTemplate({ key: editingKey, title: editTitle, body: editBody });
      setEditingKey(null);
      setEditTitle('');
      setEditBody('');
    } catch (e) {
      console.error('템플릿 저장 실패:', e);
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditTitle('');
    setEditBody('');
  };

  // 포맷 변수 → 레거시 형태 변환 (플레이스홀더 포함)
  const toFormatVar = useCallback((varDef: VariableDef): LegacyVariableDefinition => {
    const placeholders = formatPlaceholders[varDef.key] || [];
    return {
      key: varDef.key,
      label: varDef.label,
      icon: varDef.icon || '🏷️',
      isFormatVariable: varDef.isFormat,
      formatPlaceholders: placeholders.map((p) => p.key),
    };
  }, []);

  // 편집 영역에서 포맷 클릭
  const handleEditFormat = useCallback(
    (index: number, token: Token & { type: 'format' }) => {
      const varDef = registry.get(normalizeKey(token.key));
      if (varDef) {
        setFormatEditInfo({ index, token, varDef: toFormatVar(varDef) });
      }
    },
    [registry, toFormatVar],
  );

  // ✅ 포맷 수정 확정: 문자열 치환 금지 → 토큰 인덱스 기반 업데이트 + 직렬화
  const handleConfirmFormat = (newFormat: string) => {
    if (!formatEditInfo) return;

    const tokens = parseTemplateToTokens(editBody);
    const idx = formatEditInfo.index;

    // 1) index가 유효하면 그 자리만 수정
    if (idx >= 0 && idx < tokens.length && tokens[idx].type === 'format') {
      (tokens[idx] as Token & { type: 'format' }).format = newFormat;
      setEditBody(tokensToTemplate(tokens));
      setFormatEditInfo(null);
      return;
    }

    // 2) 방어: index가 -1 등으로 들어오면 (key+format)으로 정확히 찾아 수정
    const fallbackIdx = tokens.findIndex(
      (t) =>
        t.type === 'format' &&
        t.key === formatEditInfo.token.key &&
        t.format === formatEditInfo.token.format,
    );

    if (fallbackIdx !== -1) {
      (tokens[fallbackIdx] as Token & { type: 'format' }).format = newFormat;
      setEditBody(tokensToTemplate(tokens));
    }
    setFormatEditInfo(null);
  };

  // 패널에서 포맷 클릭 요청 (기존 있으면 수정, 없으면 삽입)
  const handleInsertFormat = useCallback(
    (varDef: VariableDef, callback: (format: string) => void) => {
      const tokens = parseTemplateToTokens(editBody);
      const existingToken = tokens.find((t) => t.type === 'format' && t.key === varDef.key) as
        | (Token & { type: 'format' })
        | undefined;

      if (existingToken) {
        // 이미 본문에 해당 포맷이 있다면 해당 토큰 정보로 수정 모달 열기
        setFormatEditInfo({
          index: -1,
          token: existingToken,
          varDef: toFormatVar(varDef),
        });
      } else {
        // 새 포맷 삽입 모드
        setFormatInsertInfo({ varDef: toFormatVar(varDef), callback });
      }
    },
    [toFormatVar, editBody],
  );

  // 포맷 삽입 확정
  const handleConfirmInsert = (format: string) => {
    if (formatInsertInfo?.callback) {
      formatInsertInfo.callback(format);
    }
    setFormatInsertInfo(null);
  };

  const getTemplateInfo = (key: string) => {
    return TEMPLATE_LABELS[key] || { name: key, description: '' };
  };

  if (isLoading) {
    return <div className="text-center text-gray-500 py-8">로딩 중...</div>;
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">메시지 템플릿</h2>
        <p className="text-sm text-gray-500 mt-1">강사에게 발송되는 메시지 템플릿을 관리합니다.</p>
      </div>

      <div className="space-y-6">
        {templates.map((template) => {
          const info = getTemplateInfo(template.key);
          const isEditing = editingKey === template.key;

          return (
            <div key={template.key} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{info.name}</h3>
                  <p className="text-sm text-gray-500">{info.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    키: {template.key} · 마지막 수정:{' '}
                    {new Date(template.updatedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={handleCancel}
                        disabled={isUpdating}
                      >
                        취소
                      </Button>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleSave}
                        disabled={isUpdating}
                      >
                        {isUpdating ? '저장 중...' : '저장'}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="small" onClick={() => handleEdit(template)}>
                      수정
                    </Button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">본문</label>
                    <TemplateEditor
                      value={editBody}
                      onChange={setEditBody}
                      registry={registry}
                      onEditFormat={handleEditFormat}
                      onInsertFormat={handleInsertFormat}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">제목</div>
                    <div className="text-sm text-gray-800">{template.title}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">본문</div>
                    <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                      {template.body}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {templates.length === 0 && (
          <div className="text-center text-gray-500 py-8">등록된 템플릿이 없습니다.</div>
        )}
      </div>

      {/* 포맷 편집 모달 (편집 영역 클릭) */}
      {formatEditInfo && (
        <FormatVariableModal
          key={`edit-${formatEditInfo.varDef.key}`}
          variable={formatEditInfo.varDef}
          initialFormat={formatEditInfo.token.format}
          onConfirm={handleConfirmFormat}
          onCancel={() => setFormatEditInfo(null)}
        />
      )}

      {/* 포맷 삽입 모달 (패널 클릭) */}
      {formatInsertInfo && (
        <FormatVariableModal
          key={`insert-${formatInsertInfo.varDef.key}`}
          variable={formatInsertInfo.varDef}
          initialFormat=""
          onConfirm={handleConfirmInsert}
          onCancel={() => setFormatInsertInfo(null)}
        />
      )}
    </div>
  );
};
